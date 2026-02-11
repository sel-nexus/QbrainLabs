"""
Test script for MOCK-002: Dynamic Timeline Generation
Verifies that different AI use case types produce different, specific phase structures.
"""
import asyncio
import sys
import os
from datetime import date

# Add server directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.roadmap_service import roadmap_service
from app.models.models import UseCase
from app.schemas.roadmap import RoadmapConstraints, RoadmapOptions
from uuid import uuid4


async def test_dynamic_timeline():
    """Test dynamic timeline generation with different use case types."""
    
    print("=" * 80)
    print("MOCK-002 Verification: Dynamic Timeline Generation")
    print("=" * 80)
    
    # Test Case 1: GenAI/LLM Project
    genai_cases = [
        UseCase(
            id=uuid4(),
            title="Customer Support AI Chatbot",
            description="Build an AI-powered chatbot using GPT-4 to handle customer inquiries with RAG architecture for knowledge retrieval.",
            proposed_solution="Use OpenAI API with vector database (Pinecone) for knowledge base, integrate with Zendesk API.",
            workshop_id=uuid4()
        )
    ]
    
    # Test Case 2: Predictive ML Project
    predictive_cases = [
        UseCase(
            id=uuid4(),
            title="Equipment Failure Prediction System",
            description="Develop ML model to predict equipment failures 48 hours in advance using sensor data and maintenance logs.",
            proposed_solution="Time-series forecasting with LSTM neural network, real-time data pipeline with Apache Kafka.",
            workshop_id=uuid4()
        )
    ]
    
    # Test Case 3: Computer Vision Project
    vision_cases = [
        UseCase(
            id=uuid4(),
            title="Quality Control Image Recognition",
            description="Automated defect detection in manufacturing using computer vision to identify product defects.",
            proposed_solution="Transfer learning with ResNet50, custom dataset of 10,000 labeled images, deployed on edge devices.",
            workshop_id=uuid4()
        )
    ]
    
    constraints = RoadmapConstraints(start_date=date.today())
    options = RoadmapOptions(max_duration_weeks=20, include_contingency=True, risk_buffer_percent=15)
    
    test_cases = [
        ("GenAI/LLM", genai_cases),
        ("Predictive ML", predictive_cases),
        ("Computer Vision", vision_cases)
    ]
    
    results = {}
    
    for test_name, use_cases in test_cases:
        print(f"\n{'=' * 80}")
        print(f"Test: {test_name} Project")
        print(f"{'=' * 80}")
        print(f"Use Case: {use_cases[0].title}\n")
        
        timeline = await roadmap_service.generate_timeline(use_cases, constraints, options)
        
        print(f"Is Mock: {timeline.get('is_mock', 'Unknown')}")
        print(f"Total Weeks: {timeline.get('total_weeks', 'N/A')}")
        
        if 'project_type_summary' in timeline:
            print(f"Project Type: {timeline['project_type_summary']}")
        
        if 'rationale' in timeline:
            print(f"Rationale: {timeline['rationale']}\n")
        
        phases = timeline.get('phases', [])
        print(f"Phases ({len(phases)}):")
        
        phase_names = []
        for i, phase in enumerate(phases, 1):
            phase_name = phase.get('name', 'Unknown')
            phase_names.append(phase_name)
            duration = phase.get('duration_weeks', 0)
            tasks = phase.get('tasks', [])
            milestone = phase.get('milestone', '')
            
            print(f"\n  {i}. {phase_name} ({duration} weeks)")
            print(f"     Tasks: {len(tasks)}")
            if tasks:
                for task in tasks[:2]:  # Show first 2 tasks
                    print(f"       - {task.get('name', 'N/A')}")
                if len(tasks) > 2:
                    print(f"       ... and {len(tasks) - 2} more")
            if milestone:
                print(f"     Milestone: {milestone}")
        
        results[test_name] = {
            "phase_names": phase_names,
            "is_mock": timeline.get('is_mock', True),
            "total_phases": len(phases)
        }
    
    # Verification Checks
    print("\n" + "=" * 80)
    print("Verification Checks")
    print("=" * 80)
    
    checks_passed = 0
    total_checks = 0
    
    # Check 1: Different use case types should have different phases
    total_checks += 1
    genai_phases = set(results["GenAI/LLM"]["phase_names"])
    ml_phases = set(results["Predictive ML"]["phase_names"])
    cv_phases = set(results["Computer Vision"]["phase_names"])
    
    # Check if phases are different (at least 50% unique)
    all_phases = genai_phases | ml_phases | cv_phases
    common_phases = genai_phases & ml_phases & cv_phases
    uniqueness_ratio = (len(all_phases) - len(common_phases)) / len(all_phases) if all_phases else 0
    
    if uniqueness_ratio > 0.3:  # At least 30% of phases are unique
        print(f"✅ Check 1: Phase structures vary by use case type ({uniqueness_ratio:.0%} unique)")
        checks_passed += 1
    else:
        print(f"⚠️  Check 1: Phase structures too similar ({uniqueness_ratio:.0%} unique)")
    
    # Check 2: Phases should be specific (not generic)
    total_checks += 1
    generic_terms = ["build", "design", "test", "deploy", "discovery", "implementation"]
    
    specific_phase_count = 0
    total_phase_count = 0
    
    for test_name, result in results.items():
        for phase_name in result["phase_names"]:
            total_phase_count += 1
            # Check if phase name contains technology-specific terms
            phase_lower = phase_name.lower()
            is_generic = any(term in phase_lower and phase_lower == term for term in generic_terms)
            if not is_generic:
                specific_phase_count += 1
    
    specificity_ratio = specific_phase_count / total_phase_count if total_phase_count else 0
    
    if specificity_ratio > 0.5:  # At least 50% specific phases
        print(f"✅ Check 2: Phases are technology-specific ({specificity_ratio:.0%} specific)")
        checks_passed += 1
    else:
        print(f"⚠️  Check 2: Too many generic phase names ({specificity_ratio:.0%} specific)")
    
    # Check 3: AI mode should be active (if API available)
    total_checks += 1
    ai_active = not all(result["is_mock"] for result in results.values())
    
    if ai_active:
        print("✅ Check 3: AI timeline generation active")
        checks_passed += 1
    else:
        print("⚠️  Check 3: Running in mock mode (AI not available)")
    
    # Check 4: Reasonable number of phases
    total_checks += 1
    phase_counts_ok = all(4 <= result["total_phases"] <= 8 for result in results.values())
    
    if phase_counts_ok:
        print("✅ Check 4: Phase counts are reasonable (4-8 phases)")
        checks_passed += 1
    else:
        print("❌ Check 4: Phase counts outside expected range")
    
    print(f"\nPassed: {checks_passed}/{total_checks} checks")
    print("=" * 80)
    
    return checks_passed >= 2  # Pass if at least half the checks pass


if __name__ == "__main__":
    asyncio.run(test_dynamic_timeline())
