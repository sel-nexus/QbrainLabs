"""
Knowledge Validation API Endpoints
Handles knowledge article import, validation, and use case impact analysis
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from typing import List, Optional
from datetime import datetime
import uuid

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


# ============================================================================
# Helper Functions
# ============================================================================

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
    article: KnowledgeArticle,
    affected_usecases: List[dict]
) -> Optional[str]:
    """
    Create notifications for all admin users about the knowledge import.
    Returns the notification ID.
    """
    if not affected_usecases:
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
        "article_id": str(article.id),
        "article_title": article.title,
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
            message=f"The article '{article.title}' has been imported and may enhance {len(affected_usecases)} use case(s). Review and approve the suggested changes.",
            data=notification_data,
            status=NotificationStatus.PENDING,
            priority="high" if len(affected_usecases) > 3 else "normal",
            action_url=f"/admin/knowledge-base?article={article.id}"
        )
        db.add(notification)
        notification_id = str(notification.id)  # Return last notification ID
    
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
    
    # Find affected use cases
    result = await db.execute(select(KBUseCase).where(KBUseCase.is_active == True))
    all_usecases = result.scalars().all()
    
    usecase_dicts = [uc.to_dict() for uc in all_usecases]
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
    
    await db.commit()
    
    # Create notifications for admins
    notification_id = await create_notification_for_admins(db, article, affected_usecases)
    
    return ImportResponse(
        article_id=str(article.id),
        title=article.title,
        validation_status=article.validation_status,
        validation_score=article.validation_score,
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
    """
    query = select(KnowledgeArticle).where(KnowledgeArticle.is_active == True)
    
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
    """
    result = await db.execute(
        select(KnowledgeArticle).where(KnowledgeArticle.id == article_id)
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
