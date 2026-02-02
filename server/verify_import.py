import httpx
import asyncio
import sys

# Windows event loop fix
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def verify():
    base_url = "http://localhost:8000"
    
    print(f"Connecting to {base_url}...")
    
    # Login
    async with httpx.AsyncClient() as client:
        try:
            login_resp = await client.post(
                f"{base_url}/api/auth/login",
                data={"username": "admin@qbrainlabs.com", "password": "admin123"}
            )
            if login_resp.status_code != 200:
                print(f"❌ Login failed: {login_resp.status_code}")
                print(f"Response: {login_resp.text}")
                return
            
            token = login_resp.json()["access_token"]
            print("✅ Login successful")
            
            headers = {"Authorization": f"Bearer {token}"}
            
            # Test Upload
            print("Uploading test document...")
            files = {'file': ('test_knowledge.txt', b'This is a test document for knowledge base import. It contains some content about AI and business.')}
            data = {'category': 'Testing'}
            
            # The endpoint we fixed is /api/knowledge-base/documents/upload
            upload_resp = await client.post(
                f"{base_url}/api/knowledge-base/documents/upload",
                headers=headers,
                files=files,
                data=data
            )
            
            if upload_resp.status_code == 200:
                print("✅ Upload successful!")
                print(f"Response: {upload_resp.json()}")
            else:
                print(f"❌ Upload failed: {upload_resp.status_code}")
                print(f"Response: {upload_resp.text}")
                
        except Exception as e:
            print(f"❌ Error during verification: {e}")

if __name__ == "__main__":
    asyncio.run(verify())
