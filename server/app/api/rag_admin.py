"""
Admin API endpoints for RAG system management.

This module provides endpoints for:
- RAG system status and health checks
- Knowledge base management
- Feedback analytics
- Prompt template management
"""
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.services.rag_service import rag_service
from app.services.knowledge_base_manager import KnowledgeBaseManager
from app.services.rag_refinement import RAGRefinementService
from app.models.rag_feedback import RAGDocument, AIFeedback, PromptTemplate
from app.api.auth import get_current_user


router = APIRouter()

# Initialize services
kb_manager = KnowledgeBaseManager(rag_service)
refinement_service = RAGRefinementService(rag_service)


# ============================================================================
# Pydantic Schemas
# ============================================================================

class RAGStatusResponse(BaseModel):
    """RAG system status."""
    is_active: bool
    mode: str  # "real" or "mock"
    has_api_key: bool
    has_azure_key: bool
    vector_store_enabled: bool
    embeddings_enabled: bool
    reference_data_count: int
    model_info: Optional[Dict[str, Any]] = None


class DocumentCreate(BaseModel):
    """Create a new document."""
    title: str
    content: str
    category: Optional[str] = None
    source: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class DocumentUpdate(BaseModel):
    """Update a document."""
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class FeedbackCreate(BaseModel):
    """Submit feedback on an AI response."""
    endpoint: str
    request_data: Dict[str, Any]
    response_data: Dict[str, Any]
    rating: Optional[int] = None
    is_helpful: Optional[bool] = None
    feedback_text: Optional[str] = None
    response_time_ms: Optional[int] = None
    workshop_id: Optional[str] = None
    use_case_id: Optional[str] = None


class PromptTemplateCreate(BaseModel):
    """Create a new prompt template."""
    name: str
    template_text: str
    endpoint: str
    description: Optional[str] = None
    category: Optional[str] = None
    variant: Optional[str] = None


# ============================================================================
# RAG Status Endpoints
# ============================================================================

@router.get("/status", response_model=RAGStatusResponse)
async def get_rag_status():
    """Get the current status of the RAG system."""
    return RAGStatusResponse(
        is_active=not rag_service.mock_mode,
        mode="real" if not rag_service.mock_mode else "mock",
        has_api_key=rag_service.api_key is not None,
        has_azure_key=rag_service.azure_api_key is not None,
        vector_store_enabled=rag_service.vector_store is not None,
        embeddings_enabled=rag_service.embeddings is not None,
        reference_data_count=len(rag_service.reference_data),
        model_info={
            "llm_available": rag_service.llm is not None,
            "embeddings_available": rag_service.embeddings is not None
        }
    )


@router.get("/health")
async def health_check():
    """Health check endpoint for RAG system."""
    try:
        # Basic health check
        status_info = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "rag_mode": "real" if not rag_service.mock_mode else "mock",
            "services": {
                "vector_store": rag_service.vector_store is not None,
                "embeddings": rag_service.embeddings is not None,
                "llm": rag_service.llm is not None
            }
        }
        
        return status_info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"RAG service unhealthy: {str(e)}"
        )


# ============================================================================
# Knowledge Base Management
# ============================================================================

