import requests
import json
import sys

BASE_URL = "http://localhost:8000"
EMAIL = "admin@qbrainlabs.com"
PASSWORD = "Admin123!"

def login():
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": EMAIL, "password": PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        else:
            print(f"Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"Login error: {e}")
        return None

def test_add_use_case(token):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "title": "Test Use Case Automated Verification",
        "description": "This is a test use case added by the verification script.",
        "industry_id": "it",
        "category": "Process Automation",
        "complexity": "Low",
        "typical_roi": "100%",
        "implementation_time": "1 month",
        "technologies": ["Python", "API"]
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/knowledge-base/add",
            headers=headers,
            json=payload
        )
        
        if response.status_code == 200:
            print("Successfully added use case!")
            print(json.dumps(response.json(), indent=2))
            return True
        else:
            print(f"Add use case failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"Add use case error: {e}")
        return False

def verify_persistence(token, use_case_title):
    try:
        # Check industry details 
        response = requests.get(
            f"{BASE_URL}/api/knowledge-base/industries/it",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            industry_data = response.json()
            found = False
            for uc in industry_data["use_cases"]:
                if uc["title"] == use_case_title:
                    found = True
                    break
            
            if found:
                print(f"Verification successful: '{use_case_title}' found in industry data.")
                return True
            else:
                print(f"Verification failed: '{use_case_title}' NOT found in industry data.")
                return False
        else:
            print(f"Get industry failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"Verify persistence error: {e}")
        return False

if __name__ == "__main__":
    print("Starting verification...")
    token = login()
    if token:
        print("Logged in successfully.")
        if test_add_use_case(token):
            if verify_persistence(token, "Test Use Case Automated Verification"):
                print("ALL CHECKS PASSED")
            else:
                print("Persistence check failed")
        else:
            print("Add use case check failed")
    else:
        print("Skipping tests due to login failure")
