import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path, override=True)

# Add server directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Fix for Windows asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.models import User
import bcrypt

async def reset_password():
    email = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@qbrainlabs.com")
    new_password = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")
    
    print(f"🔄 Resetting password for: {email}")
    print(f"🔑 New Password: {new_password}")
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        
        if not user:
            print("❌ User not found!")
            return
            
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(new_password.encode('utf-8'), salt).decode('utf-8')
        
        user.password_hash = hashed
        await db.commit()
        print("✅ Password updated successfully in database!")

if __name__ == "__main__":
    asyncio.run(reset_password())
