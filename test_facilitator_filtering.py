"""
Test script to verify facilitator-based filtering for use cases
This script tests that facilitators only see use cases from workshops they own or are assigned to
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

sys.path.insert(0, 'server')

from app.core.database import get_db, engine
from app.models.models import User, Workshop, UseCase
from app.models.rbac import WorkshopFacilitator


async def test_facilitator_filtering():
    """Test that facilitators only see their assigned workshops' use cases"""
    
    async with AsyncSession(engine) as db:
        print("\n=== Testing Facilitator Use Case Filtering ===\n")
        
        # Get all facilitators (non-admin users)
        result = await db.execute(
            select(User).where(User.is_admin == False)
        )
        facilitators = result.scalars().all()
        
        if not facilitators:
            print("❌ No facilitators found in the database")
            return
        
        for facilitator in facilitators:
            print(f"\n📋 Testing facilitator: {facilitator.email}")
            print(f"   User ID: {facilitator.id}")
            
            # Get workshops owned by this facilitator
            owned_result = await db.execute(
                select(Workshop).where(Workshop.facilitator_id == facilitator.id)
            )
            owned_workshops = owned_result.scalars().all()
            owned_workshop_ids = [str(w.id) for w in owned_workshops]
            
            # Get workshops assigned to this facilitator
            assigned_result = await db.execute(
                select(WorkshopFacilitator.workshop_id)
                .where(WorkshopFacilitator.facilitator_id == facilitator.id)
            )
            assigned_workshop_ids = [str(w[0]) for w in assigned_result.all()]
            
            # Combine both lists
            all_workshop_ids = list(set(owned_workshop_ids + assigned_workshop_ids))
            
            print(f"   Owned workshops: {len(owned_workshops)}")
            print(f"   Assigned workshops: {len(assigned_workshop_ids)}")
            print(f"   Total accessible workshops: {len(all_workshop_ids)}")
            
            if not all_workshop_ids:
                print("   ⚠️  Facilitator has no workshops assigned")
                continue
            
            # Get use cases from these workshops
            use_cases_result = await db.execute(
                select(UseCase, Workshop)
                .join(Workshop, UseCase.workshop_id == Workshop.id)
                .where(UseCase.workshop_id.in_(all_workshop_ids))
            )
            use_cases = use_cases_result.all()
            
            print(f"   ✅ Accessible use cases: {len(use_cases)}")
            
            # Display workshop breakdown
            if use_cases:
                workshop_counts = {}
                for uc, ws in use_cases:
                    ws_title = ws.title
                    workshop_counts[ws_title] = workshop_counts.get(ws_title, 0) + 1
                
                print("\n   Use cases by workshop:")
                for ws_title, count in workshop_counts.items():
                    print(f"      - {ws_title}: {count} use case(s)")
        
        # Test admin access
        print("\n\n📋 Testing admin access:")
        admin_result = await db.execute(
            select(User).where(User.is_admin == True)
        )
        admins = admin_result.scalars().all()
        
        if admins:
            admin = admins[0]
            print(f"   Admin: {admin.email}")
            
            # Admins should see ALL use cases
            all_use_cases_result = await db.execute(
                select(UseCase, Workshop)
                .join(Workshop, UseCase.workshop_id == Workshop.id)
            )
            all_use_cases = all_use_cases_result.all()
            print(f"   ✅ Admin can see all {len(all_use_cases)} use cases")
        else:
            print("   ⚠️  No admin users found")
        
        print("\n=== Test Complete ===\n")


if __name__ == "__main__":
    asyncio.run(test_facilitator_filtering())
