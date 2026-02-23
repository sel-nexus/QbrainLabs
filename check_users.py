import requests

# Try to create a new user to see if registration works
response = requests.post(
    "http://localhost:8000/api/auth/register",
    json={
        "email": "testadmin@test.com",
        "password": "test123",
        "full_name": "Test Admin"
    }
)

print(f"Register Status: {response.status_code}")
print(f"Response: {response.text}")

# Try different possible admin credentials
credentials = [
    ("admin@qbrainlabs.com", "admin123"),
    ("admin@hotspotmatrix.ai", "Admin@2025"),
    ("admin@test.com", "admin"),
    ("testadmin@test.com", "test123"),
]

for email, password in credentials:
    response = requests.post(
        "http://localhost:8000/api/auth/login",
        data={"username": email, "password": password}
    )
    print(f"\nLogin {email}: {response.status_code}")
    if response.status_code == 200:
        print(f"SUCCESS! Token: {response.json().get('access_token', '')[:50]}...")
        break
    else:
        print(f"Failed: {response.text[:100]}")
