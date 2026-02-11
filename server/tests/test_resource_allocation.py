"""
Test script for MOCK-003: Intelligent Resource Allocation
Verifies AI-powered resource recommendations based on use case technical requirements.
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


async def test_resource_allocation():
    """Test intelligent resource allocation with different technology stacks."""
    
    print("=" * 80)
    print("MOCK-003 Verification: Intelligent Resource Allocation")
    print("=" * 80)
    
    # Test Case 1: GenAI/LLM Project
    genai_case = UseCase(
        id=uuid4(),
        title="AI Customer Support Chatbot",
        description="Build an intelligent chatbot using GPT-4 to handle customer service inquiries.",
        proposed_solution="Use OpenAI API with RAG architecture, vector database (Pinecone), integrate with CRM system using LangChain framework.",
        workshop_id=uuid4()
    )
    
    # Test Case 2: Computer Vision Project
    cv_case = UseCase(
        id=uuid4(),
        title="Quality Control Image Recognition",
        description="Automated defect detection in manufacturing using computer vision.",
        proposed_solution="Transfer learning with ResNet50, custom dataset of 10,000 labeled images, deployed on edge devices using OpenCV and YOLO.",
        workshop_id=uuid4()
    )
    
    # Test Case 3: Predictive ML Project
    ml_case = UseCase(
        id=uuid4(),
        title="Equipment Failure Prediction",
        description="Predict equipment failures 48 hours in advance using sensor data.",
        proposed_solution="Time-series forecasting with LSTM neural network, real-time data pipeline with Apache Kafka and Spark.",
        workshop_id=uuid4()
    )
    
    test_cases = [
        ("GenAI/LLM", [genai_case]),
        ("Computer Vision", [cv_case]),
        ("Predictive ML", [ml_case])
    ]
    
    constraints = RoadmapConstraints(start_date=date.today())
    options = RoadmapOptions(max_duration_weeks=20)
    
    results = {}
    
    for test_name, use_cases in test_cases:
        print(f"\n{'=' * 80}")
        print(f"Test: {test_name} Project")
        print(f"{'=' * 80}")
        print(f"Use Case: {use_cases[0].title}")
        print(f"Tech Stack: {use_cases[0].proposed_solution[:100]}...\n")
        
        # Generate timeline first
        timeline = await roadmap_service.generate_timeline(use_cases, constraints, options)
        
        # Calculate resources with use case analysis
        resources = await roadmap_service.calculate_resources(timeline, constraints, use_cases)
        
        print(f"Is Mock: {resources.get('is_mock', 'Unknown')}")
        print(f"Total FTE: {resources.get('total_fte', 'N/A')}")
        
        if 'technology_summary' in resources:
            print(f"Technology Summary: {resources['technology_summary']}\n")
        
        roles = resources.get('roles', [])
        print(f"Recommended Roles ({len(roles)}):")
        
        role_names = []
        for i, role in enumerate(roles, 1):
            role_name = role.get('role', 'Unknown')
            role_names.append(role_name)
            fte = role.get('fte', 0)
            skills = role.get('skills', [])
            justification = role.get('justification', '')
            
            print(f"\n  {i}. {role_name} ({fte} FTE)")
            print(f"     Skills: {', '.join(skills[:3])}")
            if len(skills) > 3:
                print(f"            ... and {len(skills) - 3} more")
            if justification:
                print(f"     Why: {justification[:100]}...")
        
        results[test_name] = {
            "role_names": role_names,
            "is_mock": resources.get('is_mock', True),
            "total_roles": len(roles),
            "has_tech_summary": 'technology_summary' in resources
        }
    
    # Verification Checks
    print("\n" + "=" * 80)
    print("Verification Checks")
    print("=" * 80)
    
    checks_passed = 0
    total_checks = 0
    
    # Check 1: Different tech stacks should have different roles
    total_checks += 1
    genai_roles = set(results["GenAI/LLM"]["role_names"])
    cv_roles = set(results["Computer Vision"]["role_names"])
    ml_roles = set(results["Predictive ML"]["role_names"])
    
    all_roles = genai_roles | cv_roles | ml_roles
    common_roles = genai_roles & cv_roles & ml_roles
    uniqueness_ratio = (len(all_roles) - len(common_roles)) / len(all_roles) if all_roles else 0
    
    if uniqueness_ratio > 0.3:  # At least 30% unique roles
        print(f"✅ Check 1: Role recommendations vary by technology ({uniqueness_ratio:.0%} unique)")
        checks_passed += 1
    else:
        print(f"⚠️  Check 1: Role recommendations too similar ({uniqueness_ratio:.0%} unique)")
    
    # Check 2: Roles should be technology-specific
    total_checks += 1
    generic_roles = ["developer", "engineer", "manager", "analyst"]
    
    specific_role_count = 0
    total_role_count = 0
    
    for test_name, result in results.items():
        for role_name in result["role_names"]:
            total_role_count += 1
            role_lower = role_name.lower()
            # Check if role has technology-specific keywords
            is_specific = any(tech in role_lower for tech in ["ml", "ai", "cv", "nlp", "prompt", "rag", "vision", "data scientist"])
            if is_specific:
                specific_role_count += 1
    
    specificity_ratio = specific_role_count / total_role_count if total_role_count else 0
    
    if specificity_ratio > 0.4:  # At least 40% technology-specific roles
        print(f"✅ Check 2: Roles are technology-specific ({specificity_ratio:.0%} specific)")
        checks_passed += 1
    else:
        print(f"⚠️  Check 2: Too many generic role names ({specificity_ratio:.0%} specific)")
    
    # Check 3: Should have technology summary (if AI active)
    total_checks += 1
    has_summaries = sum(1 for r in results.values() if r["has_tech_summary"])
    
    if has_summaries > 0:
        print(f"✅ Check 3: Technology summaries present ({has_summaries}/3)")
        checks_passed += 1
    else:
        print("⚠️  Check 3: No technology summaries (may be in mock mode)")
    
    # Check 4: Reasonable number of roles
    total_checks += 1
    role_counts_ok = all(3 <= result["total_roles"] <= 12 for result in results.values())
    
    if role_counts_ok:
        print("✅ Check 4: Role counts are reasonable (3-12 roles)")
        checks_passed += 1
    else:
        print("❌ Check 4: Role counts outside expected range")
    
    print(f"\nPassed: {checks_passed}/{total_checks} checks")
    print("=" * 80)
    
    return checks_passed >= 2  # Pass if at least half the checks pass


if __name__ == "__main__":
    asyncio.run(test_resource_allocation())
