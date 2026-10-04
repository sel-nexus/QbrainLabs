import requests
import sys

BASE_URL = "http://localhost:8000"

def run_test():
    # 1. Login to get token (using the user created in previous script if possible, or create new)
    # Since I don't know the password of the user created in previous run (it was random email), 
    # I'll create a new one.
    import uuid
    email = f"facilitator_{uuid.uuid4()}@example.com"
    password = "Password123!"
    
    print(f"Registering/Logging in as: {email}")
    requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Test Facilitator",
        "organization": "Test Org"
    })
    
    login_response = requests.post(f"{BASE_URL}/api/auth/login", data={
        "username": email,
        "password": password
    })
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.text}")
        return

    token = login_response.json()["access_token"]
    print(f"Token received.")

    # 2. Access dashboard endpoint
    print("Accessing /api/facilitator/workshops...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/api/facilitator/workshops", headers=headers)
    
    print(f"Dashboard Status: {resp.status_code}")
    print(f"Dashboard Response: {resp.text}")
    
    if resp.status_code == 200:
        print(f"Workshops: {resp.json()}")

if __name__ == "__main__":
    run_test()
