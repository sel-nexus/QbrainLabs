"""Test login functionality."""
import asyncio
import sys
from pathlib import Path

# Windows event loop fix
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, str(Path(__file__).parent))

async def reset_password():
    """Reset admin password to a known value"""
    from app.core.database import engine
    from sqlalchemy import text
    from app.core.security import hash_password
    
    new_password = "Admin123!"
    new_hash = hash_password(new_password)
    
    async with engine.begin() as conn:
        result = await conn.execute(
            text("UPDATE users SET password_hash = :hash WHERE email = 'admin@qbrainlabs.com' RETURNING email"),
            {"hash": new_hash}
        )
        updated = result.fetchone()
        if updated:
            print(f"✅ Password reset for {updated[0]}")
            print(f"   New password: {new_password}")
        else:
            print("❌ User not found")

async def test_login():
    from app.core.database import engine
    from sqlalchemy import text
    from app.core.security import verify_password, hash_password
    
    async with engine.connect() as conn:
        # Get admin user
        result = await conn.execute(text("SELECT id, email, password_hash, role, status FROM users WHERE email = 'admin@qbrainlabs.com'"))
        user = result.fetchone()
        if user:
            print(f"User: {user[1]} (role: {user[3]}, status: {user[4]})")
            print(f"Password hash: {user[2][:20]}..." if user[2] else "No hash")
            
            # Test password verification
            test_passwords = ["Admin123!", "test123"]
            for pwd in test_passwords:
                match = verify_password(pwd, user[2])
                print(f"  Password '{pwd}': {'✅ MATCH' if match else '❌ no match'}")
        else:
            print("User admin@qbrainlabs.com not found!")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "reset":
        asyncio.run(reset_password())
    else:
        asyncio.run(test_login())
