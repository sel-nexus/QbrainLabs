"""
Test script to verify move and delete usecase functionality
Run this after the server is started to test the new endpoints
"""
import requests
import json

API_BASE = "http://localhost:8000"

def test_move_usecase(auth_token, usecase_id, target_industry):
    """Test moving a usecase to a different industry"""
    print(f"\n=== Testing Move Use Case ===")
    print(f"Use Case ID: {usecase_id}")
    print(f"Target Industry: {target_industry}")
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "usecase_id": usecase_id,
        "target_industry_id": target_industry,
        "create_industry": True
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/api/knowledge-base/move",
            headers=headers,
            json=payload,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ SUCCESS: {data.get('message')}")
            print(f"  Source: {data.get('source_industry')}")
            print(f"  Target: {data.get('target_industry')}")
            return True
        else:
            error = response.json()
            print(f"✗ FAILED: {error.get('detail', 'Unknown error')}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("✗ ERROR: Could not connect to server")
        return False
    except Exception as e:
        print(f"✗ ERROR: {str(e)}")
        return False


def test_delete_usecase(auth_token, usecase_id):
    """Test deleting a usecase from the knowledge base"""
    print(f"\n=== Testing Delete Use Case ===")
    print(f"Use Case ID: {usecase_id}")
    
    headers = {
        "Authorization": f"Bearer {auth_token}"
    }
    
    try:
        response = requests.delete(
            f"{API_BASE}/api/knowledge-base/usecases/{usecase_id}",
            headers=headers,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ SUCCESS: {data.get('message')}")
            print(f"  Industry: {data.get('industry')}")
            return True
        else:
            error = response.json()
            print(f"✗ FAILED: {error.get('detail', 'Unknown error')}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("✗ ERROR: Could not connect to server")
        return False
    except Exception as e:
        print(f"✗ ERROR: {str(e)}")
        return False


def list_industries(auth_token):
    """List all industries and their use case counts"""
    print("\n=== Current Industries ===")
    
    headers = {
        "Authorization": f"Bearer {auth_token}"
    }
    
    try:
        response = requests.get(
            f"{API_BASE}/api/knowledge-base/overview",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            for ind in data.get('industries', []):
                print(f"- {ind['name']} (ID: {ind['id']}) - {ind['use_case_count']} use cases")
            return data.get('industries', [])
        else:
            print("Failed to fetch industries")
            return []
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return []


if __name__ == "__main__":
    print("=" * 60)
    print("Knowledge Base Use Case Management Test")
    print("=" * 60)
    
    # You need to provide a valid auth token
    # Get this from localStorage in the browser: localStorage.getItem('hm_auth_token')
    auth_token = input("\nEnter your auth token (or press Enter to skip tests): ").strip()
    
    if not auth_token:
        print("\nNo auth token provided. Skipping API tests.")
        print("\nTo test manually:")
        print("1. Login to the admin panel")
        print("2. Go to Knowledge Base")
        print("3. Click on an industry, then a use case")
        print("4. You should see 'Move' and 'Delete' buttons")
        print("5. Test moving a use case to a different industry")
        print("6. Test deleting a use case")
    else:
        # List current industries
        industries = list_industries(auth_token)
        
        if industries:
            print("\nExample test commands:")
            print(f"- Move use case 'it-001' to 'Healthcare':")
            print(f"  test_move_usecase('{auth_token}', 'it-001', 'Healthcare')")
            print(f"\n- Delete use case 'it-001':")
            print(f"  test_delete_usecase('{auth_token}', 'it-001')")
            
            # You can uncomment these to run actual tests
            # test_move_usecase(auth_token, 'it-001', 'Healthcare')
            # test_delete_usecase(auth_token, 'it-001')
