import requests
import json
import sys
import urllib3

# Suppress InsecureRequestWarning
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
REFRESH_URL = f"{BASE_URL}/api/knowledge-base/refresh"
ADD_URL = f"{BASE_URL}/api/knowledge-base/add"

EMAIL = "admin@qbrainlabs.com"
PASSWORD = "Tcs@$2026"

def main():
    session = requests.Session()
    
    # 1. Login
    print(f"Logging in as {EMAIL}...")
    try:
        response = session.post(
            LOGIN_URL, 
            data={"username": EMAIL, "password": PASSWORD},
            verify=False
        )
        if response.status_code != 200:
            print(f"Login failed: {response.status_code} - {response.text}")
            return
        
        token_data = response.json()
        token = token_data["access_token"]
        print("Login successful.")
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
    except Exception as e:
        print(f"Login error: {e}")
        return

    # 2. Call Refresh
    print("\nRefreshing use cases for 'it' industry...")
    try:
        payload = {
            "provider": "perplexity",
            "industry_id": "it"
        }
        response = session.post(
            REFRESH_URL,
            headers=headers,
            json=payload,
            verify=False
        )
        
        if response.status_code != 200:
            print(f"Refresh failed: {response.status_code} - {response.text}")
            return
            
        results = response.json()
        print(f"Got {len(results)} results.")
        
        if not results:
            print("No results returned.")
            return
            
        first_item = results[0]
        print(f"First item industry: {first_item.get('industry')}")
        print(f"First item industry_name: {first_item.get('industry_name')}")
        
        if first_item.get('industry') != "it":
            print("FAIL: Industry ID mismatch in refresh results!")
            print(f"Expected 'it', got '{first_item.get('industry')}'")
            return
        else:
            print("PASS: Industry ID matches.")
            
    except Exception as e:
        print(f"Refresh error: {e}")
        return

    # 3. Add Use Case
    print(f"\nAdding use case: {first_item['title']}...")
    try:
        # Construct add payload from the item
        add_payload = {
            "title": first_item["title"],
            "description": first_item["description"],
            "industry_id": first_item["industry"], # This should be "it" now
            "category": first_item["category"],
            "complexity": first_item["complexity"],
            "typical_roi": first_item["typical_roi"],
            "implementation_time": "3-6 months",
            "technologies": ["AI"]
        }
        
        response = session.post(
            ADD_URL,
            headers=headers,
            json=add_payload,
            verify=False
        )
        
        if response.status_code != 200:
            print(f"Add failed: {response.status_code} - {response.text}")
            return
            
        added_item = response.json()
        print(f"Successfully added use case with ID: {added_item['id']}")
        print("PASS: Add use case succeeded.")
        
    except Exception as e:
         print(f"Add error: {e}")
         return

if __name__ == "__main__":
    main()
