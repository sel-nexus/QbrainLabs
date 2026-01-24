"""
Database initialization script
Creates default admin user if it doesn't exist
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import engine, Base, AsyncSessionLocal
from app.models.models import User
import bcrypt

DEFAULT_ADMIN_EMAIL = "admin@hotspotmatrix.ai"
DEFAULT_ADMIN_PASSWORD = "admin123"  # Should be changed on first login
DEFAULT_ADMIN_NAME = "Administrator"

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

async def init_db():
    """Initialize database and create default admin user"""
    print("🔧 Initializing database...")
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created")
    
    # Create default admin user if not exists
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == DEFAULT_ADMIN_EMAIL))
        admin_user = result.scalars().first()
        
        if not admin_user:
            print(f"👤 Creating default admin user: {DEFAULT_ADMIN_EMAIL}")
            hashed_password = hash_password(DEFAULT_ADMIN_PASSWORD)
            admin_user = User(
                email=DEFAULT_ADMIN_EMAIL,
                password_hash=hashed_password,
                full_name=DEFAULT_ADMIN_NAME,
                is_admin=True
            )
            db.add(admin_user)
            await db.commit()
            print(f"✅ Admin user created successfully")
            print(f"   📧 Email: {DEFAULT_ADMIN_EMAIL}")
            print(f"   🔑 Password: {DEFAULT_ADMIN_PASSWORD}")
            print(f"   ⚠️  Please change the default password after first login!")
        else:
            print(f"ℹ️  Admin user already exists: {DEFAULT_ADMIN_EMAIL}")

if __name__ == "__main__":
    print("=" * 60)
    print("AI Hotspot Matrix - Database Initialization")
    print("=" * 60)
    asyncio.run(init_db())
    print("=" * 60)
    print("✨ Database initialization complete!")
    print("=" * 60)
