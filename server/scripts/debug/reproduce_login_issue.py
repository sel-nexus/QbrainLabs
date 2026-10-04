import requests
import json
import uuid

BASE_URL = "http://localhost:8000"

def run_test():
    email = f"facilitator_{uuid.uuid4()}@example.com"
    password = "Password123!"
    
    print(f"Attempting to register facilitator: {email}")
    
    # 1. Register
    reg_payload = {
        "email": email,
        "password": password,
        "full_name": "Test Facilitator",
        "organization": "Test Org"
    }
    
    try:
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=reg_payload)
        print(f"Registration Status: {reg_response.status_code}")
        print(f"Registration Response: {reg_response.text}")
        
        if reg_response.status_code not in [200, 201]:
            print("Registration failed.")
            return

        # 2. Login
        print("\nAttempting to login...")
        login_payload = {
            "username": email,
            "password": password
        }
        
        login_response = requests.post(f"{BASE_URL}/api/auth/login", data=login_payload)
        print(f"Login Status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            print("Login successful!")
            token_data = login_response.json()
            print(f"Token received. Role: {token_data['user']['role']}")
        else:
            print(f"Login failed. Response: {login_response.text}")
            
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    run_test()
