"""
Script to seed workshop templates into the database.
Run with: python -m app.scripts.seed_workshop_templates
"""
import asyncio
import json
import uuid
from pathlib import Path

from app.core.database import AsyncSessionLocal
from app.models.templates import WorkshopTemplate, CriteriaTemplate
from app.models import User
from sqlalchemy import select


async def seed_templates():
    """Load workshop and criteria templates from JSON and insert into database"""
    
    # Load templates from JSON file
    templates_path = Path(__file__).parent.parent / "data" / "workshop_templates.json"
    
    with open(templates_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    workshop_templates = data.get("templates", [])
    criteria_templates = data.get("criteria_templates", [])
    
    async with AsyncSessionLocal() as db:
        # Get system user or first admin for author_id
        result = await db.execute(
            select(User).where(User.role == "admin").limit(1)
        )
        admin = result.scalar_one_or_none()
        
        if not admin:
            # Try to get any user
            result = await db.execute(select(User).limit(1))
            admin = result.scalar_one_or_none()
        
        if not admin:
            print("Error: No users found in database. Please create a user first.")
            return
        
        author_id = admin.id
        print(f"Using author: {admin.email}")
        
        # Seed Workshop Templates
        workshop_count = 0
        for t in workshop_templates:
            # Check if template already exists
            result = await db.execute(
                select(WorkshopTemplate).where(WorkshopTemplate.name == t["name"])
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                print(f"Workshop template '{t['name']}' already exists, skipping...")
                continue
            
            template = WorkshopTemplate(
                id=uuid.uuid4(),
                name=t["name"],
                category=t["category"],
                industry=t.get("industry"),
                description=t.get("description"),
                config=t.get("config", {}),
                criteria=t.get("criteria", []),
                phases=t.get("phases"),
                agenda=t.get("agenda"),
                facilitator_guide=t.get("facilitator_guide"),
                participant_materials=t.get("participant_materials"),
                sample_use_cases=t.get("sample_use_cases"),
                is_public=t.get("is_public", True),
                author_id=author_id,
                usage_count=0,
                rating=0.0,
                rating_count=0
            )
            db.add(template)
            print(f"Added workshop template: {t['name']}")
            workshop_count += 1
        
        # Seed Criteria Templates
        criteria_count = 0
        for t in criteria_templates:
            # Check if template already exists
            result = await db.execute(
                select(CriteriaTemplate).where(CriteriaTemplate.name == t["name"])
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                print(f"Criteria template '{t['name']}' already exists, skipping...")
                continue
            
            template = CriteriaTemplate(
                id=uuid.uuid4(),
                name=t["name"],
                category=t["category"],
                description=t.get("description"),
                criteria=t.get("criteria", []),
                usage_count=0
            )
            db.add(template)
            print(f"Added criteria template: {t['name']}")
            criteria_count += 1
        
        await db.commit()
        print(f"\nSeeded {workshop_count} workshop templates and {criteria_count} criteria templates successfully!")


if __name__ == "__main__":
    asyncio.run(seed_templates())
