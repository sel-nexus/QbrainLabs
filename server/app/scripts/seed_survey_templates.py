"""
Script to seed survey templates into the database.
Run with: python -m app.scripts.seed_survey_templates
"""
import asyncio
import json
import uuid
from pathlib import Path

from app.core.database import AsyncSessionLocal
from app.models.survey import SurveyTemplate
from sqlalchemy import select


async def seed_templates():
    """Load survey templates from JSON and insert into database"""
    
    # Load templates from JSON file
    templates_path = Path(__file__).parent.parent / "data" / "survey_templates.json"
    
    with open(templates_path, "r") as f:
        data = json.load(f)
    
    templates = data.get("templates", [])
    
    async with AsyncSessionLocal() as db:
        for t in templates:
            # Check if template already exists
            result = await db.execute(
                select(SurveyTemplate).where(SurveyTemplate.name == t["name"])
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                print(f"Template '{t['name']}' already exists, skipping...")
                continue
            
            template = SurveyTemplate(
                id=uuid.uuid4(),
                name=t["name"],
                description=t.get("description"),
                industry=t["industry"],
                category=t["category"],
                questions=t.get("questions", []),
                tags=t.get("tags", []),
                is_public=True,
                usage_count=0,
                created_by="system"
            )
            db.add(template)
            print(f"Added template: {t['name']}")
        
        await db.commit()
        print(f"\nSeeded {len(templates)} survey templates successfully!")


if __name__ == "__main__":
    asyncio.run(seed_templates())
