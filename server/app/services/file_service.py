import os
from typing import Optional
from fastapi import UploadFile
import io

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

class FileAnalysisService:
    @staticmethod
    async def extract_text_from_file(file: UploadFile) -> str:
        """
        Extracts text content from uploaded file based on its content type or extension.
        """
        filename = file.filename.lower()
        content = await file.read()
        file_obj = io.BytesIO(content)
        
        text = ""
        
        if filename.endswith('.docx'):
            if not Document:
                raise ImportError("python-docx is not installed")
            doc = Document(file_obj)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            
        elif filename.endswith('.pptx'):
            if not Presentation:
                raise ImportError("python-pptx is not installed")
            prs = Presentation(file_obj)
            for slide in prs.slides:
                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        text += shape.text + "\n"
                        
        elif filename.endswith('.pdf'):
            if not PdfReader:
                raise ImportError("pypdf is not installed")
            reader = PdfReader(file_obj)
            for page in reader.pages:
                text += page.extract_text() + "\n"
                
        elif filename.endswith('.md') or filename.endswith('.txt'):
            try:
                text = content.decode('utf-8')
            except UnicodeDecodeError:
                text = content.decode('latin-1')

        elif filename.endswith(('.jpg', '.jpeg', '.png')):
            # Use RAG Service for Image Analysis
            from app.services.rag_service import rag_service
            
            mime_type = "image/jpeg" if filename.endswith(('.jpg', '.jpeg')) else "image/png"
            text = await rag_service.extract_info_from_image(content, mime_type)
                
        else:
            raise ValueError(f"Unsupported file type: {filename}")
            
        return text.strip()

file_service = FileAnalysisService()
