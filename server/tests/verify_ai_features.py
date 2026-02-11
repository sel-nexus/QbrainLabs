
import sys
import os
import asyncio
import json
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

# Add server directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.main import app
from app.api.auth import get_current_user
from app.models.models import User

# Mock User and Auth
mock_user = User(
    id="12345678-1234-1234-1234-123456789012",
    email="test@example.com",
    is_active=True,
    is_admin_user=True
)

def override_get_current_user():
    return mock_user

app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

def test_analytics_benchmarks():
    print("\n[TEST] Analytics Benchmarks...")
    response = client.get("/api/analytics/benchmarks?industry=Technology")
    if response.status_code == 200:
        data = response.json()
        print(f"[PASS] Got benchmarks for {data['industry']}")
        print(f"       Metrics count: {len(data['metrics'])}")
    else:
        print(f"[FAIL] Status {response.status_code}: {response.text}")

def test_generate_report():
    print("\n[TEST] Generate Report...")
    payload = {
        "title": "Test AI Report",
        "report_type": "workshop_summary",
        "format": "pdf",
        "period_start": "2025-01-01",
        "period_end": "2025-01-31"
    }
    response = client.post("/api/analytics/reports/generate", json=payload)
    if response.status_code == 200:
        data = response.json()
        print(f"[PASS] Report generated: {data['file_url']}")
    else:
        print(f"[FAIL] Status {response.status_code}: {response.text}")

def test_estimate_roi():
    print("\n[TEST] Estimate ROI...")
    payload = {
        "title": "Automated Customer Support",
        "description": "Using AI to answer level 1 support tickets.",
        "industry": "Retail"
    }
    response = client.post("/api/ai/estimate-roi", json=payload)
    if response.status_code == 200:
        data = response.json()
        print(f"[PASS] ROI Estimated")
        print(f"       Implementation Cost: {data['estimates']['implementation']}")
        print(f"       Is Mock: {data['is_mock']}")
    else:
        print(f"[FAIL] Status {response.status_code}: {response.text}")

def test_generate_business_case():
    print("\n[TEST] Generate Business Case...")
    # Mock input based on ROI output
    payload = {
        "title": "Automated Customer Support",
        "description": "Using AI to answer level 1 support tickets.",
        "proposed_solution": "RAG via OpenAI",
        "roi_results": {
            "estimates": {
                "implementation": {"mid": 100000},
                "value": {"mid": 500000},
                "infrastructure": {"mid": 2000}
            },
            "roi_percent": 300,
            "payback_months": 6,
            "npv": 1000000,
            "benefit_levers": ["Labor Savings"]
        }
    }
    response = client.post("/api/ai/generate-business-case", json=payload)
    if response.status_code == 200:
        data = response.json()
        print(f"[PASS] Business Case Generated")
        print(f"       Executive Summary: {data['executive_summary'][:50]}...")
        print(f"       Is Mock: {data['is_mock']}")
    else:
        print(f"[FAIL] Status {response.status_code}: {response.text}")

if __name__ == "__main__":
    print("Running Verification Tests...")
    try:
        test_analytics_benchmarks()
        test_generate_report()
        test_estimate_roi()
        test_generate_business_case()
        print("\nVerification Complete!")
    except Exception as e:
        print(f"\n[ERROR] Verification Failed: {e}")