@router.post("/documents")
async def create_document(
    document: DocumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new document in the knowledge base."""
    doc = await kb_manager.ingest_document(
        db=db,
        title=document.title,
        content=document.content,
        category=document.category,
        source=document.source,
        metadata=document.metadata,
        user_id=current_user.id
    )
    
    return {
        "success": True,
        "document_id": doc.id,
        "message": "Document created successfully"
    }


@router.get("/documents")
async def list_documents(
    active_only: bool = True,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all documents in the knowledge base."""
    docs = await kb_manager.get_all_documents(
        db=db,
        active_only=active_only,
        category=category
    )
    
    return {
        "success": True,
        "count": len(docs),
        "documents": [
            {
                "id": doc.id,
                "title": doc.title,
                "category": doc.category,
                "source": doc.source,
                "version": doc.version,
                "retrieval_count": doc.retrieval_count,
                "is_active": doc.is_active,
                "created_at": doc.created_at.isoformat() if doc.created_at else None
            }
            for doc in docs
        ]
    }


@router.put("/documents/{document_id}")
async def update_document(
    document_id: str,
    document: DocumentUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a document in the knowledge base."""
    doc = await kb_manager.update_document(
        db=db,
        document_id=document_id,
        title=document.title,
        content=document.content,
        category=document.category,
        metadata=document.metadata
    )
    
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return {
        "success": True,
        "document_id": doc.id,
        "version": doc.version,
        "message": "Document updated successfully"
    }


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    soft_delete: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """Delete or deactivate a document."""
    success = await kb_manager.delete_document(
        db=db,
        document_id=document_id,
        soft_delete=soft_delete
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return {
        "success": True,
        "message": "Document deleted successfully" if not soft_delete else "Document deactivated"
    }


@router.get("/documents/stats")
async def get_kb_statistics(db: AsyncSession = Depends(get_db)):
    """Get knowledge base statistics."""
    stats = await kb_manager.get_statistics(db)
    return {
        "success": True,
        "statistics": stats
    }


@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    category: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Upload and ingest a document file (PDF, DOCX, PPTX, Images).
    """
    try:
        from app.services.file_service import file_service
        
        # Extract text content
        content = await file_service.extract_text_from_file(file)
        
        if not content:
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from file or file is empty"
            )
            
        # Ingest into Knowledge Base
        doc = await kb_manager.ingest_document(
            db=db,
            title=file.filename,
            content=content,
            category=category or "Imported",
            source="upload",
            metadata={
                "original_filename": file.filename,
                "content_type": file.content_type,
                "file_size": file.size
            },
            user_id=str(current_user.id)
        )
        
        return {
            "success": True,
            "document_id": doc.id,
            "message": f"Successfully imported '{file.filename}'"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process file: {str(e)}"
        )


# ============================================================================
# Feedback Management
# ============================================================================

@router.post("/feedback")
async def submit_feedback(
    feedback: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Submit feedback on an AI response."""
    feedback_record = await refinement_service.collect_feedback(
        db=db,
        endpoint=feedback.endpoint,
        request_data=feedback.request_data,
        response_data=feedback.response_data,
        rating=feedback.rating,
        is_helpful=feedback.is_helpful,
        feedback_text=feedback.feedback_text,
        response_time_ms=feedback.response_time_ms,
        workshop_id=feedback.workshop_id,
        use_case_id=feedback.use_case_id,
        user_id=current_user.id
    )
    
    return {
        "success": True,
        "feedback_id": feedback_record.id,
        "message": "Feedback submitted successfully"
    }


@router.get("/feedback/analytics")
async def get_feedback_analytics(
    endpoint: Optional[str] = None,
    days: int = 30,
    db: AsyncSession = Depends(get_db)
):
    """Get analytics on collected feedback."""
    analytics = await refinement_service.get_feedback_analytics(
        db=db,
        endpoint=endpoint,
        days=days
    )
    
    return {
        "success": True,
        "analytics": analytics
    }


@router.get("/feedback/suggestions")
async def get_improvement_suggestions(
    endpoint: str,
    db: AsyncSession = Depends(get_db)
):
    """Get AI-driven suggestions for improving responses."""
    suggestions = await refinement_service.suggest_improvements(
        db=db,
        endpoint=endpoint
    )
    
    return {
        "success": True,
        "suggestions": suggestions
    }


# ============================================================================
# Prompt Template Management
# ============================================================================

@router.post("/prompts")
async def create_prompt_template(
    prompt: PromptTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new prompt template."""
    template = await refinement_service.create_prompt_template(
        db=db,
        name=prompt.name,
        template_text=prompt.template_text,
        endpoint=prompt.endpoint,
        description=prompt.description,
        category=prompt.category,
        variant=prompt.variant,
        user_id=current_user.id
    )
    
    return {
        "success": True,
        "template_id": template.id,
        "message": "Prompt template created successfully"
    }


@router.get("/prompts/{endpoint}")
async def get_active_prompt(
    endpoint: str,
    variant: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get the active prompt template for an endpoint."""
    template = await refinement_service.get_active_prompt(
        db=db,
        endpoint=endpoint,
        variant=variant
    )
    
    if not template:
        return {
            "success": False,
            "message": "No active prompt template found"
        }
    
    return {
        "success": True,
        "template": {
            "id": template.id,
            "name": template.name,
            "template_text": template.template_text,
            "version": template.version,
            "success_rate": template.success_rate,
            "usage_count": template.usage_count
        }
    }


# ============================================================================
# Metrics
# ============================================================================

@router.get("/metrics")
async def get_rag_metrics(
    endpoint: Optional[str] = None,
    days: int = 7,
    db: AsyncSession = Depends(get_db)
):
    """Get RAG system metrics."""
    # Combine feedback analytics with KB stats
    feedback_analytics = await refinement_service.get_feedback_analytics(
        db=db,
        endpoint=endpoint,
        days=days
    )
    
    kb_stats = await kb_manager.get_statistics(db)
    
    return {
        "success": True,
        "metrics": {
            "feedback": feedback_analytics,
            "knowledge_base": kb_stats,
            "system": {
                "mode": "real" if not rag_service.mock_mode else "mock",
                "vector_store_enabled": rag_service.vector_store is not None
            }
        }
    }
