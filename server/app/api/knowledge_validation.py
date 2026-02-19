"""
Knowledge Validation API Endpoints
Handles knowledge article import, validation, and use case impact analysis
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
import uuid
import httpx
from html.parser import HTMLParser

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import User
from app.models.knowledge_article import KnowledgeArticle, UseCaseKnowledgeLink, ValidationStatus, ImpactType
from app.models.knowledge_base import KBUseCase
from app.models.notification import Notification, NotificationType, NotificationStatus
from app.services.rag_service import rag_service
from app.core.config import settings
from pydantic import BaseModel

router = APIRouter(prefix="/api/knowledge", tags=["knowledge-validation"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class KnowledgeArticleResponse(BaseModel):
    id: str
    title: str
    content: str
    summary: Optional[str]
    source_type: str
    source_url: Optional[str]
    source_filename: Optional[str]
    validation_status: str
    validation_score: Optional[float]
    validation_sources: List[dict]
    validation_notes: Optional[str]
    imported_by: str
    imported_at: str
    validated_at: Optional[str]
    is_active: bool
    linked_usecases_count: int

class UseCaseLinkResponse(BaseModel):
    id: str
    usecase_id: str
    article_id: str
    relevance_score: float
    impact_type: str
    suggested_changes: dict
    status: str

class ImportResponse(BaseModel):
    article_id: str
    title: str
    validation_status: str
    validation_score: Optional[float]
    affected_usecases: List[dict]
    notification_id: Optional[str]

class ImportURLRequest(BaseModel):
    url: str
    title: Optional[str] = None


# ============================================================================
# Helper Functions
# ============================================================================

class _TextExtractor(HTMLParser):
    """Minimal HTML → plain text extractor (no third-party deps)."""
    _SKIP = {"script", "style", "head", "noscript", "nav", "footer", "aside"}

    def __init__(self):
        super().__init__()
        self._parts: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in self._SKIP:
            self._skip_depth += 1

    def handle_endtag(self, tag):
        if tag in self._SKIP and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data):
        if not self._skip_depth:
            stripped = data.strip()
            if stripped:
                self._parts.append(stripped)

    def get_text(self) -> str:
        return "\n".join(self._parts)


def _html_to_text(html: str) -> str:
    parser = _TextExtractor()
    parser.feed(html)
    return parser.get_text()


async def parse_document(file: UploadFile) -> tuple[str, str]:
    """
    Parse uploaded document and extract text content.
    Returns (title, content) tuple.
    """
    content_bytes = await file.read()
    filename = file.filename or "Untitled"
    
    # Determine file type
    file_ext = filename.lower().split('.')[-1] if '.' in filename else ''
    
    if file_ext in ['txt', 'md']:
        # Plain text files
        content = content_bytes.decode('utf-8')
        title = filename.replace(f'.{file_ext}', '')
        return title, content
    
    elif file_ext == 'pdf':
        # PDF parsing
        try:
            import PyPDF2
            import io
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content_bytes))
            content = ""
            for page in pdf_reader.pages:
                content += page.extract_text() + "\n"
            title = filename.replace('.pdf', '')
            return title, content
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")
    
    elif file_ext in ['docx', 'doc']:
        # Word document parsing
        try:
            import docx
            import io
            doc = docx.Document(io.BytesIO(content_bytes))
            content = "\n".join([para.text for para in doc.paragraphs])
            title = filename.replace(f'.{file_ext}', '')
            return title, content
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse Word document: {str(e)}")
    
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_ext}")


async def create_notification_for_admins(
    db: AsyncSession,
    affected_usecases: List[dict],
    *,
    article_id: Optional[str] = None,
    article_title: Optional[str] = None,
    article: Optional[KnowledgeArticle] = None,
) -> Optional[str]:
    """
    Create notifications for all admin users about the knowledge import.
    Pass article_id and article_title explicitly to avoid accessing expired ORM attributes
    after commit (greenlet lazy-load error). Returns the notification ID.
    """
    if not affected_usecases:
        return None

    # Prefer explicit strings to avoid touching expired article after commit
    aid = article_id or (str(article.id) if article is not None else None)
    atitle = article_title or (article.title if article is not None else None)
    if not aid or not atitle:
        return None

    # Get all admin users
    result = await db.execute(
        select(User).where(User.is_admin == True)
    )
    admins = result.scalars().all()

    if not admins:
        return None

    # Create notification data
    notification_data = {
        "article_id": aid,
        "article_title": atitle,
        "affected_usecases": [
            {
                "id": uc["usecase_id"],
                "title": uc["usecase_title"],
                "impact_type": uc["impact_type"],
                "relevance_score": uc["relevance_score"],
                "changes": uc["suggested_changes"]
            }
            for uc in affected_usecases
        ]
    }

    notification_id = None

    # Create notification for each admin
    for admin in admins:
        notification = Notification(
            id=uuid.uuid4(),
            user_id=admin.id,
            notification_type=NotificationType.KNOWLEDGE_IMPORT,
            title=f"New Knowledge Imported - {len(affected_usecases)} Use Cases Affected",
            message=f"The article '{atitle}' has been imported and may enhance {len(affected_usecases)} use case(s). Review and approve the suggested changes.",
            data=notification_data,
            status=NotificationStatus.PENDING,
            priority="high" if len(affected_usecases) > 3 else "normal",
            action_url=f"/admin/knowledge-base?article={aid}"
        )
        db.add(notification)
        notification_id = str(notification.id)

    await db.commit()
    return notification_id


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/import", response_model=ImportResponse)
async def import_knowledge(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Import a knowledge article from uploaded document.
    Automatically validates and finds affected use cases.
    Creates notifications for admins to approve changes.
    """
    # Only admins can import knowledge
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can import knowledge")
    
    # Parse document
    try:
        title, content = await parse_document(file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Import to RAG system
    try:
        rag_result = await rag_service.import_knowledge_article(
            content=content,
            title=title,
            source_type=file.filename.split('.')[-1] if file.filename else 'unknown',
            metadata={
                "source_filename": file.filename
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import to RAG: {str(e)}")
    
    # Validate against research
    validation_provider = getattr(settings, 'RESEARCH_API_PROVIDER', 'llm_only')
    validation_result = await rag_service.validate_against_research(
        article_title=title,
        article_content=content,
        provider=validation_provider
    )
    
    # Create knowledge article record
    article = KnowledgeArticle(
        id=uuid.uuid4(),
        title=title,
        content=content,
        summary=rag_result.get("summary"),
        source_type=file.filename.split('.')[-1] if file.filename else 'unknown',
        source_filename=file.filename,
        validation_status=ValidationStatus.VALIDATED if validation_result.get("validation_score", 0) >= getattr(settings, 'VALIDATION_CONFIDENCE_THRESHOLD', 75) else ValidationStatus.PENDING,
        validation_score=validation_result.get("validation_score"),
        validation_sources=validation_result.get("sources", []),
        validation_notes=validation_result.get("notes"),
        embedding_id=rag_result.get("embedding_id"),
        embedding_model=getattr(settings, 'AZURE_OPENAI_EMBEDDING_MODEL', 'text-embedding-ada-002'),
        imported_by=current_user.id,
        imported_at=datetime.utcnow(),
        validated_at=datetime.utcnow() if validation_result.get("validation_score", 0) >= 75 else None
    )
    
    db.add(article)
    await db.flush()  # Get article ID
    
    # Find affected use cases — build dicts from scalar columns only to avoid greenlet lazy-load
    result = await db.execute(
        select(KBUseCase).where(KBUseCase.is_active == True)
    )
    all_usecases = result.scalars().all()
    usecase_dicts = [
        {"id": str(uc.id), "title": uc.title, "description": uc.description or "", "category": uc.category or ""}
        for uc in all_usecases
    ]
    affected_usecases = await rag_service.find_affected_usecases(
        article_content=content,
        article_title=title,
        existing_usecases=usecase_dicts
    )

    # Create use case knowledge links
    for affected in affected_usecases:
        link = UseCaseKnowledgeLink(
            id=uuid.uuid4(),
            usecase_id=affected["usecase_id"],
            article_id=article.id,
            relevance_score=affected["relevance_score"],
            impact_type=affected["impact_type"],
            suggested_changes=affected["suggested_changes"],
            status="pending"
        )
        db.add(link)
    
    # Capture values before commit — expired ORM attributes can't be lazily loaded async
    article_id_str    = str(article.id)
    article_title_str = article.title
    article_vstatus   = article.validation_status
    article_vscore    = article.validation_score

    await db.commit()

    # Create notifications for admins (pass scalars only; do not pass expired article)
    notification_id = await create_notification_for_admins(
        db, affected_usecases,
        article_id=article_id_str, article_title=article_title_str
    )

    return ImportResponse(
        article_id=article_id_str,
        title=article_title_str,
        validation_status=article_vstatus,
        validation_score=article_vscore,
        affected_usecases=affected_usecases,
        notification_id=notification_id
    )


@router.get("/articles", response_model=List[KnowledgeArticleResponse])
async def list_knowledge_articles(
    validation_status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all knowledge articles with optional filtering.
    Eager-load usecase_links so to_dict() does not trigger lazy load (greenlet error).
    """
    query = (
        select(KnowledgeArticle)
        .options(selectinload(KnowledgeArticle.usecase_links))
        .where(KnowledgeArticle.is_active == True)
    )
    if validation_status:
        query = query.where(KnowledgeArticle.validation_status == validation_status)
    query = query.offset(skip).limit(limit).order_by(KnowledgeArticle.imported_at.desc())

    result = await db.execute(query)
    articles = result.scalars().all()
    return [KnowledgeArticleResponse(**article.to_dict()) for article in articles]


@router.get("/articles/{article_id}", response_model=KnowledgeArticleResponse)
async def get_knowledge_article(
    article_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific knowledge article by ID.
    Eager-load usecase_links so to_dict() does not trigger lazy load (greenlet error).
    """
    result = await db.execute(
        select(KnowledgeArticle)
        .options(selectinload(KnowledgeArticle.usecase_links))
        .where(KnowledgeArticle.id == article_id)
    )
    article = result.scalars().first()
    if not article:
        raise HTTPException(status_code=404, detail="Knowledge article not found")
    return KnowledgeArticleResponse(**article.to_dict())


@router.get("/articles/{article_id}/usecases", response_model=List[UseCaseLinkResponse])
async def get_article_usecases(
    article_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all use cases linked to a knowledge article.
    """
    result = await db.execute(
        select(UseCaseKnowledgeLink).where(UseCaseKnowledgeLink.article_id == article_id)
    )
    links = result.scalars().all()
    
    return [UseCaseLinkResponse(**link.to_dict()) for link in links]


@router.post("/validate/{article_id}")
async def validate_article(
    article_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Manually trigger validation for a knowledge article.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can validate articles")
    
    result = await db.execute(
        select(KnowledgeArticle).where(KnowledgeArticle.id == article_id)
    )
    article = result.scalars().first()
    
    if not article:
        raise HTTPException(status_code=404, detail="Knowledge article not found")
    
    # Run validation
    validation_provider = getattr(settings, 'RESEARCH_API_PROVIDER', 'llm_only')
    validation_result = await rag_service.validate_against_research(
        article_title=article.title,
        article_content=article.content,
        provider=validation_provider
    )
    
    # Update article
    article.validation_status = ValidationStatus.VALIDATED if validation_result.get("validation_score", 0) >= 75 else ValidationStatus.PENDING
    article.validation_score = validation_result.get("validation_score")
    article.validation_sources = validation_result.get("sources", [])
    article.validation_notes = validation_result.get("notes")
    article.validated_at = datetime.utcnow()
    
    await db.commit()
    
    return {
        "article_id": str(article.id),
        "validation_status": article.validation_status,
        "validation_score": article.validation_score,
        "validation_sources": article.validation_sources,
        "validation_notes": article.validation_notes
    }


@router.post("/import-url", response_model=ImportResponse)
async def import_knowledge_from_url(
    body: ImportURLRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch a URL and import its content as a knowledge article.
    Automatically validates and finds affected use cases.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can import knowledge")

    # Fetch URL content
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(body.url, headers={"User-Agent": "QbrainBot/1.0"})
            resp.raise_for_status()
            raw_html = resp.text
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL ({e.response.status_code}): {body.url}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")

    content = _html_to_text(raw_html)
    if not content.strip():
        raise HTTPException(status_code=400, detail="No readable text content found at URL")

    # Derive title
    title = body.title or body.url.split("/")[-1].split("?")[0] or body.url

    # Import to RAG system
    try:
        rag_result = await rag_service.import_knowledge_article(
            content=content,
            title=title,
            source_type="url",
            metadata={"source_url": body.url}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import to RAG: {str(e)}")

    # Validate
    validation_provider = getattr(settings, 'RESEARCH_API_PROVIDER', 'llm_only')
    validation_result = await rag_service.validate_against_research(
        article_title=title,
        article_content=content,
        provider=validation_provider
    )

    threshold = getattr(settings, 'VALIDATION_CONFIDENCE_THRESHOLD', 75)
    article = KnowledgeArticle(
        id=uuid.uuid4(),
        title=title,
        content=content,
        summary=rag_result.get("summary"),
        source_type="url",
        source_url=body.url,
        validation_status=ValidationStatus.VALIDATED if validation_result.get("validation_score", 0) >= threshold else ValidationStatus.PENDING,
        validation_score=validation_result.get("validation_score"),
        validation_sources=validation_result.get("sources", []),
        validation_notes=validation_result.get("notes"),
        embedding_id=rag_result.get("embedding_id"),
        embedding_model=getattr(settings, 'AZURE_OPENAI_EMBEDDING_MODEL', 'text-embedding-ada-002'),
        imported_by=current_user.id,
        imported_at=datetime.utcnow(),
        validated_at=datetime.utcnow() if validation_result.get("validation_score", 0) >= threshold else None
    )

    db.add(article)
    await db.flush()

    # Find affected use cases — build dicts from scalar columns only to avoid
    # lazy-load greenlet error (to_dict() touches uc.industry which can trigger async load).
    result = await db.execute(
        select(KBUseCase).where(KBUseCase.is_active == True)
    )
    all_usecases = result.scalars().all()
    usecase_dicts = [
        {
            "id": str(uc.id),
            "title": uc.title,
            "description": uc.description or "",
            "category": uc.category or "",
        }
        for uc in all_usecases
    ]
    affected_usecases = await rag_service.find_affected_usecases(
        article_content=content,
        article_title=title,
        existing_usecases=usecase_dicts
    )

    for affected in affected_usecases:
        link = UseCaseKnowledgeLink(
            id=uuid.uuid4(),
            usecase_id=affected["usecase_id"],
            article_id=article.id,
            relevance_score=affected["relevance_score"],
            impact_type=affected["impact_type"],
            suggested_changes=affected["suggested_changes"],
            status="pending"
        )
        db.add(link)

    # Capture values before commit — after commit the ORM object is expired and
    # accessing its attributes would trigger a lazy SELECT which fails in async mode.
    article_id_str      = str(article.id)
    article_title_str   = article.title
    article_vstatus     = article.validation_status
    article_vscore      = article.validation_score

    await db.commit()
    # Pass only scalar values; do not pass expired article (avoids greenlet lazy-load error).
    notification_id = await create_notification_for_admins(
        db, affected_usecases,
        article_id=article_id_str, article_title=article_title_str
    )

    return ImportResponse(
        article_id=article_id_str,
        title=article_title_str,
        validation_status=article_vstatus,
        validation_score=article_vscore,
        affected_usecases=affected_usecases,
        notification_id=notification_id
    )


@router.post("/articles/{article_id}/revalidate")
async def revalidate_article(
    article_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Re-run validation AND re-discover affected use cases for an existing article.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can revalidate articles")

    result = await db.execute(
        select(KnowledgeArticle).where(KnowledgeArticle.id == article_id)
    )
    article = result.scalars().first()
    if not article:
        raise HTTPException(status_code=404, detail="Knowledge article not found")

    # Re-validate
    validation_provider = getattr(settings, 'RESEARCH_API_PROVIDER', 'llm_only')
    validation_result = await rag_service.validate_against_research(
        article_title=article.title,
        article_content=article.content,
        provider=validation_provider
    )
    threshold = getattr(settings, 'VALIDATION_CONFIDENCE_THRESHOLD', 75)
    article.validation_status = ValidationStatus.VALIDATED if validation_result.get("validation_score", 0) >= threshold else ValidationStatus.PENDING
    article.validation_score = validation_result.get("validation_score")
    article.validation_sources = validation_result.get("sources", [])
    article.validation_notes = validation_result.get("notes")
    article.validated_at = datetime.utcnow()

    # Remove old links
    old_links_result = await db.execute(
        select(UseCaseKnowledgeLink).where(UseCaseKnowledgeLink.article_id == article_id)
    )
    for link in old_links_result.scalars().all():
        await db.delete(link)

    await db.flush()

    # Re-discover use cases — build dicts from scalar columns only to avoid greenlet lazy-load
    uc_result = await db.execute(
        select(KBUseCase).where(KBUseCase.is_active == True)
    )
    all_ucs = uc_result.scalars().all()
    usecase_dicts = [
        {"id": str(uc.id), "title": uc.title, "description": uc.description or "", "category": uc.category or ""}
        for uc in all_ucs
    ]
    affected_usecases = await rag_service.find_affected_usecases(
        article_content=article.content,
        article_title=article.title,
        existing_usecases=usecase_dicts
    )

    for affected in affected_usecases:
        link = UseCaseKnowledgeLink(
            id=uuid.uuid4(),
            usecase_id=affected["usecase_id"],
            article_id=article.id,
            relevance_score=affected["relevance_score"],
            impact_type=affected["impact_type"],
            suggested_changes=affected["suggested_changes"],
            status="pending"
        )
        db.add(link)

    await db.commit()

    return {
        "article_id": str(article.id),
        "validation_status": article.validation_status,
        "validation_score": article.validation_score,
        "validation_sources": article.validation_sources,
        "validation_notes": article.validation_notes,
        "affected_usecases_count": len(affected_usecases)
    }


@router.delete("/articles/{article_id}", status_code=204)
async def delete_knowledge_article_endpoint(
    article_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a knowledge article and its embeddings.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can delete articles")
    
    result = await db.execute(
        select(KnowledgeArticle).where(KnowledgeArticle.id == article_id)
    )
    article = result.scalars().first()
    
    if not article:
        raise HTTPException(status_code=404, detail="Knowledge article not found")
        
    # Remove from RAG
    if article.embedding_id:
        await rag_service.delete_knowledge_article(article.embedding_id)
        
    # Remove from DB
    await db.delete(article)
    await db.commit()
    
    return None
