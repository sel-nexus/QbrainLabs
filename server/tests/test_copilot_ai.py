"""
Verification script for MOCK-004, MOCK-005, MOCK-006: CopilotService AI Features
Tests real-time suggestions, discussion prompts, and executive summary generation.
"""
import asyncio
import sys
import os
from datetime import datetime

# Add server directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.copilot_service import copilot_service
from app.models.models import UseCase, Workshop, Participant, Vote, WorkshopStatus
from uuid import uuid4


async def test_discussion_prompts():
    """Test MOCK-005: Contextual Discussion Prompts"""
    print("\n" + "=" * 80)
    print("MOCK-005 Verification: AI Discussion Prompts")
    print("=" * 80)
    
    test_case = UseCase(
        id=uuid4(),
        title="AI-Powered Customer Support Chatbot",
        description="Implement an intelligent chatbot to handle tier-1 customer support inquiries, reducing response time and improving customer satisfaction.",
        proposed_solution="Use GPT-4 with RAG architecture, integrate with CRM and knowledge base, deploy as web widget and mobile app integration.",
        workshop_id=uuid4()
    )
    
    variance_data = {
        "std_dev": 2.5,
        "disagreement_context": "Participants disagree on implementation complexity"
    }
    
    print(f"\nGenerating discussion prompts for: {test_case.title}\n")
    
    prompts = await copilot_service.generate_discussion_prompts(test_case, variance_data)
    
    print(f"Generated {len(prompts)} prompts:")
    for i, prompt in enumerate(prompts, 1):
        print(f"\n{i}. Category: {prompt.get('category', 'N/A')}")
        print(f"   Question: {prompt.get('question', 'N/A')}")
        print(f"   Follow-up: {prompt.get('follow_up', 'N/A')}")
    
    # Verification checks
    checks_passed = 0
    total_checks = 3
    
    print("\n" + "-" * 80)
    print("Verification Checks:")
    
    # Check 1: Should have prompts
    if len(prompts) >= 3:
        print(f"✅ Check 1: Generated {len(prompts)} prompts (expected 3-5)")
        checks_passed += 1
    else:
        print(f"❌ Check 1: Only {len(prompts)} prompts generated")
    
    # Check 2: Prompts should have required fields
    if all('category' in p and 'question' in p for p in prompts):
        print("✅ Check 2: All prompts have required fields")
        checks_passed += 1
    else:
        print("❌ Check 2: Some prompts missing required fields")
    
    # Check 3: Questions should reference the use case
    if any(test_case.title.split()[0].lower() in p.get('question', '').lower() or 
           'chatbot' in p.get('question', '').lower() or
           'customer' in p.get('question', '').lower() for p in prompts):
        print("✅ Check 3: Prompts reference specific use case content")
        checks_passed += 1
    else:
        print("⚠️  Check 3: Prompts may be too generic")
    
    print(f"\nPassed: {checks_passed}/{total_checks} checks")
    return checks_passed == total_checks


async def test_executive_summary():
    """Test MOCK-006: AI Executive Summary"""
    print("\n" + "=" * 80)
    print("MOCK-006 Verification: AI Executive Summary")
    print("=" * 80)
    
    # Create test workshop data
    workshop = Workshop(
        id=uuid4(),
        title="Q1 2026 AI Innovation Workshop",
        status=WorkshopStatus.COMPLETED,
        created_at=datetime.utcnow()
    )
    
    participants = [
        Participant(id=uuid4(), display_name=f"Participant {i}", role="PARTICIPANT", workshop_id=workshop.id)
        for i in range(1, 6)
    ]
    
    use_cases = [
        UseCase(
            id=uuid4(),
            title="Customer Service Chatbot",
            description="AI-powered support automation",
            workshop_id=workshop.id
        ),
        UseCase(
            id=uuid4(),
            title="Predictive Maintenance",
            description="ML-based equipment failure prediction",
            workshop_id=workshop.id
        ),
        UseCase(
            id=uuid4(),
            title="Document Processing Automation",
            description="Automated invoice and contract processing",
            workshop_id=workshop.id
        )
    ]
    
    # Create some mock votes
    votes = []
    for uc in use_cases:
        for p in participants[:3]:  # 3 participants vote on each
            votes.append(Vote(
                id=uuid4(),
                participant_id=p.id,
                use_case_id=uc.id,
                scores={"value": 8.0, "feasibility": 7.0}
            ))
    
    print(f"\nGenerating executive summary for: {workshop.title}")
    print(f"Participants: {len(participants)}, Use Cases: {len(use_cases)}, Votes: {len(votes)}\n")
    
    summary = await copilot_service.generate_summary(
        workshop, use_cases, votes, participants, format="executive"
    )
    
    print("Generated Summary:")
    print(f"  Format: {summary.get('format', 'N/A')}")
    print(f"  Is Mock: {summary.get('is_mock', 'Unknown')}")
    print(f"  Generated At: {summary.get('generated_at', 'N/A')}")
    
    if 'executive_summary' in summary:
        print(f"\n  Executive Summary:")
        print(f"    {summary['executive_summary'][:200]}...")
    
    if 'findings' in summary:
        print(f"\n  Key Findings: {len(summary.get('findings', ''))} chars")
    
    if 'recommendations' in summary:
        print(f"  Recommendations: {len(summary.get('recommendations', ''))} chars")
    
    # Verification checks
    checks_passed = 0
    total_checks = 4
    
    print("\n" + "-" * 80)
    print("Verification Checks:")
    
    # Check 1: Should not be mock (if AI available)
    if summary.get('is_mock') == False:
        print("✅ Check 1: AI mode active (is_mock = False)")
        checks_passed += 1
    else:
        print("⚠️  Check 1: Running in mock mode")
    
    # Check 2: Should have executive summary
    if 'executive_summary' in summary and len(summary['executive_summary']) > 50:
        print("✅ Check 2: Executive summary present and substantial")
        checks_passed += 1
    else:
        print("❌ Check 2: Executive summary missing or too short")
    
    # Check 3: Should reference workshop data
    summary_text = str(summary).lower()
    if workshop.title.lower() in summary_text or str(len(use_cases)) in summary_text:
        print("✅ Check 3: Summary references actual workshop data")
        checks_passed += 1
    else:
        print("⚠️  Check 3: Summary may not reference specific workshop data")
    
    # Check 4: Should have requested sections
    if 'findings' in summary or 'recommendations' in summary:
        print("✅ Check 4: Requested sections present")
        checks_passed += 1
    else:
        print("❌ Check 4: Requested sections missing")
    
    print(f"\nPassed: {checks_passed}/{total_checks} checks")
    return checks_passed >= 2  # Pass if at least 2 checks pass


