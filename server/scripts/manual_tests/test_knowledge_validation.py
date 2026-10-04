"""
Test script for Knowledge Validation with Perplexity API
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.rag_service import rag_service
from app.core.config import settings

async def test_perplexity_validation():
    """Test knowledge validation using Perplexity API"""
    
    print("\n" + "="*80)
    print("TESTING KNOWLEDGE VALIDATION WITH PERPLEXITY API")
    print("="*80 + "\n")
    
    # Test article about AI
    test_article_title = "The Impact of Large Language Models on Enterprise AI Adoption"
    test_article_content = """
    Large Language Models (LLMs) like GPT-4 and Claude have revolutionized how enterprises 
    approach AI adoption. Recent studies show that companies implementing LLMs have seen 
    productivity gains of 30-40% in knowledge work tasks.
    
    Key findings:
    1. LLMs reduce time spent on routine documentation by 50%
    2. Customer service automation has improved by 60% with LLM-powered chatbots
    3. Code generation tools using LLMs increase developer productivity by 35%
    
    However, challenges remain:
    - Data privacy and security concerns
    - High computational costs
    - Need for human oversight and validation
    
    Organizations that successfully integrate LLMs typically follow a phased approach,
    starting with low-risk use cases and gradually expanding to more critical applications.
    """
    
    # Load env vars explicitly to be sure
    from dotenv import load_dotenv
    load_dotenv()
    
    # Get provider from environment
    provider = os.getenv("RESEARCH_API_PROVIDER", "llm_only")
    perplexity_key = os.getenv("PERPLEXITY_API_KEY", "").strip('"')
    
    print(f"Configuration Debug:")
    print(f"  RESEARCH_API_PROVIDER (env): {provider}")
    print(f"  PERPLEXITY_API_KEY (env): {'Found' if perplexity_key else 'Missing'} ({len(perplexity_key) if perplexity_key else 0} chars)")
    print(f"  RAG Service Mock Mode: {rag_service.mock_mode}")
    print(f"  RAG Service API Key present: {bool(rag_service.api_key)}")
    print(f"  RAG Service Azure Base present: {bool(rag_service.azure_api_key)}")
    
    # Force mock mode off for this test if we have credentials
    if rag_service.mock_mode and perplexity_key:
        print("  WARNING: RAG Service is in Mock Mode but we want to test Perplexity. Forcing Mock Mode OFF locally.")
        rag_service.mock_mode = False
        
    print("\n" + "-"*80 + "\n")
    
    print(f"Testing article: {test_article_title}\n")
    
    try:
        # Test validation
        print("Calling validate_against_research()...")
        result = await rag_service.validate_against_research(
            article_title=test_article_title,
            article_content=test_article_content,
            provider=provider
        )
        
        print("\n" + "="*80)
        print("VALIDATION RESULTS")
        print("="*80 + "\n")
        
        print(f"Validation Score: {result.get('validation_score', 0)}/100")
        print(f"Provider Used: {result.get('provider', 'unknown')}")
        print(f"Is Mock: {result.get('is_mock', False)}")
        print(f"\nNotes:\n{result.get('notes', 'No notes')}")
        
        print(f"\nSources Found: {len(result.get('sources', []))}")
        for i, source in enumerate(result.get('sources', []), 1):
            print(f"\n  {i}. {source.get('source', 'Unknown')}")
            print(f"     Relevance: {source.get('relevance', 'N/A')}")
            if 'url' in source:
                print(f"     URL: {source.get('url', 'N/A')}")
            if 'finding' in source:
                print(f"     Finding: {source.get('finding', 'N/A')}")
        
        print("\n" + "="*80)
        print("TEST COMPLETED SUCCESSFULLY")
        print("="*80 + "\n")
        
        return result
        
    except Exception as e:
        print(f"\n[ERROR]: {e}")
        import traceback
        traceback.print_exc()
        return None

async def test_knowledge_import():
    """Test full knowledge import workflow"""
    
    print("\n" + "="*80)
    print("TESTING FULL KNOWLEDGE IMPORT WORKFLOW")
    print("="*80 + "\n")
    
    test_article_title = "AI-Powered Customer Service Automation"
    test_article_content = """
    AI-powered customer service automation is transforming how businesses interact with customers.
    Modern chatbots and virtual assistants can handle 70-80% of routine customer inquiries without
    human intervention, leading to significant cost savings and improved customer satisfaction.
    
    Key technologies:
    - Natural Language Processing (NLP)
    - Machine Learning for intent classification
    - Integration with CRM systems
    - Sentiment analysis
    
    Benefits:
    - 24/7 availability
    - Instant response times
    - Consistent service quality
    - Reduced operational costs
    
    Implementation best practices:
    1. Start with FAQ automation
    2. Gradually expand to more complex queries
    3. Maintain human escalation paths
    4. Continuously train on real interactions
    """
    
    try:
        print(f"Importing article: {test_article_title}\n")
        
        # Test import
        import_result = await rag_service.import_knowledge_article(
            content=test_article_content,
            title=test_article_title,
            source_type="txt",
            metadata={"test": True}
        )
        
        print("\n" + "="*80)
        print("IMPORT RESULTS")
        print("="*80 + "\n")
        
        print(f"Embedding ID: {import_result.get('embedding_id', 'N/A')}")
        print(f"\nSummary:\n{import_result.get('summary', 'No summary')}")
        
        print("\n" + "="*80)
        print("IMPORT TEST COMPLETED")
        print("="*80 + "\n")
        
        return import_result
        
    except Exception as e:
        print(f"\n[ERROR]: {e}")
        import traceback
        traceback.print_exc()
        return None

async def test_trending_use_cases():
    """Test finding trending use cases"""
    
    print("\n" + "="*80)
    print("TESTING TRENDING USE CASES (KNOWLEDGE REFRESH)")
    print("="*80 + "\n")
    
    try:
        industry = "Healthcare"
        print(f"Finding trending use cases for: {industry}\n")
        
        # Test find_trending_use_cases
        results = await rag_service.find_trending_use_cases(
            industry=industry,
            count=3
        )
        
        print("\n" + "="*80)
        print("TRENDING RESULTS")
        print("="*80 + "\n")
        
        print(f"Found {len(results)} use cases for {industry}")
        for i, uc in enumerate(results, 1):
            print(f"\n  {i}. {uc.get('title', 'Unknown')}")
            print(f"     Category: {uc.get('category', 'N/A')}")
            print(f"     ROI: {uc.get('typical_roi', 'N/A')}")
            print(f"     Trending: {uc.get('is_trending', False)}")
            
        print("\n" + "="*80)
        print("TRENDING TEST COMPLETED")
        print("="*80 + "\n")
        
    except Exception as e:
        print(f"\n[ERROR]: {e}")
        import traceback
        traceback.print_exc()

async def main():
    print("\n[START] Starting Knowledge Validation Tests...\n")
    
    # Run validation test
    await test_perplexity_validation()
    
    # Run import test
    await test_knowledge_import()
    
    # Run trending test
    await test_trending_use_cases()

    # Run deletion test
    await test_knowledge_deletion()
    
    print("\n[DONE] All tests completed!\n")

async def test_knowledge_deletion():
    """Test knowledge article deletion logic"""
    print("\n" + "="*80)
    print("TESTING KNOWLEDGE DELETION")
    print("="*80 + "\n")
    
    try:
        # 1. Create content
        title = "Temporary Deletion Test Article"
        content = "This is a temporary article that should be deleted. " * 20
        
        # 2. Import it
        print("Importing temporary article...")
        import_result = await rag_service.import_knowledge_article(
            content=content,
            title=title,
            source_type="test"
        )
        embedding_id = import_result.get('embedding_id')
        print(f"Imported article. Embedding ID: {embedding_id}")
        
        if not embedding_id and not rag_service.mock_mode:
            print("[WARN] No embedding ID returned. Vector store might be disabled.")
            
        # 3. Delete it
        print("Deleting article...")
        success = await rag_service.delete_knowledge_article(embedding_id)
        
        if success:
            print("[SUCCESS] Article deletion reported success")
        else:
            print("[ERROR] Article deletion reported failure")
            
        print("\n" + "="*80)
        print("DELETION TEST COMPLETED")
        print("="*80 + "\n")
        
    except Exception as e:
        print(f"\n[ERROR]: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
