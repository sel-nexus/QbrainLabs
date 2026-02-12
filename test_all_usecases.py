import requests
import json

BASE_URL = "http://localhost:8000"

def test_all_usecases_endpoint():
    """Test the new /api/usecases/all/list endpoint"""
    
    print("Testing All Use Cases Endpoint...")
    print("=" * 50)
    
    login_url = f"{BASE_URL}/api/auth/login"
    login_data = {
        "username": "ramvi21@gmail.com",
        "password": "Ram@1234"
    }
    
    print("\n1. Logging in as facilitator...")
    try:
        login_response = requests.post(login_url, data=login_data)
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            print(f"✓ Login successful! Token: {token[:20]}...")
        else:
            print(f"✗ Login failed: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            return
    except Exception as e:
        print(f"✗ Login error: {e}")
        return
    
    print("\n2. Fetching all use cases...")
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        usecases_url = f"{BASE_URL}/api/usecases/all/list"
        response = requests.get(usecases_url, headers=headers)
        
        if response.status_code == 200:
            usecases = response.json()
            print(f"✓ Successfully fetched {len(usecases)} use cases")
            
            if usecases:
                print("\n3. Sample use cases:")
                print("-" * 50)
                
                workshop_map = {}
                for uc in usecases[:5]:
                    print(f"\nUse Case: {uc['title']}")
                    print(f"  Workshop: {uc['workshop']['title']}")
                    print(f"  Status: {uc['status']}")
                    print(f"  Description: {uc['description'][:80]}...")
                    
                    workshop_id = uc['workshop']['id']
                    if workshop_id not in workshop_map:
                        workshop_map[workshop_id] = []
                    workshop_map[workshop_id].append(uc['title'])
                
                print("\n4. Workshop Summary:")
                print("-" * 50)
                for workshop_id, use_case_titles in workshop_map.items():
                    workshop_title = next(uc['workshop']['title'] for uc in usecases if uc['workshop']['id'] == workshop_id)
                    print(f"\n{workshop_title}:")
                    for title in use_case_titles:
                        print(f"  - {title}")
                
                print("\n5. Use cases mapped to multiple workshops:")
                print("-" * 50)
                title_workshops = {}
                for uc in usecases:
                    title = uc['title']
                    workshop_title = uc['workshop']['title']
                    if title not in title_workshops:
                        title_workshops[title] = []
                    title_workshops[title].append(workshop_title)
                
                multi_workshop_cases = {k: v for k, v in title_workshops.items() if len(v) > 1}
                if multi_workshop_cases:
                    for title, workshops in multi_workshop_cases.items():
                        print(f"\n'{title}' appears in:")
                        for w in workshops:
                            print(f"  - {w}")
                else:
                    print("No use cases mapped to multiple workshops (each use case belongs to one workshop)")
                
            else:
                print("No use cases found in the system")
                
        else:
            print(f"✗ Failed to fetch use cases: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"✗ Error fetching use cases: {e}")

if __name__ == "__main__":
    test_all_usecases_endpoint()
