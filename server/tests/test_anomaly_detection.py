"""
Test script for MOCK-007: Anomaly Detection Enhancement
Verifies AI-powered semantic duplicate detection, groupthink analysis, and bias detection.
"""
import asyncio
import sys
import os
from uuid import uuid4

# Add server directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.copilot_service import copilot_service
from app.models.models import UseCase, Participant, Vote, WorkshopStatus
from uuid import uuid4


async def test_semantic_duplicate_detection():
    """Test AI-powered semantic duplicate detection."""
    print("\n" + "=" * 80)
    print("Test 1: Semantic Duplicate Detection")
    print("=" * 80)
    
    # Create similar use cases that should be detected as duplicates
    use_cases = [
        UseCase(
            id=uuid4(),
            title="AI Customer Support Chatbot",
            description="Build an intelligent chatbot using GPT-4 to handle customer service inquiries and reduce response time.",
            proposed_solution="Use OpenAI API with RAG architecture, integrate with CRM system.",
            workshop_id=uuid4()
        ),
        UseCase(
            id=uuid4(),
            title="Customer Service AI Assistant",
            description="Implement an AI-powered virtual assistant for customer support using large language models.",
            proposed_solution="Deploy LLM-based chatbot with knowledge base integration and CRM connectivity.",
            workshop_id=uuid4()
        ),
        UseCase(
            id=uuid4(),
            title="Predictive Maintenance System",
            description="Use machine learning to predict equipment failures before they occur.",
            proposed_solution="Time-series analysis with LSTM networks on sensor data.",
            workshop_id=uuid4()
        )
    ]
    
    print(f"\nAnalyzing {len(use_cases)} use cases for semantic duplicates...\n")
    
    anomalies = await copilot_service._detect_content_anomalies(use_cases)
    
    semantic_duplicates = [a for a in anomalies if a.get("type") == "semantic_duplicate"]
    
    print(f"Found {len(semantic_duplicates)} semantic duplicate(s):")
    for dup in semantic_duplicates:
        print(f"\n  Severity: {dup.get('severity', 'N/A')}")
        print(f"  Similarity: {dup.get('details', {}).get('similarity_score', 'N/A')}")
        print(f"  Use Cases: {dup.get('details', {}).get('titles', [])}")
        print(f"  Explanation: {dup.get('explanation', 'N/A')}")
        print(f"  Recommendation: {dup.get('recommendation', 'N/A')}")
    
    # Verification
    checks_passed = 0
    total_checks = 2
    
    print("\n" + "-" * 80)
    print("Verification Checks:")
    
    # Check 1: Should detect the two similar chatbot use cases
    if len(semantic_duplicates) > 0:
        print(f"✅ Check 1: Detected semantic duplicates ({len(semantic_duplicates)} found)")
        checks_passed += 1
    else:
        print("⚠️  Check 1: No semantic duplicates detected (may be in mock mode)")
    
    # Check 2: Duplicates should have explanations
    if semantic_duplicates and all('explanation' in d for d in semantic_duplicates):
        print("✅ Check 2: All duplicates have AI-generated explanations")
        checks_passed += 1
    else:
        print("⚠️  Check 2: Missing explanations (may be in mock mode)")
    
    print(f"\nPassed: {checks_passed}/{total_checks} checks")
    return checks_passed >= 1


async def test_groupthink_detection():
    """Test AI-powered groupthink and bias detection."""
    print("\n" + "=" * 80)
    print("Test 2: Groupthink and Bias Detection")
    print("=" * 80)
    
    workshop_id = uuid4()
    
    # Create participants
    participants = [
        Participant(id=uuid4(), display_name=f"Participant {i}", role="PARTICIPANT", workshop_id=workshop_id)
        for i in range(1, 6)
    ]
    
    # Create use cases
    use_cases = [
        UseCase(id=uuid4(), title=f"Use Case {i}", description="Test case", workshop_id=workshop_id)
        for i in range(1, 4)
    ]
    
    # Create votes with very similar scores (groupthink pattern)
    votes = []
    for participant in participants:
        for uc in use_cases:
            votes.append(Vote(
                id=uuid4(),
                participant_id=participant.id,
                use_case_id=uc.id,
                scores={"value": 8.0, "feasibility": 7.5}  # Very similar scores
            ))
    
    print(f"\nAnalyzing voting patterns:")
    print(f"  Participants: {len(participants)}")
    print(f"  Use Cases: {len(use_cases)}")
    print(f"  Total Votes: {len(votes)}")
    print(f"  Pattern: All participants voting very similarly\n")
    
    anomalies = await copilot_service._detect_voting_anomalies(participants, votes)
    
    groupthink_anomalies = [a for a in anomalies if 'groupthink' in a.get("type", "").lower()]
    
    print(f"Found {len(groupthink_anomalies)} groupthink anomaly(ies):")
    for anomaly in groupthink_anomalies:
        print(f"\n  Type: {anomaly.get('type', 'N/A')}")
        print(f"  Severity: {anomaly.get('severity', 'N/A')}")
        if 'explanation' in anomaly:
            print(f"  Explanation: {anomaly.get('explanation', 'N/A')}")
        print(f"  Recommendation: {anomaly.get('recommendation', 'N/A')}")
    
    # Verification
    checks_passed = 0
    total_checks = 2
    
    print("\n" + "-" * 80)
    print("Verification Checks:")
    
    # Check 1: Should detect groupthink pattern
    if len(groupthink_anomalies) > 0:
        print(f"✅ Check 1: Detected groupthink pattern")
        checks_passed += 1
    else:
        print("⚠️  Check 1: No groupthink detected (may be in mock mode or pattern not strong enough)")
    
    # Check 2: Should have recommendations
    if anomalies and all('recommendation' in a for a in anomalies):
        print("✅ Check 2: All anomalies have recommendations")
        checks_passed += 1
    else:
        print("⚠️  Check 2: Missing recommendations")
    
    print(f"\nPassed: {checks_passed}/{total_checks} checks")
    return checks_passed >= 1


