import csv
import io
import json as _json
from typing import Union
from fastapi import UploadFile

try:
    from docx import Document
except ImportError:
    Document = None

try:
    from pptx import Presentation
except ImportError:
    Presentation = None

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

try:
    import openpyxl
except ImportError:
    openpyxl = None


# ── Column-header → canonical field mapping (shared by Excel + CSV parsers) ──
_HEADER_MAP = {
    "title":             "title",
    "problem statement": "description",
    "description":       "description",
    "problem":           "description",
    "proposed solution": "proposed_solution",
    "solution":          "proposed_solution",
    "kpi":               "kpi",
    "key metric":        "kpi",
    "success metric":    "kpi",
    "target user":       "target_user",
    "target_user":       "target_user",
    "user":              "target_user",
    "ai technique":      "category",
    "category":          "category",
    "technique":         "category",
    "industry":          "industry",
    "domain":            "industry",
}

# JSON keys that map to canonical field names
_JSON_KEY_MAP = {
    "title":              "title",
    "name":               "title",
    "problem_statement":  "description",
    "problem statement":  "description",
    "description":        "description",
    "challenge":          "description",
    "proposed_solution":  "proposed_solution",
    "proposed solution":  "proposed_solution",
    "solution":           "proposed_solution",
    "kpi":                "kpi",
    "key_metric":         "kpi",
    "success_metric":     "kpi",
    "target_user":        "target_user",
    "target user":        "target_user",
    "user":               "target_user",
    "category":           "category",
    "ai_technique":       "category",
    "technique":          "category",
    "industry":           "industry",
    "domain":             "industry",
}

SUPPORTED_EXTENSIONS = {
    ".xlsx", ".csv",                          # tabular
    ".docx", ".pptx", ".pdf",                 # narrative docs
    ".json", ".jsx", ".txt", ".md",           # text / structured text
    ".jpg", ".jpeg", ".png",                  # images (AI vision)
}


def _map_tabular_headers(headers: list[str]) -> dict[str, int]:
    """Return {canonical_field: col_index} for a list of raw header strings."""
    col_map: dict[str, int] = {}
    for idx, h in enumerate(headers):
        canonical = _HEADER_MAP.get(h.strip().lower())
        if canonical and canonical not in col_map:
            col_map[canonical] = idx
    return col_map


def _tabular_rows_to_dicts(col_map: dict[str, int], raw_rows: list) -> list[dict]:
    rows = []
    for raw in raw_rows:
        if all(v is None or str(v).strip() == "" for v in raw):
            continue
        row: dict[str, str] = {}
        for field, idx in col_map.items():
            val = raw[idx] if idx < len(raw) else None
            row[field] = str(val).strip() if val is not None else ""
        if row.get("title") or row.get("description"):
            rows.append(row)
    return rows


class FileAnalysisService:
    @staticmethod
    async def extract_text_from_file(file: UploadFile) -> Union[str, dict]:
        """
        Extracts content from an uploaded file.

        Returns:
        - str  — for narrative / unstructured formats (DOCX, PPTX, PDF, TXT, MD, JSX, images)
        - dict — for tabular / structured formats (XLSX, CSV, JSON), shape:
                 {"type": "tabular", "rows": [{"title": ..., "description": ..., ...}]}
        """
        filename = (file.filename or "").lower()
        content = await file.read()
        file_obj = io.BytesIO(content)

        # ── XLSX ────────────────────────────────────────────────────────────
        if filename.endswith(".xlsx"):
            if not openpyxl:
                raise ImportError("openpyxl is not installed")
            wb = openpyxl.load_workbook(file_obj, read_only=True, data_only=True)
            ws = wb.active
            raw_rows = list(ws.iter_rows(values_only=True))
            if not raw_rows:
                return {"type": "tabular", "rows": []}
            headers = [str(h).strip() if h is not None else "" for h in raw_rows[0]]
            col_map = _map_tabular_headers(headers)
            return {"type": "tabular", "rows": _tabular_rows_to_dicts(col_map, raw_rows[1:])}

        # ── CSV ─────────────────────────────────────────────────────────────
        if filename.endswith(".csv"):
            try:
                text_content = content.decode("utf-8")
            except UnicodeDecodeError:
                text_content = content.decode("latin-1")
            reader = csv.reader(io.StringIO(text_content))
            raw_rows = list(reader)
            if not raw_rows:
                return {"type": "tabular", "rows": []}
            headers = raw_rows[0]
            col_map = _map_tabular_headers(headers)
            # csv rows are already lists of strings
            raw_data = [[cell if cell else None for cell in row] for row in raw_rows[1:]]
            return {"type": "tabular", "rows": _tabular_rows_to_dicts(col_map, raw_data)}

        # ── JSON ─────────────────────────────────────────────────────────────
        if filename.endswith(".json"):
            try:
                text_content = content.decode("utf-8")
            except UnicodeDecodeError:
                text_content = content.decode("latin-1")
            try:
                parsed = _json.loads(text_content)
            except _json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON file: {exc}") from exc

            # Accept: list of objects OR {"use_cases": [...]} wrapper
            if isinstance(parsed, dict):
                items = parsed.get("use_cases") or parsed.get("usecases") or parsed.get("items") or []
                if not isinstance(items, list):
                    items = [parsed]   # single object
            elif isinstance(parsed, list):
                items = parsed
            else:
                raise ValueError("JSON must be an array of use-case objects or {\"use_cases\": [...]}")

            rows = []
            for obj in items:
                if not isinstance(obj, dict):
                    continue
                row: dict[str, str] = {}
                for raw_key, value in obj.items():
                    canonical = _JSON_KEY_MAP.get(raw_key.lower().strip())
                    if canonical and value is not None:
                        row[canonical] = str(value).strip()
                if row.get("title") or row.get("description"):
                    rows.append(row)
            return {"type": "tabular", "rows": rows}

        # ── DOCX ─────────────────────────────────────────────────────────────
        if filename.endswith(".docx"):
            if not Document:
                raise ImportError("python-docx is not installed")
            doc = Document(file_obj)
            return "\n".join([p.text for p in doc.paragraphs]).strip()

        # ── PPTX ─────────────────────────────────────────────────────────────
        if filename.endswith(".pptx"):
            if not Presentation:
                raise ImportError("python-pptx is not installed")
            prs = Presentation(file_obj)
            text = ""
            for slide in prs.slides:
                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        text += shape.text + "\n"
            return text.strip()

        # ── PDF ──────────────────────────────────────────────────────────────
        if filename.endswith(".pdf"):
            if not PdfReader:
                raise ImportError("pypdf is not installed")
            reader = PdfReader(file_obj)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()

        # ── Plain text, Markdown, JSX (treated as narrative text) ────────────
        if filename.endswith((".txt", ".md", ".jsx")):
            try:
                return content.decode("utf-8").strip()
            except UnicodeDecodeError:
                return content.decode("latin-1").strip()

        # ── Images: use AI vision to extract content ─────────────────────────
        if filename.endswith((".jpg", ".jpeg", ".png")):
            from app.services.rag_service import rag_service
            mime_type = "image/jpeg" if filename.endswith((".jpg", ".jpeg")) else "image/png"
            return await rag_service.extract_info_from_image(content, mime_type)

        raise ValueError(
            f"Unsupported file type: {filename}. "
            f"Supported: .xlsx, .csv, .json, .docx, .pptx, .pdf, .txt, .md, .jsx, .jpg, .jpeg, .png"
        )


file_service = FileAnalysisService()
