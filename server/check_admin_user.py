
import asyncio
import sys
import os

# Add server directory to path regardless of where it's run from
current = os.path.abspath(__file__)
server_dir = os.path.dirname(current)
if server_dir not in sys.path:
    sys.path.insert(0, server_dir)

from app.core.database import async_session
from app.models.models import User
from sqlalchemy.future import select
from app.core.security import verify_password

async def check_user():
    print("Checking database for users...")
    async with async_session() as session:
        # Check admin@qbrainlabs.com
        print(f"\n--- Checking 'admin@qbrainlabs.com' ---")
        result = await session.execute(select(User).where(User.email == "admin@qbrainlabs.com"))
        user = result.scalars().first()
        if user:
            print(f"User FOUND: {user.email}")
            print(f"Role: {user.role}")
            print(f"Status: {user.status}")
            print(f"Is Admin: {user.is_admin_user}")
            # Check password
            is_valid = verify_password('admin123', user.password_hash)
            print(f"Password verification for 'admin123': {is_valid}")
        else:
            print("User 'admin@qbrainlabs.com' NOT FOUND")

        # Check admin@hotspotmatrix.ai
        print(f"\n--- Checking 'admin@hotspotmatrix.ai' ---")
        result = await session.execute(select(User).where(User.email == "admin@hotspotmatrix.ai"))
        user = result.scalars().first()
        if user:
            print(f"User FOUND: {user.email}")
            print(f"Role: {user.role}")
            print(f"Status: {user.status}")
            print(f"Is Admin: {user.is_admin_user}")
            # Check password
            is_valid = verify_password('admin123', user.password_hash)
            print(f"Password verification for 'admin123': {is_valid}")
        else:
            print("User 'admin@hotspotmatrix.ai' NOT FOUND")

if __name__ == "__main__":
    try:
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(check_user())
    except Exception as e:
        print(f"Error running check: {e}")
