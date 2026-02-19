import io
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

# Expected column headers for the Excel import template (case-insensitive)
EXCEL_TEMPLATE_HEADERS = [
    "title",
    "problem statement",
    "proposed solution",
    "kpi",
    "target user",
    "ai technique",
]


class FileAnalysisService:
    @staticmethod
    async def extract_text_from_file(file: UploadFile) -> Union[str, dict]:
        """
        Extracts content from an uploaded file.

        Returns:
        - str  — for narrative formats (DOCX, PPTX, PDF, TXT, MD, images)
        - dict — for tabular formats (XLSX), shape:
                 {"type": "tabular", "rows": [{"title": ..., "description": ..., ...}]}
        """
        filename = file.filename.lower()
        content = await file.read()
        file_obj = io.BytesIO(content)

        if filename.endswith(".xlsx"):
            if not openpyxl:
                raise ImportError("openpyxl is not installed")
            wb = openpyxl.load_workbook(file_obj, read_only=True, data_only=True)
            ws = wb.active
            raw_rows = list(ws.iter_rows(values_only=True))
            if not raw_rows:
                return {"type": "tabular", "rows": []}

            # First row = headers
            headers = [str(h).strip().lower() if h is not None else "" for h in raw_rows[0]]

            # Map column index to canonical field name
            col_map = {}
            for idx, h in enumerate(headers):
                if h in ("title",):
                    col_map["title"] = idx
                elif h in ("problem statement", "description", "problem"):
                    col_map["description"] = idx
                elif h in ("proposed solution", "solution"):
                    col_map["proposed_solution"] = idx
                elif h in ("kpi", "key metric", "success metric"):
                    col_map["kpi"] = idx
                elif h in ("target user", "target_user", "user"):
                    col_map["target_user"] = idx
                elif h in ("ai technique", "category", "technique"):
                    col_map["category"] = idx

            rows = []
            for raw in raw_rows[1:]:
                # Skip completely empty rows
                if all(v is None for v in raw):
                    continue
                row = {}
                for field, idx in col_map.items():
                    val = raw[idx] if idx < len(raw) else None
                    row[field] = str(val).strip() if val is not None else ""
                # Require at least a title or description
                if row.get("title") or row.get("description"):
                    rows.append(row)

            return {"type": "tabular", "rows": rows}

        text = ""

        if filename.endswith(".docx"):
            if not Document:
                raise ImportError("python-docx is not installed")
            doc = Document(file_obj)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])

        elif filename.endswith(".pptx"):
            if not Presentation:
                raise ImportError("python-pptx is not installed")
            prs = Presentation(file_obj)
            for slide in prs.slides:
                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        text += shape.text + "\n"

        elif filename.endswith(".pdf"):
            if not PdfReader:
                raise ImportError("pypdf is not installed")
            reader = PdfReader(file_obj)
            for page in reader.pages:
                text += page.extract_text() + "\n"

        elif filename.endswith(".md") or filename.endswith(".txt"):
            try:
                text = content.decode("utf-8")
            except UnicodeDecodeError:
                text = content.decode("latin-1")

        elif filename.endswith((".jpg", ".jpeg", ".png")):
            from app.services.rag_service import rag_service
            mime_type = "image/jpeg" if filename.endswith((".jpg", ".jpeg")) else "image/png"
            text = await rag_service.extract_info_from_image(content, mime_type)

        else:
            raise ValueError(f"Unsupported file type: {filename}")

        return text.strip()


file_service = FileAnalysisService()
