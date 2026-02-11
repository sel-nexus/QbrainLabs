"""
Test script for MOCK-001: Real AI Complexity Analysis
Verifies enhanced complexity analysis with factors and confidence scores.
"""
import asyncio
import sys
import os

# Add server directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.roadmap_service import roadmap_service
from app.models.models import UseCase
from uuid import uuid4


async def test_complexity_analysis():
    """Test the enhanced analyze_complexity method."""
    
    print("=" * 80)
    print("MOCK-001 Verification: AI Complexity Analysis")
    print("=" * 80)
    
    # Create test use cases
    test_cases = [
        UseCase(
            id=uuid4(),
            title="Customer Service AI Chatbot",
            description="Build an AI-powered chatbot to handle customer inquiries using GPT-4. Integrate with existing CRM system and knowledge base.",
            proposed_solution="Use OpenAI API with RAG architecture, vector database for knowledge retrieval, and CRM API integration.",
            workshop_id=uuid4()
        ),
        UseCase(
            id=uuid4(),
            title="Predictive Maintenance System",
            description="Develop ML model to predict equipment failures based on sensor data. Requires real-time data processing and alerting.",
            proposed_solution="Time-series forecasting model using historical sensor data, deployed as microservice with real-time monitoring.",
            workshop_id=uuid4()
        ),
        UseCase(
            id=uuid4(),
            title="Simple Email Categorization",
            description="Automatically categorize incoming emails into predefined categories using basic NLP.",
            proposed_solution="Use pre-trained text classification model with simple rule-based post-processing.",
            workshop_id=uuid4()
        )
    ]
    
    print(f"\nAnalyzing {len(test_cases)} use cases...\n")
    
    # Run complexity analysis
    result = await roadmap_service.analyze_complexity(test_cases)
    
    # Display results
    print(f"Is Mock: {result.get('is_mock', 'Unknown')}")
    print(f"Average Complexity: {result.get('average_complexity', 'N/A')}")
    print(f"Total Complexity: {result.get('total_complexity', 'N/A')}")
    print("\n" + "-" * 80)
    
    # Display per-case analysis
    complexity_by_case = result.get('complexity_by_case', {})
    
    for uc in test_cases:
        uc_id = str(uc.id)
        if uc_id in complexity_by_case:
            case_data = complexity_by_case[uc_id]
            
            print(f"\nUse Case: {uc.title}")
            print(f"  Complexity Score: {case_data.get('score', 'N/A')}")
            
            if isinstance(case_data, dict):
                factors = case_data.get('factors', {})
                if factors:
                    print(f"  Factors:")
                    print(f"    - Data Availability: {factors.get('data_availability', 'N/A')}")
                    print(f"    - Technical Difficulty: {factors.get('technical_difficulty', 'N/A')}")
                    print(f"    - Integration Risk: {factors.get('integration_risk', 'N/A')}")
                
                confidence = case_data.get('confidence', 'N/A')
                print(f"  Confidence: {confidence}")
                
                reasoning = case_data.get('reasoning', 'N/A')
                print(f"  Reasoning: {reasoning}")
            else:
                # Old format (just a number)
                print(f"  [Legacy format - no detailed factors]")
    
    print("\n" + "=" * 80)
    
    # Verification checks
    print("\nVerification Checks:")
    checks_passed = 0
    total_checks = 0
    
    # Check 1: is_mock should be False if AI is available
    total_checks += 1
    if result.get('is_mock') == False:
        print("✅ Check 1: AI mode active (is_mock = False)")
        checks_passed += 1
    else:
        print("⚠️  Check 1: Running in mock mode (AI not available)")
    
    # Check 2: Complexity scores should be present
    total_checks += 1
    if complexity_by_case and len(complexity_by_case) == len(test_cases):
        print(f"✅ Check 2: All {len(test_cases)} use cases analyzed")
        checks_passed += 1
    else:
        print(f"❌ Check 2: Expected {len(test_cases)} analyses, got {len(complexity_by_case)}")
    
    # Check 3: Structured factors should be present (if not mock)
    total_checks += 1
    if not result.get('is_mock'):
        first_case = next(iter(complexity_by_case.values()), {})
        if isinstance(first_case, dict) and 'factors' in first_case:
            print("✅ Check 3: Structured complexity factors present")
            checks_passed += 1
        else:
            print("❌ Check 3: Structured factors missing")
    else:
        print("⏭️  Check 3: Skipped (mock mode)")
    
    # Check 4: Confidence scores should be present
    total_checks += 1
    if not result.get('is_mock'):
        first_case = next(iter(complexity_by_case.values()), {})
        if isinstance(first_case, dict) and 'confidence' in first_case:
            print("✅ Check 4: Confidence scores present")
            checks_passed += 1
        else:
            print("❌ Check 4: Confidence scores missing")
    else:
        print("⏭️  Check 4: Skipped (mock mode)")
    
    print(f"\nPassed: {checks_passed}/{total_checks} checks")
    print("=" * 80)
    
    return result


if __name__ == "__main__":
    asyncio.run(test_complexity_analysis())
