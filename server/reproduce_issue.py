import asyncio
import httpx
import sys
import os

# Set base URL
BASE_URL = "http://localhost:8000"

async def reproduce():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Login
        print("Logging in...")
        login_data = {
            "username": "admin@qbrainlabs.com",
            "password": "Admin123!" # Trying default password first
        }
        
        # Try login with default password
        print(f"Attempting login at {BASE_URL}/api/auth/login")
        try:
            response = await client.post(f"{BASE_URL}/api/auth/login", data=login_data)
        except Exception as e:
            print(f"Connection failed: {e}")
            return
        
        if response.status_code != 200:
            print(f"Login failed with default password: {response.status_code} - {response.text}")
            # Try with the reset password from test_login.py
            login_data["password"] = "Tcs@$2026"
            response = await client.post(f"{BASE_URL}/api/auth/login", data=login_data)
            
        if response.status_code != 200:
            print(f"Login failed: {response.text}")
            return
            
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Login successful.")
        
        # 2. Get Industries to get a valid ID
        print("Fetching industries...")
        response = await client.get(f"{BASE_URL}/api/knowledge-base/industries", headers=headers)
        if response.status_code != 200:
            print(f"Failed to fetch industries: {response.text}")
            return
            
        industries = response.json()
        if not industries:
            print("No industries found.")
            return
            
        industry_id = industries[0]["id"]
        print(f"Using industry ID: {industry_id}")
        
        # 3. Add Use Case
        print("Adding use case...")
        use_case_data = {
            "title": "Test Use Case from Script",
            "description": "This is a test use case to reproduce the failure.",
            "industry_id": industry_id,
            "category": "Process Automation",
            "complexity": "Low",
            "typical_roi": "10-20%",
            "implementation_time": "1-2 months",
            "technologies": ["Python", "FastAPI"]
        }
        
        response = await client.post(f"{BASE_URL}/api/knowledge-base/add", json=use_case_data, headers=headers)
        
        print(f"Add Use Case Status: {response.status_code}")
        print(f"Response: {response.text}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(reproduce())
