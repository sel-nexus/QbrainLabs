import asyncio
from app.core.database import engine
from sqlalchemy import text

async def reset_gamification_tables():
    async with engine.begin() as conn:
        print("Dropping participant_points table...")
        await conn.execute(text("DROP TABLE IF EXISTS participant_points CASCADE"))
        print("Dropping participant_badges table...")
        await conn.execute(text("DROP TABLE IF EXISTS participant_badges CASCADE"))
        print("Tables dropped. Restart the server to recreate them with new schema.")

if __name__ == "__main__":
    asyncio.run(reset_gamification_tables())
