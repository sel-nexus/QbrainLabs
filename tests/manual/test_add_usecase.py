"""
Test script to verify the add usecase endpoint works correctly
"""
import requests
import json

API_BASE = "http://localhost:8000"

# Test data - simulating what the frontend sends
test_usecase = {
    "title": "AI-Powered Personalized Inquiry Routing",
    "description": "Generate AI-analysis-based, investor-performance, inquiry, and real-time conversational interfaces. These core trends autonomously re-allocate resources for higher conversion and direct headings (7/31).",
    "industry_id": "General",  # This might not match any industry ID
    "category": "Agentic AI",
    "complexity": "High",
    "typical_roi": "30-50% Efficiency Gain",
    "implementation_time": "3-6 months",
    "technologies": []
}

def test_add_usecase():
    """Test adding a usecase to the knowledge base"""
    
    # First, get auth token (you'll need to replace this with actual auth)
    print("Testing add usecase endpoint...")
    print(f"Request data: {json.dumps(test_usecase, indent=2)}")
    
    # Note: You'll need to add authentication header
    headers = {
        "Content-Type": "application/json",
        # "Authorization": "Bearer YOUR_TOKEN_HERE"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/api/knowledge-base/add",
            headers=headers,
            json=test_usecase,
            timeout=10
        )
        
        print(f"\nResponse status: {response.status_code}")
        print(f"Response body: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("\n✓ SUCCESS: Usecase added successfully!")
        else:
            print(f"\n✗ FAILED: {response.json().get('detail', 'Unknown error')}")
            
    except requests.exceptions.ConnectionError:
        print("\n✗ ERROR: Could not connect to server. Make sure the backend is running.")
    except Exception as e:
        print(f"\n✗ ERROR: {str(e)}")

if __name__ == "__main__":
    test_add_usecase()