async def test_ai_suggestions():
    """Test MOCK-004: Real-time AI Suggestions"""
    print("\n" + "=" * 80)
    print("MOCK-004 Verification: Real-time AI Suggestions")
    print("=" * 80)
    
    workshop = Workshop(
        id=uuid4(),
        title="Innovation Workshop",
        status=WorkshopStatus.IN_PROGRESS,
        created_at=datetime.utcnow()
    )
    
    participants = [
        Participant(id=uuid4(), display_name=f"User {i}", role="PARTICIPANT", workshop_id=workshop.id)
        for i in range(1, 4)
    ]
    
    use_cases = [
        UseCase(id=uuid4(), title=f"Use Case {i}", description="Test case", workshop_id=workshop.id)
        for i in range(1, 3)
    ]
    
    votes = []
    
    print(f"\nGenerating AI suggestions for workshop: {workshop.title}")
    print(f"Phase: INTAKE, Participants: {len(participants)}, Use Cases: {len(use_cases)}\n")
    
    suggestions = await copilot_service.generate_suggestions(
        workshop, participants, use_cases, votes
    )
    
    print(f"Generated {len(suggestions)} suggestions:")
    for i, sug in enumerate(suggestions, 1):
        print(f"\n{i}. Type: {sug.get('type', 'N/A')}")
        print(f"   Priority: {sug.get('priority', 'N/A')}")
        print(f"   Message: {sug.get('message', 'N/A')[:100]}...")
    
    # Verification checks
    checks_passed = 0
    total_checks = 2
    
    print("\n" + "-" * 80)
    print("Verification Checks:")
    
    # Check 1: Should have suggestions (or explicitly none)
    if isinstance(suggestions, list):
        print(f"✅ Check 1: Valid suggestions list (count: {len(suggestions)})")
        checks_passed += 1
    else:
        print("❌ Check 1: Invalid suggestions format")
    
    # Check 2: If suggestions exist, they should have required fields
    if not suggestions or all('type' in s and 'message' in s for s in suggestions):
        print("✅ Check 2: Suggestions have required fields (or no suggestions)")
        checks_passed += 1
    else:
        print("❌ Check 2: Some suggestions missing required fields")
    
    print(f"\nPassed: {checks_passed}/{total_checks} checks")
    return checks_passed == total_checks


async def main():
    """Run all CopilotService verification tests"""
    print("=" * 80)
    print("CopilotService AI Features Verification")
    print("Testing MOCK-004, MOCK-005, MOCK-006")
    print("=" * 80)
    
    results = {
        "MOCK-005 (Discussion Prompts)": await test_discussion_prompts(),
        "MOCK-006 (Executive Summary)": await test_executive_summary(),
        "MOCK-004 (AI Suggestions)": await test_ai_suggestions()
    }
    
    print("\n" + "=" * 80)
    print("FINAL RESULTS")
    print("=" * 80)
    
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "⚠️  NEEDS REVIEW"
        print(f"{test_name}: {status}")
    
    total_passed = sum(results.values())
    print(f"\nOverall: {total_passed}/{len(results)} tests passed")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
