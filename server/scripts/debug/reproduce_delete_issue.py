import requests
import uuid
import sys

BASE_URL = "http://localhost:8000"
ADMIN_EMAIL = "admin@qbrainlabs.com"
ADMIN_PASSWORD = "admin123" # From init_db.py default

def run_test():
    # 1. Login as Admin
    print(f"Logging in as Admin: {ADMIN_EMAIL}")
    login_response = requests.post(f"{BASE_URL}/api/auth/login", data={
        "username": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if login_response.status_code != 200:
        print(f"Admin Login failed: {login_response.text}")
        # Try to use the default admin credentials if above failed, 
        # but I will assume this works for now or user provided creds in previous context
        return

    admin_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}
    print("Admin logged in.")

    # 2. Create a dummy user to delete
    dummy_email = f"tobedeleted_{uuid.uuid4()}@example.com"
    print(f"Creating dummy user: {dummy_email}")
    create_resp = requests.post(f"{BASE_URL}/api/admin/users", headers=headers, json={
        "email": dummy_email,
        "full_name": "To Be Deleted",
        "is_admin": False
    })
    
    if create_resp.status_code != 201:
        print(f"Failed to create dummy user: {create_resp.text}")
        return

    user_id = create_resp.json()["id"]
    print(f"Created user ID: {user_id}")

    # 3. Delete the user
    print(f"Attempting to delete user {user_id}...")
    delete_resp = requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=headers)
    
    print(f"Delete Status: {delete_resp.status_code}")
    print(f"Delete Response: {delete_resp.text}")

if __name__ == "__main__":
    run_test()
