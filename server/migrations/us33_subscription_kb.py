"""
US33: Subscription Tiers, Feature Flags, and Knowledge Base Migration

Creates tables for:
1. subscription_tiers - Subscription tier definitions
2. feature_flags - Global feature flags
3. feature_flag_overrides - Organization-specific feature overrides
4. kb_industries - Knowledge base industry categories
5. kb_use_cases - Knowledge base use case templates
6. category_keywords - AI categorization keywords
7. complexity_rules - Complexity estimation rules

Supports PostgreSQL (production).
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import engine, AsyncSessionLocal, Base
from app.models.subscription import (
    SubscriptionTier, 
    FeatureFlag, 
    DEFAULT_SUBSCRIPTION_TIERS,
    DEFAULT_FEATURE_FLAGS
)
from app.models.knowledge_base import (
    KBIndustry,
    KBUseCase,
    CategoryKeyword,
    ComplexityRule,
    DEFAULT_CATEGORY_KEYWORDS,
    DEFAULT_COMPLEXITY_RULES
)


async def create_subscription_tables():
    """Create subscription and feature flag tables."""
    
    async with engine.begin() as conn:
        # Subscription Tiers
        print("Creating subscription_tiers table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS subscription_tiers (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                display_name VARCHAR(100) NOT NULL,
                description TEXT,
                max_users INT NOT NULL DEFAULT 5,
                max_workshops_per_month INT NOT NULL DEFAULT 3,
                max_participants_per_workshop INT NOT NULL DEFAULT 25,
                max_use_cases_per_workshop INT NOT NULL DEFAULT 100,
                features JSONB DEFAULT '[]',
                price_monthly DECIMAL(10,2) DEFAULT 0,
                price_yearly DECIMAL(10,2) DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                sort_order INT DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        """))
        
        # Feature Flags
        print("Creating feature_flags table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS feature_flags (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                display_name VARCHAR(150),
                description TEXT,
                default_enabled BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """))
        
        # Feature Flag Overrides
        print("Creating feature_flag_overrides table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS feature_flag_overrides (
                id VARCHAR(36) PRIMARY KEY,
                flag_id VARCHAR(36) NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
                organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                is_enabled BOOLEAN NOT NULL,
                created_by VARCHAR(36) REFERENCES users(id),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """))
        
        # Create unique index for flag overrides
        try:
            await conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_override_flag_org 
                ON feature_flag_overrides(flag_id, organization_id);
            """))
        except Exception as e:
            print(f"  Note: {e}")
        
        await conn.commit()
    print("✅ Subscription and feature flag tables created")


async def create_knowledge_base_tables():
    """Create knowledge base tables."""
    
    async with engine.begin() as conn:
        # KB Industries
        print("Creating kb_industries table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS kb_industries (
                id VARCHAR(36) PRIMARY KEY,
                slug VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                icon VARCHAR(50),
                color VARCHAR(7),
                sort_order INT DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        """))
        
        # KB Use Cases
        print("Creating kb_use_cases table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS kb_use_cases (
                id VARCHAR(36) PRIMARY KEY,
                industry_id VARCHAR(36) NOT NULL REFERENCES kb_industries(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                category VARCHAR(100),
                complexity VARCHAR(20) DEFAULT 'Medium',
                typical_roi VARCHAR(255),
                implementation_time VARCHAR(100),
                technologies JSONB DEFAULT '[]',
                key_benefits JSONB DEFAULT '[]',
                prerequisites JSONB DEFAULT '[]',
                example_kpis JSONB DEFAULT '[]',
                is_featured BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                view_count INT DEFAULT 0,
                usage_count INT DEFAULT 0,
                created_by VARCHAR(50) DEFAULT 'system',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        """))
        
        # Category Keywords
        print("Creating category_keywords table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS category_keywords (
                id VARCHAR(36) PRIMARY KEY,
                category VARCHAR(100) UNIQUE NOT NULL,
                keywords JSONB NOT NULL,
                weight INT DEFAULT 1,
                is_active BOOLEAN DEFAULT TRUE
            );
        """))
        
        # Complexity Rules
        print("Creating complexity_rules table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS complexity_rules (
                id VARCHAR(36) PRIMARY KEY,
                complexity VARCHAR(20) UNIQUE NOT NULL,
                keywords JSONB NOT NULL,
                threshold INT DEFAULT 2,
                timeline_estimate VARCHAR(50),
                is_active BOOLEAN DEFAULT TRUE
            );
        """))
        
        # Create indexes
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_kb_industry ON kb_use_cases(industry_id);",
            "CREATE INDEX IF NOT EXISTS idx_kb_category ON kb_use_cases(category);",
            "CREATE INDEX IF NOT EXISTS idx_kb_complexity ON kb_use_cases(complexity);",
            "CREATE INDEX IF NOT EXISTS idx_kb_active ON kb_use_cases(is_active);",
        ]
        for idx in indexes:
            try:
                await conn.execute(text(idx))
            except Exception as e:
                print(f"  Note: {e}")
        
        await conn.commit()
    print("✅ Knowledge base tables created")


async def seed_subscription_tiers(db: AsyncSession):
    """Seed default subscription tiers."""
    from sqlalchemy.future import select
    
    created = 0
    for tier_data in DEFAULT_SUBSCRIPTION_TIERS:
        # Check if tier exists
        result = await db.execute(
            select(SubscriptionTier).where(SubscriptionTier.name == tier_data["name"])
        )
        if not result.scalar_one_or_none():
            tier = SubscriptionTier(**tier_data)
            db.add(tier)
            created += 1
    
    if created > 0:
        await db.commit()
    print(f"✅ Seeded {created} subscription tiers")
    return created


async def seed_feature_flags(db: AsyncSession):
    """Seed default feature flags."""
    from sqlalchemy.future import select
    
    created = 0
    for flag_data in DEFAULT_FEATURE_FLAGS:
        result = await db.execute(
            select(FeatureFlag).where(FeatureFlag.name == flag_data["name"])
        )
        if not result.scalar_one_or_none():
            flag = FeatureFlag(**flag_data)
            db.add(flag)
            created += 1
    
    if created > 0:
        await db.commit()
    print(f"✅ Seeded {created} feature flags")
    return created


async def seed_category_keywords(db: AsyncSession):
    """Seed default category keywords."""
    from sqlalchemy.future import select
    
    created = 0
    for kw_data in DEFAULT_CATEGORY_KEYWORDS:
        result = await db.execute(
            select(CategoryKeyword).where(CategoryKeyword.category == kw_data["category"])
        )
        if not result.scalar_one_or_none():
            kw = CategoryKeyword(**kw_data)
            db.add(kw)
            created += 1
    
    if created > 0:
        await db.commit()
    print(f"✅ Seeded {created} category keywords")
    return created


async def seed_complexity_rules(db: AsyncSession):
    """Seed default complexity rules."""
    from sqlalchemy.future import select
    
    created = 0
    for rule_data in DEFAULT_COMPLEXITY_RULES:
        result = await db.execute(
            select(ComplexityRule).where(ComplexityRule.complexity == rule_data["complexity"])
        )
        if not result.scalar_one_or_none():
            rule = ComplexityRule(**rule_data)
            db.add(rule)
            created += 1
    
    if created > 0:
        await db.commit()
    print(f"✅ Seeded {created} complexity rules")
    return created


async def migrate_knowledge_base_json(db: AsyncSession):
    """
    Migrate knowledge_base.json to database tables.
    Only runs if kb_industries is empty.
    """
    import json
    from sqlalchemy.future import select
    
    # Check if already migrated
    result = await db.execute(select(KBIndustry).limit(1))
    if result.scalar_one_or_none():
        print("⏭️ Knowledge base already has data, skipping JSON migration")
        return 0
    
    # Find knowledge_base.json
    kb_paths = [
        Path(__file__).parent.parent / "app" / "data" / "knowledge_base.json",
        Path(__file__).parent.parent / "data" / "knowledge_base.json",
        Path("app/data/knowledge_base.json"),
    ]
    
    kb_path = None
    for p in kb_paths:
        if p.exists():
            kb_path = p
            break
    
    if not kb_path:
        print("⏭️ knowledge_base.json not found, skipping migration")
        return 0
    
    print(f"📖 Loading knowledge base from {kb_path}...")
    with open(kb_path) as f:
        data = json.load(f)
    
    # Migrate industries
    industries_created = 0
    use_cases_created = 0
    
    for ind in data.get("industries", []):
        industry = KBIndustry(
            slug=ind.get("id", ind.get("slug")),
            name=ind["name"],
            description=ind.get("description"),
            icon=ind.get("icon"),
            color=ind.get("color"),
        )
        db.add(industry)
        await db.flush()
        industries_created += 1
        
        # Migrate use cases for this industry
        for uc in ind.get("use_cases", []):
            use_case = KBUseCase(
                industry_id=industry.id,
                title=uc["title"],
                description=uc["description"],
                category=uc.get("category"),
                complexity=uc.get("complexity", "Medium"),
                typical_roi=uc.get("typical_roi"),
                implementation_time=uc.get("implementation_time"),
                technologies=uc.get("technologies", []),
                key_benefits=uc.get("key_benefits", []),
                prerequisites=uc.get("prerequisites", []),
                example_kpis=uc.get("example_kpis", []),
            )
            db.add(use_case)
            use_cases_created += 1
    
    await db.commit()
    print(f"✅ Migrated {industries_created} industries and {use_cases_created} use cases from JSON")
    return industries_created


async def run_migration():
    """Run the full migration."""
    print("=" * 60)
    print("US33: Extended Configuration Migration")
    print("Subscription Tiers, Feature Flags, Knowledge Base")
    print("=" * 60)
    
    try:
        # Create tables
        await create_subscription_tables()
        await create_knowledge_base_tables()
        
        # Seed data
        async with AsyncSessionLocal() as db:
            await seed_subscription_tiers(db)
            await seed_feature_flags(db)
            await seed_category_keywords(db)
            await seed_complexity_rules(db)
            await migrate_knowledge_base_json(db)
        
        print("\n" + "=" * 60)
        print("✅ Migration completed successfully!")
        print("=" * 60)
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(run_migration())
