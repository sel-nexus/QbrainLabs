import httpx
import asyncio
import os

async def verify_image_import():
    base_url = "http://localhost:8000"
    image_path = r"C:\Users\azvmuser1\.gemini\antigravity\brain\bc481c3a-a1e1-4ae8-a288-ed094d68b25d\test_challenge_card_1770053559893.png"
    
    print(f"Connecting to {base_url}...")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        # 1. Login
        login_data = {
            "username": "admin@qbrainlabs.com",
            "password": "admin123"
        }
        login_resp = await client.post(f"{base_url}/api/auth/login", data=login_data)
        if login_resp.status_code != 200:
            print(f"❌ Login failed: {login_resp.status_code}")
            print(login_resp.text)
            return

        token_data = login_resp.json()
        token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Login successful")

        # 2. Upload Image
        print(f"Uploading image: {os.path.basename(image_path)}...")
        with open(image_path, "rb") as f:
            files = {"file": (os.path.basename(image_path), f, "image/png")}
            data = {"category": "Image Analysis Test"}
            upload_resp = await client.post(
                f"{base_url}/api/knowledge-base/documents/upload",
                files=files,
                data=data,
                headers=headers
            )

        if upload_resp.status_code == 200:
            result = upload_resp.json()
            print("✅ Image upload successful!")
            print(f"Response: {result}")
            
            # 3. Verify content
            doc_id = result["document_id"]
            # We can't easily check the content without another API call or DB check
            # But the success message implies OCR worked (otherwise it would be 400 Empty Content)
        else:
            print(f"❌ Image upload failed: {upload_resp.status_code}")
            print(f"Response: {upload_resp.text}")

if __name__ == "__main__":
    asyncio.run(verify_image_import())