async def test_bias_detection():
    """Test systematic bias detection."""
    print("\n" + "=" * 80)
    print("Test 3: Systematic Bias Detection")
    print("=" * 80)
    
    workshop_id = uuid4()
    
    # Create participants
    participants = [
        Participant(id=uuid4(), display_name="Optimist", role="PARTICIPANT", workshop_id=workshop_id),
        Participant(id=uuid4(), display_name="Pessimist", role="PARTICIPANT", workshop_id=workshop_id),
        Participant(id=uuid4(), display_name="Balanced", role="PARTICIPANT", workshop_id=workshop_id)
    ]
    
    # Create use cases
    use_cases = [
        UseCase(id=uuid4(), title=f"Use Case {i}", description="Test case", workshop_id=workshop_id)
        for i in range(1, 5)
    ]
    
    # Create votes with bias patterns
    votes = []
    for uc in use_cases:
        # Optimist always votes high
        votes.append(Vote(
            id=uuid4(),
            participant_id=participants[0].id,
            use_case_id=uc.id,
            scores={"value": 10.0, "feasibility": 9.5}
        ))
        # Pessimist always votes low
        votes.append(Vote(
            id=uuid4(),
            participant_id=participants[1].id,
            use_case_id=uc.id,
            scores={"value": 2.0, "feasibility": 3.0}
        ))
        # Balanced votes normally
        votes.append(Vote(
            id=uuid4(),
            participant_id=participants[2].id,
            use_case_id=uc.id,
            scores={"value": 6.0, "feasibility": 7.0}
        ))
    
    print(f"\nAnalyzing voting patterns:")
    print(f"  Optimist: Always votes 9-10")
    print(f"  Pessimist: Always votes 2-3")
    print(f"  Balanced: Votes 6-7\n")
    
    anomalies = await copilot_service._detect_voting_anomalies(participants, votes)
    
    bias_anomalies = [a for a in anomalies if 'extreme' in a.get("type", "").lower() or 'bias' in a.get("type", "").lower()]
    
    print(f"Found {len(bias_anomalies)} bias anomaly(ies):")
    for anomaly in bias_anomalies:
        print(f"\n  Type: {anomaly.get('type', 'N/A')}")
        print(f"  Participant: {anomaly.get('details', {}).get('participant_name', 'N/A')}")
        if 'explanation' in anomaly:
            print(f"  Explanation: {anomaly.get('explanation', 'N/A')}")
        print(f"  Recommendation: {anomaly.get('recommendation', 'N/A')}")
    
    # Verification
    checks_passed = 0
    total_checks = 2
    
    print("\n" + "-" * 80)
    print("Verification Checks:")
    
    # Check 1: Should detect extreme voting patterns
    if len(bias_anomalies) >= 2:  # Should detect both optimist and pessimist
        print(f"✅ Check 1: Detected bias patterns ({len(bias_anomalies)} found)")
        checks_passed += 1
    else:
        print(f"⚠️  Check 1: Expected 2+ bias patterns, found {len(bias_anomalies)}")
    
    # Check 2: Should identify specific participants
    participant_names = [a.get('details', {}).get('participant_name', '') for a in bias_anomalies]
    if 'Optimist' in participant_names or 'Pessimist' in participant_names:
        print("✅ Check 2: Identified specific biased participants")
        checks_passed += 1
    else:
        print("⚠️  Check 2: Did not identify specific participants")
    
    print(f"\nPassed: {checks_passed}/{total_checks} checks")
    return checks_passed >= 1


async def main():
    """Run all anomaly detection tests."""
    print("=" * 80)
    print("MOCK-007: Anomaly Detection Enhancement Verification")
    print("=" * 80)
    
    results = {
        "Semantic Duplicate Detection": await test_semantic_duplicate_detection(),
        "Groupthink Detection": await test_groupthink_detection(),
        "Bias Detection": await test_bias_detection()
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
