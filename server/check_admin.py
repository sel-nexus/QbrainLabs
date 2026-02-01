import asyncio
import sys
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import bcrypt
from app.core.database import AsyncSessionLocal
from app.models.models import User, UserRole, AccountStatus
from sqlalchemy.future import select

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

import os
from dotenv import load_dotenv

load_dotenv()

DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")

async def reset_admin():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == 'admin@qbrainlabs.com'))
        user = result.scalars().first()
        if user:
            # Reset password to env var
            user.password_hash = hash_password(DEFAULT_ADMIN_PASSWORD)
            user.role = UserRole.ADMIN.value
            user.status = AccountStatus.ACTIVE.value
            user.is_admin = True
            await db.commit()
            print('Admin user password reset to: admin123')
            print(f'Role set to: {user.role}')
            print(f'Status set to: {user.status}')
        else:
            print('Admin user not found!')

asyncio.run(reset_admin())
