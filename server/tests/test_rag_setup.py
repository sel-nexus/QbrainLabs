import sys
import os

# Add server directory to path
sys.path.append(os.getcwd())

from app.services.rag_service import rag_service

print(f"RAG Service Initialized.")
print(f"Mock Mode: {rag_service.mock_mode}")

if rag_service.vector_store:
    print("Vector Store successfully initialized.")
    # Test query
    docs = rag_service.vector_store.similarity_search("invoice", k=1)
    print(f"Test Retrieval: Found {len(docs)} docs")
    print(f"Top Doc: {docs[0].page_content}")
else:
    print("Vector Store NOT initialized (Expected if no API Key).")
