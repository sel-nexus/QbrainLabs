"""
Data Source Connector API
Handles CRUD, test-connection, and sync for all 6 connector types:
  web_crawler | github | sharepoint | confluence | rest_api | ontology
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
import uuid
import asyncio

from app.core.database import get_db
from app.middleware.admin_auth import require_admin
from app.models.models import User
from app.models.data_source import DataSourceConnector

router = APIRouter(prefix="/api/admin/data-sources", tags=["data-sources"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ConnectorCreate(BaseModel):
    name: str
    connector_type: str
    description: Optional[str] = None
    config: Dict[str, Any] = {}

class ConnectorUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


# ── HTML text extractor (no extra deps) ──────────────────────────────────────

def _extract_html_text(html: str) -> str:
    """Minimal HTML → plain text without external deps."""
    from html.parser import HTMLParser

    class _Extractor(HTMLParser):
        def __init__(self):
            super().__init__()
            self.parts: list[str] = []
            self._skip = False
            self._skip_tags = {"script", "style", "head", "noscript", "nav", "footer"}

        def handle_starttag(self, tag, attrs):
            if tag in self._skip_tags:
                self._skip = True

        def handle_endtag(self, tag):
            if tag in self._skip_tags:
                self._skip = False

        def handle_data(self, data):
            if not self._skip:
                s = data.strip()
                if s:
                    self.parts.append(s)

    p = _Extractor()
    p.feed(html)
    return "\n".join(p.parts)


# ── Sync implementations ──────────────────────────────────────────────────────

async def _sync_web_crawler(connector: DataSourceConnector, db: AsyncSession, admin_id: str) -> int:
    import httpx
    from app.services.rag_service import rag_service
    from app.services.knowledge_base_manager import KnowledgeBaseManager
    kb = KnowledgeBaseManager(rag_service)

    cfg = connector.config or {}
    url = cfg.get("url", "").strip()
    depth = min(int(cfg.get("depth", 1)), 3)
    if not url:
        raise ValueError("Web Crawler requires a URL")

    visited: set[str] = set()
    queue = [(url, 0)]
    ingested = 0

    async with httpx.AsyncClient(timeout=20, follow_redirects=True,
                                  headers={"User-Agent": "QbrainLabs-Crawler/1.0"}) as client:
        while queue and len(visited) < 50:
            current_url, current_depth = queue.pop(0)
            if current_url in visited:
                continue
            visited.add(current_url)

            try:
                resp = await client.get(current_url)
                resp.raise_for_status()
            except Exception:
                continue

            content_type = resp.headers.get("content-type", "")
            if "html" in content_type:
                text = _extract_html_text(resp.text)
            elif "text" in content_type:
                text = resp.text
            else:
                continue

            if len(text.strip()) < 100:
                continue

            title = current_url.split("/")[-1] or current_url
            await kb.ingest_document(
                db=db,
                title=f"[{connector.name}] {title}",
                content=text[:8000],
                category="web_crawler",
                source=current_url,
                metadata={"connector_id": str(connector.id), "source_url": current_url},
                user_id=admin_id,
            )
            ingested += 1

            # Discover links one level deeper
            if current_depth < depth:
                import re
                from urllib.parse import urljoin, urlparse
                base = "{uri.scheme}://{uri.netloc}".format(uri=urlparse(current_url))
                for href in re.findall(r'href=["\']([^"\']+)["\']', resp.text):
                    full = urljoin(base, href)
                    if urlparse(full).netloc == urlparse(url).netloc and full not in visited:
                        queue.append((full, current_depth + 1))

    await db.commit()
    return ingested


async def _sync_github(connector: DataSourceConnector, db: AsyncSession, admin_id: str) -> int:
    import httpx
    from app.services.rag_service import rag_service
    from app.services.knowledge_base_manager import KnowledgeBaseManager
    kb = KnowledgeBaseManager(rag_service)

    cfg = connector.config or {}
    repo = cfg.get("repo", "").strip()
    token = cfg.get("token", "").strip()
    branch = cfg.get("branch", "main").strip() or "main"
    path_filter = cfg.get("path_filter", "").strip()

    if not repo:
        raise ValueError("GitHub connector requires owner/repo")

    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"token {token}"

    ingested = 0
    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        # Get file tree
        tree_url = f"https://api.github.com/repos/{repo}/git/trees/{branch}?recursive=1"
        tree_resp = await client.get(tree_url)
        if tree_resp.status_code == 404:
            raise ValueError(f"Repository '{repo}' not found or branch '{branch}' does not exist")
        tree_resp.raise_for_status()
        tree = tree_resp.json().get("tree", [])

        text_exts = {".md", ".txt", ".rst", ".adoc", ".mdx"}
        files = [
            f for f in tree
            if f.get("type") == "blob"
            and any(f["path"].endswith(ext) for ext in text_exts)
            and (not path_filter or f["path"].startswith(path_filter))
        ][:60]  # cap at 60 files per sync

        for file_info in files:
            try:
                content_resp = await client.get(
                    f"https://api.github.com/repos/{repo}/contents/{file_info['path']}",
                    params={"ref": branch}
                )
                content_resp.raise_for_status()
                import base64
                raw = base64.b64decode(content_resp.json().get("content", "")).decode("utf-8", errors="replace")
            except Exception:
                continue

            if len(raw.strip()) < 50:
                continue

            await kb.ingest_document(
                db=db,
                title=f"[{connector.name}] {file_info['path']}",
                content=raw[:8000],
                category="github",
                source=f"https://github.com/{repo}/blob/{branch}/{file_info['path']}",
                metadata={"connector_id": str(connector.id), "repo": repo, "path": file_info["path"]},
                user_id=admin_id,
            )
            ingested += 1

    await db.commit()
    return ingested


async def _sync_confluence(connector: DataSourceConnector, db: AsyncSession, admin_id: str) -> int:
    import httpx
    import base64
    from app.services.rag_service import rag_service
    from app.services.knowledge_base_manager import KnowledgeBaseManager
    kb = KnowledgeBaseManager(rag_service)

    cfg = connector.config or {}
    site_url = cfg.get("site_url", "").rstrip("/")
    email = cfg.get("email", "")
    api_token = cfg.get("api_token", "")
    space_key = cfg.get("space_key", "")

    if not all([site_url, email, api_token]):
        raise ValueError("Confluence requires site_url, email, and api_token")

    creds = base64.b64encode(f"{email}:{api_token}".encode()).decode()
    headers = {"Authorization": f"Basic {creds}", "Accept": "application/json"}

    ingested = 0
    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        params: dict = {"limit": 50, "expand": "body.storage"}
        if space_key:
            params["spaceKey"] = space_key

        url = f"{site_url}/wiki/rest/api/content"
        while url and ingested < 100:
            resp = await client.get(url, params=params)
            if resp.status_code == 401:
                raise ValueError("Confluence authentication failed — check email and API token")
            resp.raise_for_status()
            data = resp.json()

            for page in data.get("results", []):
                body_html = page.get("body", {}).get("storage", {}).get("value", "")
                text = _extract_html_text(body_html) if body_html else ""
                if len(text.strip()) < 50:
                    continue
                page_url = f"{site_url}/wiki{page.get('_links', {}).get('webui', '')}"
                await kb.ingest_document(
                    db=db,
                    title=f"[{connector.name}] {page.get('title', 'Untitled')}",
                    content=text[:8000],
                    category="confluence",
                    source=page_url,
                    metadata={"connector_id": str(connector.id), "page_id": page.get("id")},
                    user_id=admin_id,
                )
                ingested += 1

            next_link = data.get("_links", {}).get("next")
            url = f"{site_url}/wiki{next_link}" if next_link else None
            params = {}  # next link already includes params

    await db.commit()
    return ingested


async def _sync_sharepoint(connector: DataSourceConnector, db: AsyncSession, admin_id: str) -> int:
    import httpx
    from app.services.rag_service import rag_service
    from app.services.knowledge_base_manager import KnowledgeBaseManager
    kb = KnowledgeBaseManager(rag_service)

    cfg = connector.config or {}
    tenant_id = cfg.get("tenant_id", "")
    client_id = cfg.get("client_id", "")
    client_secret = cfg.get("client_secret", "")
    site_url = cfg.get("site_url", "").rstrip("/")
    folder_path = cfg.get("folder_path", "")

    if not all([tenant_id, client_id, client_secret, site_url]):
        raise ValueError("SharePoint requires tenant_id, client_id, client_secret, and site_url")

    async with httpx.AsyncClient(timeout=30) as client:
        # Get access token via client credentials
        token_resp = await client.post(
            f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token",
            data={
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret,
                "scope": "https://graph.microsoft.com/.default",
            }
        )
        if token_resp.status_code != 200:
            raise ValueError("SharePoint authentication failed — check tenant_id, client_id, and client_secret")
        access_token = token_resp.json().get("access_token")

        headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}

        # Get site ID
        from urllib.parse import urlparse
        parsed = urlparse(site_url)
        hostname = parsed.netloc
        site_path = parsed.path.lstrip("/")
        site_resp = await client.get(
            f"https://graph.microsoft.com/v1.0/sites/{hostname}:/{site_path}",
            headers=headers
        )
        site_resp.raise_for_status()
        site_id = site_resp.json().get("id")

        # List drive items
        drive_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive/root"
        if folder_path:
            drive_url += f":/{folder_path}:/children"
        else:
            drive_url += "/children"

        ingested = 0
        items_resp = await client.get(drive_url, headers=headers)
        items_resp.raise_for_status()

        text_types = {"text/plain", "text/markdown"}
        for item in items_resp.json().get("value", [])[:50]:
            mime = item.get("file", {}).get("mimeType", "")
            if not any(t in mime for t in ["text", "word", "pdf"]):
                continue
            download_url = item.get("@microsoft.graph.downloadUrl")
            if not download_url:
                continue
            try:
                dl = await client.get(download_url)
                content = dl.text if "text" in mime else dl.text
                if len(content.strip()) < 50:
                    continue
                await kb.ingest_document(
                    db=db,
                    title=f"[{connector.name}] {item.get('name', 'Untitled')}",
                    content=content[:8000],
                    category="sharepoint",
                    source=item.get("webUrl", site_url),
                    metadata={"connector_id": str(connector.id), "item_id": item.get("id")},
                    user_id=admin_id,
                )
                ingested += 1
            except Exception:
                continue

    await db.commit()
    return ingested


async def _sync_rest_api(connector: DataSourceConnector, db: AsyncSession, admin_id: str) -> int:
    import httpx
    from app.services.rag_service import rag_service
    from app.services.knowledge_base_manager import KnowledgeBaseManager
    kb = KnowledgeBaseManager(rag_service)

    cfg = connector.config or {}
    url = cfg.get("url", "").strip()
    method = cfg.get("method", "GET").upper()
    headers = cfg.get("headers", {}) or {}
    params = cfg.get("params", {}) or {}
    body = cfg.get("body") or None
    response_path = cfg.get("response_path", "")     # e.g. "data.items"
    title_field = cfg.get("title_field", "title")
    content_field = cfg.get("content_field", "content")

    if not url:
        raise ValueError("REST API connector requires a URL")

    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        if method == "POST":
            resp = await client.post(url, params=params, json=body)
        else:
            resp = await client.get(url, params=params)
        resp.raise_for_status()

        data = resp.json()

        # Navigate to the response path
        if response_path:
            for key in response_path.split("."):
                if isinstance(data, dict):
                    data = data.get(key, [])
                elif isinstance(data, list):
                    break

        if isinstance(data, dict):
            data = [data]
        if not isinstance(data, list):
            data = [{"title": "API Response", "content": str(data)}]

        ingested = 0
        for item in data[:100]:
            title = str(item.get(title_field, item.get("name", item.get("id", f"Item {ingested+1}"))))
            content = str(item.get(content_field, item.get("body", item.get("description", str(item)))))
            if len(content.strip()) < 20:
                continue
            await kb.ingest_document(
                db=db,
                title=f"[{connector.name}] {title}",
                content=content[:8000],
                category="rest_api",
                source=url,
                metadata={"connector_id": str(connector.id)},
                user_id=admin_id,
            )
            ingested += 1

    await db.commit()
    return ingested


async def _run_sync(connector_id: str, admin_id: str):
    """Background task: run sync and update status in a new DB session."""
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(DataSourceConnector).where(DataSourceConnector.id == connector_id)
        )
        connector = result.scalars().first()
        if not connector:
            return

        connector.status = "syncing"
        await db.commit()

        try:
            sync_fn = {
                "web_crawler": _sync_web_crawler,
                "github":      _sync_github,
                "confluence":  _sync_confluence,
                "sharepoint":  _sync_sharepoint,
                "rest_api":    _sync_rest_api,
            }.get(connector.connector_type)

            if not sync_fn:
                connector.status = "error"
                connector.last_error = f"Sync not supported for type '{connector.connector_type}'"
            else:
                count = await sync_fn(connector, db, admin_id)
                connector.status = "active"
                connector.last_synced = datetime.utcnow()
                connector.docs_synced = (connector.docs_synced or 0) + count
                connector.last_error = None

        except Exception as exc:
            connector.status = "error"
            connector.last_error = str(exc)

        await db.commit()


# ── CRUD Endpoints ────────────────────────────────────────────────────────────

@router.get("")
async def list_connectors(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DataSourceConnector)
        .where(DataSourceConnector.is_active == True)
        .order_by(DataSourceConnector.created_at)
    )
    return [c.to_dict() for c in result.scalars().all()]


@router.post("")
async def create_connector(
    body: ConnectorCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    valid_types = {"web_crawler", "github", "sharepoint", "confluence", "rest_api", "ontology"}
    if body.connector_type not in valid_types:
        raise HTTPException(400, f"connector_type must be one of: {', '.join(sorted(valid_types))}")

    connector = DataSourceConnector(
        id=uuid.uuid4(),
        name=body.name,
        connector_type=body.connector_type,
        description=body.description,
        config=body.config,
        created_by=admin.id,
    )
    db.add(connector)
    await db.commit()
    await db.refresh(connector)
    return connector.to_dict()


@router.put("/{connector_id}")
async def update_connector(
    connector_id: str,
    body: ConnectorUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DataSourceConnector).where(DataSourceConnector.id == connector_id)
    )
    connector = result.scalars().first()
    if not connector:
        raise HTTPException(404, "Connector not found")

    if body.name is not None:
        connector.name = body.name
    if body.description is not None:
        connector.description = body.description
    if body.is_active is not None:
        connector.is_active = body.is_active
    if body.config is not None:
        # Merge: preserve masked secrets from existing config
        merged = dict(connector.config or {})
        for k, v in body.config.items():
            if v != "••••••••":   # don't overwrite with mask placeholder
                merged[k] = v
        connector.config = merged

    connector.updated_at = datetime.utcnow()
    await db.commit()
    return connector.to_dict()


@router.delete("/{connector_id}", status_code=204)
async def delete_connector(
    connector_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DataSourceConnector).where(DataSourceConnector.id == connector_id)
    )
    connector = result.scalars().first()
    if not connector:
        raise HTTPException(404, "Connector not found")
    connector.is_active = False
    await db.commit()


# ── Test Connection ───────────────────────────────────────────────────────────

@router.post("/{connector_id}/test")
async def test_connector(
    connector_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DataSourceConnector).where(DataSourceConnector.id == connector_id)
    )
    connector = result.scalars().first()
    if not connector:
        raise HTTPException(404, "Connector not found")

    cfg = connector.config or {}
    ctype = connector.connector_type

    try:
        import httpx

        if ctype == "web_crawler":
            url = cfg.get("url", "")
            if not url:
                return {"success": False, "message": "No URL configured"}
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                resp = await client.head(url)
                return {"success": resp.status_code < 400,
                        "message": f"HTTP {resp.status_code} — reachable" if resp.status_code < 400
                                   else f"HTTP {resp.status_code} — unreachable"}

        elif ctype == "github":
            repo = cfg.get("repo", "")
            if not repo:
                return {"success": False, "message": "No repository configured"}
            headers = {"Accept": "application/vnd.github.v3+json"}
            if cfg.get("token"):
                headers["Authorization"] = f"token {cfg['token']}"
            async with httpx.AsyncClient(timeout=10, headers=headers) as client:
                resp = await client.get(f"https://api.github.com/repos/{repo}")
                if resp.status_code == 200:
                    d = resp.json()
                    return {"success": True, "message": f"Repository '{d.get('full_name')}' — {d.get('stargazers_count', 0)} stars"}
                return {"success": False, "message": f"GitHub: {resp.json().get('message', 'Not found')}"}

        elif ctype == "confluence":
            site_url = cfg.get("site_url", "").rstrip("/")
            email = cfg.get("email", "")
            api_token = cfg.get("api_token", "")
            if not all([site_url, email, api_token]):
                return {"success": False, "message": "Missing site_url, email, or api_token"}
            import base64
            creds = base64.b64encode(f"{email}:{api_token}".encode()).decode()
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{site_url}/wiki/rest/api/space",
                    headers={"Authorization": f"Basic {creds}", "Accept": "application/json"},
                    params={"limit": 1}
                )
                if resp.status_code == 200:
                    count = resp.json().get("size", 0)
                    return {"success": True, "message": f"Connected — {count} space(s) accessible"}
                return {"success": False, "message": f"Confluence auth failed (HTTP {resp.status_code})"}

        elif ctype == "sharepoint":
            tenant_id = cfg.get("tenant_id", "")
            client_id = cfg.get("client_id", "")
            client_secret = cfg.get("client_secret", "")
            if not all([tenant_id, client_id, client_secret]):
                return {"success": False, "message": "Missing tenant_id, client_id, or client_secret"}
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token",
                    data={"grant_type": "client_credentials", "client_id": client_id,
                          "client_secret": client_secret, "scope": "https://graph.microsoft.com/.default"}
                )
                if resp.status_code == 200:
                    return {"success": True, "message": "Azure AD authentication successful"}
                return {"success": False, "message": f"Auth failed: {resp.json().get('error_description', 'Unknown error')}"}

        elif ctype == "rest_api":
            url = cfg.get("url", "")
            if not url:
                return {"success": False, "message": "No URL configured"}
            headers = cfg.get("headers", {}) or {}
            async with httpx.AsyncClient(timeout=10, headers=headers) as client:
                resp = await client.get(url, params=cfg.get("params", {}) or {})
                return {"success": resp.status_code < 400,
                        "message": f"HTTP {resp.status_code} — {'OK' if resp.status_code < 400 else 'Failed'}"}

        elif ctype == "ontology":
            entities = cfg.get("entities", [])
            rels = cfg.get("relationships", [])
            return {"success": True, "message": f"Ontology has {len(entities)} entity type(s) and {len(rels)} relationship type(s)"}

        return {"success": False, "message": f"Unknown connector type: {ctype}"}

    except Exception as exc:
        return {"success": False, "message": str(exc)}


# ── Sync ──────────────────────────────────────────────────────────────────────

@router.post("/{connector_id}/sync")
async def sync_connector(
    connector_id: str,
    background_tasks: BackgroundTasks,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DataSourceConnector).where(DataSourceConnector.id == connector_id)
    )
    connector = result.scalars().first()
    if not connector:
        raise HTTPException(404, "Connector not found")
    if connector.connector_type == "ontology":
        return {"message": "Ontology connectors do not require syncing — save your schema to persist it."}
    if connector.status == "syncing":
        return {"message": "Sync already in progress"}

    background_tasks.add_task(_run_sync, str(connector.id), str(admin.id))
    return {"message": f"Sync started for '{connector.name}'", "connector_id": connector_id}


@router.get("/{connector_id}/status")
async def get_connector_status(
    connector_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DataSourceConnector).where(DataSourceConnector.id == connector_id)
    )
    connector = result.scalars().first()
    if not connector:
        raise HTTPException(404, "Connector not found")
    return {
        "id": connector_id,
        "status": connector.status,
        "last_synced": connector.last_synced.isoformat() if connector.last_synced else None,
        "last_error": connector.last_error,
        "docs_synced": connector.docs_synced or 0,
    }
