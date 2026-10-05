"""
US46: Configurable LLM Models Migration

Creates table for the LLM model registry:
- llm_model_configs - Admin-managed LLM provider configs, tagged by role

Supports PostgreSQL (production).
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.core.database import engine


async def create_llm_model_configs_table():
    """Create llm_model_configs table."""

    async with engine.begin() as conn:
        print("Creating llm_model_configs table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS llm_model_configs (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                provider VARCHAR(50) NOT NULL,
                role VARCHAR(50) NOT NULL,
                model_name VARCHAR(200) NOT NULL,
                config_json JSONB NOT NULL DEFAULT '{}',
                encrypted_api_key TEXT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_by VARCHAR(36) NOT NULL REFERENCES users(id),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),

                CONSTRAINT llm_model_configs_provider_check
                    CHECK (provider IN ('openai', 'azure_openai', 'anthropic', 'typesafe_ai')),
                CONSTRAINT llm_model_configs_role_check
                    CHECK (role IN ('embedding', 'decision', 'reasoning'))
            );
        """))

        indexes = [
            "CREATE INDEX IF NOT EXISTS ix_llm_model_configs_role ON llm_model_configs(role);",
            "CREATE INDEX IF NOT EXISTS ix_llm_model_configs_created_by ON llm_model_configs(created_by);",
        ]
        for idx in indexes:
            try:
                await conn.execute(text(idx))
            except Exception as e:
                print(f"  Note: {e}")

        await conn.execute(text("""
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        """))

        await conn.execute(text("DROP TRIGGER IF EXISTS update_llm_model_configs_updated_at ON llm_model_configs;"))
        await conn.execute(text("""
            CREATE TRIGGER update_llm_model_configs_updated_at
                BEFORE UPDATE ON llm_model_configs
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        """))

        await conn.commit()
    print("✅ llm_model_configs table created")


async def run_migration():
    """Run the full migration."""
    print("=" * 60)
    print("US46: Configurable LLM Models Migration")
    print("=" * 60)

    try:
        await create_llm_model_configs_table()

        print("\n" + "=" * 60)
        print("✅ Migration completed successfully!")
        print("=" * 60)
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    asyncio.run(run_migration())
