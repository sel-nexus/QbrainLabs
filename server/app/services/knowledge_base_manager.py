"""
Knowledge Base Manager for RAG System.

This service manages the document ingestion, vector store updates,
and knowledge base maintenance for the RAG system.
"""
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.rag_feedback import RAGDocument
from app.core.config import settings


class KnowledgeBaseManager:
    """Manages the RAG knowledge base and vector store."""
    
    def __init__(self, rag_service):
        """
        Initialize the knowledge base manager.
        
        Args:
            rag_service: The RAG service instance to update
        """
        self.rag_service = rag_service
        self.base_dir = Path(__file__).parent.parent
        self.data_dir = self.base_dir / "data"
        self.data_dir.mkdir(exist_ok=True)
        
    async def load_reference_data(self) -> List[Dict[str, Any]]:
        """Load reference data from JSON file."""
        try:
            reference_file = self.data_dir / "ai_use_cases.json"
            if reference_file.exists():
                with open(reference_file, 'r') as f:
                    data = json.load(f)
                print(f"[OK] Loaded {len(data)} reference use cases from file")
                return data
            else:
                print("[WARN] Reference data file not found, using empty list")
                return []
        except Exception as e:
            print(f"[ERROR] Error loading reference data: {e}")
            return []
    
    async def ingest_document(
        self,
        db: AsyncSession,
        title: str,
        content: str,
        category: Optional[str] = None,
        source: Optional[str] = None,
        metadata: Optional[Dict] = None,
        user_id: Optional[str] = None
    ) -> RAGDocument:
        """
        Ingest a new document into the knowledge base.
        
        Args:
            db: Database session
            title: Document title
            content: Document content
            category: Document category
            source: Document source
            metadata: Additional metadata
            user_id: User who created the document
            
        Returns:
            The created RAGDocument
        """
        # Create database record
        doc = RAGDocument(
            title=title,
            content=content,
            category=category,
            source=source,
            metadata=metadata or {},
            created_by=str(user_id) if user_id else None
        )
        
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        
        # Update vector store
        await self._update_vector_store()
        
        print(f"[OK] Ingested document: {title}")
        return doc
    
    async def update_document(
        self,
        db: AsyncSession,
        document_id: str,
        title: Optional[str] = None,
        content: Optional[str] = None,
        category: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Optional[RAGDocument]:
        """Update an existing document."""
        result = await db.execute(
            select(RAGDocument).where(RAGDocument.id == document_id)
        )
        doc = result.scalar_one_or_none()
        
        if not doc:
            return None
        
        # Update fields
        if title is not None:
            doc.title = title
        if content is not None:
            doc.content = content
        if category is not None:
            doc.category = category
        if metadata is not None:
            doc.metadata = metadata
        
        doc.version += 1
        doc.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(doc)
        
        # Update vector store
        await self._update_vector_store()
        
        print(f"[OK] Updated document: {doc.title} (v{doc.version})")
        return doc
    
    async def delete_document(
        self,
        db: AsyncSession,
        document_id: str,
        soft_delete: bool = True
    ) -> bool:
        """Delete or deactivate a document."""
        result = await db.execute(
            select(RAGDocument).where(RAGDocument.id == document_id)
        )
        doc = result.scalar_one_or_none()
        
        if not doc:
            return False
        
        if soft_delete:
            doc.is_active = False
            await db.commit()
            print(f"[OK] Deactivated document: {doc.title}")
        else:
            await db.delete(doc)
            await db.commit()
            print(f"[OK] Deleted document: {doc.title}")
        
        # Update vector store
        await self._update_vector_store()
        
        return True
    
    async def get_all_documents(
        self,
        db: AsyncSession,
        active_only: bool = True,
        category: Optional[str] = None
    ) -> List[RAGDocument]:
        """Get all documents from the knowledge base."""
        query = select(RAGDocument)
        
        if active_only:
            query = query.where(RAGDocument.is_active == True)
        
        if category:
            query = query.where(RAGDocument.category == category)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def track_retrieval(
        self,
        db: AsyncSession,
        document_id: str
    ):
        """Track when a document is retrieved."""
        await db.execute(
            update(RAGDocument)
            .where(RAGDocument.id == document_id)
            .values(
                retrieval_count=RAGDocument.retrieval_count + 1,
                last_retrieved_at=datetime.utcnow()
            )
        )
        await db.commit()
    
    async def _update_vector_store(self):
        """Rebuild the vector store with current documents."""
        if not self.rag_service.embeddings:
            print("⚠️  No embeddings available, skipping vector store update")
            return
        
        try:
            from langchain.vectorstores import Chroma
            from langchain.schema import Document
            
            # Get all active documents from reference data
            reference_data = await self.load_reference_data()
            
            if not reference_data:
                print("⚠️  No reference data to update vector store")
                return
            
            # Create documents
            documents = [
                Document(
                    page_content=f"{item['title']}: {item['description']}",
                    metadata=item
                )
                for item in reference_data
            ]
            
            # Rebuild vector store
            self.rag_service.vector_store = Chroma.from_documents(
                documents,
                self.rag_service.embeddings
            )
            
            print(f"[OK] Updated vector store with {len(documents)} documents")
            
        except Exception as e:
            print(f"[ERROR] Failed to update vector store: {e}")
    
    async def export_knowledge_base(
        self,
        db: AsyncSession,
        output_file: Optional[str] = None
    ) -> Dict[str, Any]:
        """Export the knowledge base to JSON."""
        docs = await self.get_all_documents(db, active_only=True)
        
        export_data = {
            "exported_at": datetime.utcnow().isoformat(),
            "document_count": len(docs),
            "documents": [
                {
                    "id": doc.id,
                    "title": doc.title,
                    "content": doc.content,
                    "category": doc.category,
                    "source": doc.source,
                    "metadata": doc.metadata,
                    "version": doc.version,
                    "retrieval_count": doc.retrieval_count,
                    "created_at": doc.created_at.isoformat() if doc.created_at else None,
                    "updated_at": doc.updated_at.isoformat() if doc.updated_at else None
                }
                for doc in docs
            ]
        }
        
        if output_file:
            output_path = self.data_dir / output_file
            with open(output_path, 'w') as f:
                json.dump(export_data, f, indent=2)
            print(f"✅ Exported knowledge base to {output_path}")
        
        return export_data
    
    async def import_knowledge_base(
        self,
        db: AsyncSession,
        import_file: str,
        user_id: Optional[str] = None
    ) -> int:
        """Import documents from JSON file."""
        import_path = self.data_dir / import_file
        
        if not import_path.exists():
            raise FileNotFoundError(f"Import file not found: {import_path}")
        
        with open(import_path, 'r') as f:
            import_data = json.load(f)
        
        documents = import_data.get("documents", [])
        imported_count = 0
        
        for doc_data in documents:
            await self.ingest_document(
                db=db,
                title=doc_data["title"],
                content=doc_data["content"],
                category=doc_data.get("category"),
                source=doc_data.get("source"),
                metadata=doc_data.get("metadata"),
                user_id=str(user_id) if user_id else None
            )
            imported_count += 1
        
        print(f"[OK] Imported {imported_count} documents")
        return imported_count
    
    async def get_statistics(self, db: AsyncSession) -> Dict[str, Any]:
        """Get knowledge base statistics."""
        all_docs = await self.get_all_documents(db, active_only=False)
        active_docs = [d for d in all_docs if d.is_active]
        
        categories = {}
        for doc in active_docs:
            cat = doc.category or "uncategorized"
            categories[cat] = categories.get(cat, 0) + 1
        
        total_retrievals = sum(doc.retrieval_count for doc in active_docs)
        
        return {
            "total_documents": len(all_docs),
            "active_documents": len(active_docs),
            "inactive_documents": len(all_docs) - len(active_docs),
            "categories": categories,
            "total_retrievals": total_retrievals,
            "average_retrievals": total_retrievals / len(active_docs) if active_docs else 0,
            "vector_store_enabled": self.rag_service.vector_store is not None,
            "embeddings_enabled": self.rag_service.embeddings is not None
        }
