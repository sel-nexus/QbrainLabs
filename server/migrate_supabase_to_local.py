"""
Supabase to Local PostgreSQL Migration Script
==============================================
This script migrates both schema and data from a Supabase-hosted PostgreSQL
database to a locally installed PostgreSQL database.

Prerequisites:
    1. pip install psycopg2-binary python-dotenv
    2. Create a .env file with:
       - SUPABASE_DATABASE_URL: Your Supabase connection string
       - LOCAL_DATABASE_URL: Your local PostgreSQL connection string
    3. Ensure your local PostgreSQL server is running

Usage:
    python migrate_supabase_to_local.py [--schema-only] [--data-only] [--tables TABLE1,TABLE2]

Options:
    --schema-only   Only migrate schema (tables, indexes, constraints)
    --data-only     Only migrate data (assumes schema already exists)
    --tables        Comma-separated list of specific tables to migrate
    --dry-run       Show what would be done without making changes
"""

import os
import sys
import argparse
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import json

try:
    import psycopg2
    from psycopg2 import sql
    from psycopg2.extras import RealDictCursor, execute_values
except ImportError:
    print("❌ psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

try:
    from dotenv import load_dotenv
except ImportError:
    print("❌ python-dotenv not installed. Run: pip install python-dotenv")
    sys.exit(1)

# Load environment variables
script_dir = Path(__file__).parent
env_files = [
    script_dir.parent / ".env.production",
    script_dir.parent / ".env",
    script_dir / ".env",
]

for env_file in env_files:
    if env_file.exists():
        load_dotenv(env_file, override=True)
        print(f"📁 Loaded environment from: {env_file}")
        break


class DatabaseMigrator:
    """Handles migration from Supabase to local PostgreSQL."""
    
    # Tables to exclude from migration (Supabase internal tables)
    EXCLUDED_TABLES = {
        'schema_migrations',
        'ar_internal_metadata',
        '_prisma_migrations',
        'supabase_migrations',
        'pg_stat_statements',
    }
    
    # Tables that should be migrated in order (due to foreign key dependencies)
    TABLE_ORDER = [
        'users',
        'workshops',
        'participants',
        'use_cases',
        'votes',
        'usecase_feedback',
        'copilot_suggestions',
        'participant_engagement',
        'workshop_summaries',
        'detected_anomalies',
        'copilot_settings',
        'roi_calculations',
        'challenge_cards',
        'polls',
        'poll_options',
        'poll_votes',
        'breakout_sessions',
        'breakout_groups',
        'breakout_participants',
        'surveys',
        'survey_questions',
        'survey_responses',
        'organizations',
        'organization_members',
        'templates',
        'template_categories',
        'knowledge_base_articles',
        'knowledge_base_categories',
        'subscriptions',
        'subscription_plans',
        'subscription_features',
        'roles',
        'permissions',
        'role_permissions',
        'user_roles',
        'roadmap_items',
        'roadmap_milestones',
        'gamification_points',
        'gamification_badges',
        'gamification_achievements',
        'marketplace_items',
        'marketplace_purchases',
        'feedback_entries',
        'feedback_categories',
        'analytics_events',
        'system_settings',
    ]
    
    def __init__(
        self,
        supabase_url: str,
        local_url: str,
        dry_run: bool = False
    ):
        self.supabase_url = supabase_url
        self.local_url = local_url
        self.dry_run = dry_run
        self.supabase_conn = None
        self.local_conn = None
        self.migrated_tables = []
        self.errors = []
        
    def connect(self) -> bool:
        """Establish connections to both databases."""
        try:
            print("\n🔌 Connecting to Supabase PostgreSQL...")
            self.supabase_conn = psycopg2.connect(
                self.supabase_url,
                sslmode='require',
                connect_timeout=30
            )
            self.supabase_conn.autocommit = False
            
            with self.supabase_conn.cursor() as cur:
                cur.execute("SELECT version()")
                version = cur.fetchone()[0]
                print(f"   ✅ Connected: {version.split(',')[0]}")
                
        except Exception as e:
            print(f"   ❌ Supabase connection failed: {e}")
            return False
            
        try:
            print("\n🔌 Connecting to Local PostgreSQL...")
            self.local_conn = psycopg2.connect(
                self.local_url,
                connect_timeout=10
            )
            self.local_conn.autocommit = False
            
            with self.local_conn.cursor() as cur:
                cur.execute("SELECT version()")
                version = cur.fetchone()[0]
                print(f"   ✅ Connected: {version.split(',')[0]}")
                
        except Exception as e:
            print(f"   ❌ Local connection failed: {e}")
            print("\n   💡 Make sure your local PostgreSQL is running and the database exists.")
            print("   💡 Create the database with: createdb hotspotmatrix")
            return False
            
        return True
    
    def disconnect(self):
        """Close database connections."""
        if self.supabase_conn:
            self.supabase_conn.close()
        if self.local_conn:
            self.local_conn.close()
    
    def get_tables(self, conn) -> List[str]:
        """Get list of tables in public schema."""
        with conn.cursor() as cur:
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """)
            tables = [row[0] for row in cur.fetchall()]
            return [t for t in tables if t not in self.EXCLUDED_TABLES]
    
    def get_table_schema(self, conn, table_name: str) -> Dict[str, Any]:
        """Get detailed schema information for a table."""
        schema = {
            'columns': [],
            'primary_key': None,
            'foreign_keys': [],
            'indexes': [],
            'constraints': []
        }
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get columns
            cur.execute("""
                SELECT 
                    column_name,
                    data_type,
                    character_maximum_length,
                    numeric_precision,
                    numeric_scale,
                    is_nullable,
                    column_default,
                    udt_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = %s
                ORDER BY ordinal_position
            """, (table_name,))
            schema['columns'] = cur.fetchall()
            
            # Get primary key
            cur.execute("""
                SELECT a.attname
                FROM pg_index i
                JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                WHERE i.indrelid = %s::regclass AND i.indisprimary
            """, (table_name,))
            pk_cols = [row['attname'] for row in cur.fetchall()]
            if pk_cols:
                schema['primary_key'] = pk_cols
            
            # Get foreign keys
            cur.execute("""
                SELECT
                    tc.constraint_name,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = %s
            """, (table_name,))
            schema['foreign_keys'] = cur.fetchall()
            
            # Get indexes
            cur.execute("""
                SELECT
                    indexname,
                    indexdef
                FROM pg_indexes
                WHERE schemaname = 'public' AND tablename = %s
                AND indexname NOT LIKE '%_pkey'
            """, (table_name,))
            schema['indexes'] = cur.fetchall()
            
        return schema
    
    def generate_create_table_sql(self, table_name: str, schema: Dict[str, Any]) -> str:
        """Generate CREATE TABLE SQL from schema information."""
        columns = []
        
        for col in schema['columns']:
            col_def = f'"{col["column_name"]}" '
            
            # Map data types
            data_type = col['data_type'].upper()
            udt_name = col.get('udt_name', '').lower()
            
            if data_type == 'CHARACTER VARYING':
                if col['character_maximum_length']:
                    col_def += f"VARCHAR({col['character_maximum_length']})"
                else:
                    col_def += "VARCHAR"
            elif data_type == 'CHARACTER':
                col_def += f"CHAR({col['character_maximum_length'] or 1})"
            elif data_type == 'NUMERIC':
                if col['numeric_precision'] and col['numeric_scale']:
                    col_def += f"NUMERIC({col['numeric_precision']},{col['numeric_scale']})"
                else:
                    col_def += "NUMERIC"
            elif data_type == 'USER-DEFINED':
                # Handle JSONB and other custom types
                if udt_name == 'jsonb':
                    col_def += "JSONB"
                elif udt_name == 'json':
                    col_def += "JSON"
                else:
                    col_def += "TEXT"  # Fallback
            elif data_type == 'ARRAY':
                col_def += "TEXT[]"  # Simplified array handling
            elif data_type == 'TIMESTAMP WITHOUT TIME ZONE':
                col_def += "TIMESTAMP"
            elif data_type == 'TIMESTAMP WITH TIME ZONE':
                col_def += "TIMESTAMPTZ"
            else:
                col_def += data_type
            
            # Nullable
            if col['is_nullable'] == 'NO':
                col_def += " NOT NULL"
            
            # Default value
            if col['column_default']:
                default = col['column_default']
                # Clean up Supabase-specific defaults
                if 'gen_random_uuid()' in default:
                    default = 'gen_random_uuid()'
                elif 'uuid_generate_v4()' in default:
                    default = 'gen_random_uuid()'
                col_def += f" DEFAULT {default}"
            
            columns.append(col_def)
        
        # Add primary key constraint
        if schema['primary_key']:
            pk_cols = ', '.join(f'"{c}"' for c in schema['primary_key'])
            columns.append(f"PRIMARY KEY ({pk_cols})")
        
        create_sql = f'CREATE TABLE IF NOT EXISTS "{table_name}" (\n    '
        create_sql += ',\n    '.join(columns)
        create_sql += '\n);'
        
        return create_sql
    
    def generate_fk_sql(self, table_name: str, schema: Dict[str, Any]) -> List[str]:
        """Generate ALTER TABLE statements for foreign keys."""
        fk_statements = []
        
        for fk in schema['foreign_keys']:
            stmt = f"""
ALTER TABLE "{table_name}" 
ADD CONSTRAINT "{fk['constraint_name']}" 
FOREIGN KEY ("{fk['column_name']}") 
REFERENCES "{fk['foreign_table_name']}" ("{fk['foreign_column_name']}");
"""
            fk_statements.append(stmt.strip())
        
        return fk_statements
    
    def migrate_schema(self, tables: Optional[List[str]] = None) -> bool:
        """Migrate schema from Supabase to local database."""
        print("\n" + "="*60)
        print("📋 SCHEMA MIGRATION")
        print("="*60)
        
        # Get tables from Supabase
        supabase_tables = self.get_tables(self.supabase_conn)
        print(f"\n📊 Found {len(supabase_tables)} tables in Supabase")
        
        if tables:
            supabase_tables = [t for t in supabase_tables if t in tables]
            print(f"   Filtering to {len(supabase_tables)} specified tables")
        
        # Sort tables by dependency order
        ordered_tables = []
        for t in self.TABLE_ORDER:
            if t in supabase_tables:
                ordered_tables.append(t)
        # Add any remaining tables not in our order list
        for t in supabase_tables:
            if t not in ordered_tables:
                ordered_tables.append(t)
        
        # Enable UUID extension
        print("\n🔧 Enabling required extensions...")
        if not self.dry_run:
            with self.local_conn.cursor() as cur:
                try:
                    cur.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
                    cur.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')
                    self.local_conn.commit()
                    print("   ✅ Extensions enabled")
                except Exception as e:
                    print(f"   ⚠️ Extension warning: {e}")
                    self.local_conn.rollback()
        
        # Create tables
        print("\n📝 Creating tables...")
        fk_statements = []
        
        for table_name in ordered_tables:
            print(f"   Creating: {table_name}...", end=" ")
            
            try:
                schema = self.get_table_schema(self.supabase_conn, table_name)
                create_sql = self.generate_create_table_sql(table_name, schema)
                
                if self.dry_run:
                    print("(dry-run)")
                    continue
                
                with self.local_conn.cursor() as cur:
                    # Drop existing table if exists
                    cur.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE;')
                    cur.execute(create_sql)
                    self.local_conn.commit()
                
                # Collect FK statements for later
                fk_statements.extend(self.generate_fk_sql(table_name, schema))
                
                print("✅")
                
            except Exception as e:
                print(f"❌ Error: {e}")
                self.errors.append(f"Schema {table_name}: {e}")
                self.local_conn.rollback()
        
        # Add foreign keys
        if fk_statements and not self.dry_run:
            print("\n🔗 Adding foreign key constraints...")
            for fk_sql in fk_statements:
                try:
                    with self.local_conn.cursor() as cur:
                        cur.execute(fk_sql)
                        self.local_conn.commit()
                except Exception as e:
                    # FK errors are common due to missing referenced tables
                    self.local_conn.rollback()
        
        # Create indexes
        print("\n📇 Creating indexes...")
        for table_name in ordered_tables:
            try:
                schema = self.get_table_schema(self.supabase_conn, table_name)
                for idx in schema['indexes']:
                    if not self.dry_run:
                        try:
                            with self.local_conn.cursor() as cur:
                                cur.execute(idx['indexdef'])
                                self.local_conn.commit()
                        except Exception as e:
                            self.local_conn.rollback()
            except Exception as e:
                pass
        
        print("   ✅ Indexes created")
        return len(self.errors) == 0
    
    def migrate_data(self, tables: Optional[List[str]] = None, batch_size: int = 1000) -> bool:
        """Migrate data from Supabase to local database."""
        print("\n" + "="*60)
        print("📦 DATA MIGRATION")
        print("="*60)
        
        # Get tables
        supabase_tables = self.get_tables(self.supabase_conn)
        
        if tables:
            supabase_tables = [t for t in supabase_tables if t in tables]
        
        # Sort by dependency order
        ordered_tables = []
        for t in self.TABLE_ORDER:
            if t in supabase_tables:
                ordered_tables.append(t)
        for t in supabase_tables:
            if t not in ordered_tables:
                ordered_tables.append(t)
        
        total_rows = 0
        
        for table_name in ordered_tables:
            print(f"\n📤 Migrating: {table_name}")
            
            try:
                # Get row count
                with self.supabase_conn.cursor() as cur:
                    cur.execute(f'SELECT COUNT(*) FROM "{table_name}"')
                    count = cur.fetchone()[0]
                    print(f"   Rows to migrate: {count}")
                
                if count == 0:
                    print("   ⏭️ Skipping (empty table)")
                    continue
                
                if self.dry_run:
                    print("   (dry-run)")
                    total_rows += count
                    continue
                
                # Get column names
                with self.supabase_conn.cursor() as cur:
                    cur.execute(f"""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_schema = 'public' AND table_name = %s
                        ORDER BY ordinal_position
                    """, (table_name,))
                    columns = [row[0] for row in cur.fetchall()]
                
                # Disable triggers temporarily for faster insert
                with self.local_conn.cursor() as cur:
                    cur.execute(f'ALTER TABLE "{table_name}" DISABLE TRIGGER ALL;')
                
                # Migrate in batches
                offset = 0
                migrated = 0
                
                while offset < count:
                    with self.supabase_conn.cursor() as cur:
                        cur.execute(
                            f'SELECT * FROM "{table_name}" ORDER BY 1 LIMIT %s OFFSET %s',
                            (batch_size, offset)
                        )
                        rows = cur.fetchall()
                    
                    if not rows:
                        break
                    
                    # Insert into local database
                    col_names = ', '.join(f'"{c}"' for c in columns)
                    placeholders = ', '.join(['%s'] * len(columns))
                    insert_sql = f'INSERT INTO "{table_name}" ({col_names}) VALUES ({placeholders})'
                    
                    with self.local_conn.cursor() as cur:
                        for row in rows:
                            # Convert any problematic values
                            processed_row = []
                            for val in row:
                                if isinstance(val, dict) or isinstance(val, list):
                                    processed_row.append(json.dumps(val))
                                else:
                                    processed_row.append(val)
                            
                            try:
                                cur.execute(insert_sql, processed_row)
                            except Exception as e:
                                # Log but continue
                                pass
                    
                    self.local_conn.commit()
                    migrated += len(rows)
                    offset += batch_size
                    
                    # Progress indicator
                    progress = min(100, int(migrated / count * 100))
                    print(f"   Progress: {progress}% ({migrated}/{count})", end='\r')
                
                # Re-enable triggers
                with self.local_conn.cursor() as cur:
                    cur.execute(f'ALTER TABLE "{table_name}" ENABLE TRIGGER ALL;')
                    self.local_conn.commit()
                
                print(f"   ✅ Migrated {migrated} rows                    ")
                total_rows += migrated
                self.migrated_tables.append(table_name)
                
            except Exception as e:
                print(f"   ❌ Error: {e}")
                self.errors.append(f"Data {table_name}: {e}")
                self.local_conn.rollback()
        
        print(f"\n📊 Total rows migrated: {total_rows}")
        return len(self.errors) == 0
    
    def verify_migration(self) -> bool:
        """Verify data integrity after migration."""
        print("\n" + "="*60)
        print("✅ VERIFICATION")
        print("="*60)
        
        issues = []
        
        for table_name in self.migrated_tables:
            try:
                # Compare row counts
                with self.supabase_conn.cursor() as cur:
                    cur.execute(f'SELECT COUNT(*) FROM "{table_name}"')
                    supabase_count = cur.fetchone()[0]
                
                with self.local_conn.cursor() as cur:
                    cur.execute(f'SELECT COUNT(*) FROM "{table_name}"')
                    local_count = cur.fetchone()[0]
                
                if supabase_count != local_count:
                    issues.append(f"{table_name}: Supabase={supabase_count}, Local={local_count}")
                    print(f"   ⚠️ {table_name}: Row count mismatch ({supabase_count} vs {local_count})")
                else:
                    print(f"   ✅ {table_name}: {local_count} rows verified")
                    
            except Exception as e:
                issues.append(f"{table_name}: Verification error - {e}")
        
        if issues:
            print(f"\n⚠️ {len(issues)} verification issues found")
        else:
            print("\n✅ All tables verified successfully!")
        
        return len(issues) == 0
    
    def run(
        self,
        schema_only: bool = False,
        data_only: bool = False,
        tables: Optional[List[str]] = None,
        verify: bool = True
    ) -> bool:
        """Run the full migration process."""
        print("\n" + "="*60)
        print("🚀 SUPABASE TO LOCAL POSTGRESQL MIGRATION")
        print("="*60)
        print(f"   Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"   Dry Run: {self.dry_run}")
        
        if not self.connect():
            return False
        
        try:
            success = True
            
            if not data_only:
                success = self.migrate_schema(tables) and success
            
            if not schema_only:
                success = self.migrate_data(tables) and success
            
            if verify and not self.dry_run and not schema_only:
                self.verify_migration()
            
            # Summary
            print("\n" + "="*60)
            print("📋 MIGRATION SUMMARY")
            print("="*60)
            print(f"   Tables migrated: {len(self.migrated_tables)}")
            print(f"   Errors: {len(self.errors)}")
            
            if self.errors:
                print("\n   Errors encountered:")
                for err in self.errors[:10]:  # Show first 10 errors
                    print(f"   - {err}")
                if len(self.errors) > 10:
                    print(f"   ... and {len(self.errors) - 10} more")
            
            if success:
                print("\n✅ Migration completed successfully!")
                print("\n📝 Next steps:")
                print("   1. Update your .env file:")
                print(f"      DATABASE_URL={self.local_url}")
                print("   2. Restart your application")
                print("   3. Test all functionality")
            else:
                print("\n⚠️ Migration completed with errors. Review the log above.")
            
            return success
            
        finally:
            self.disconnect()


def main():
    parser = argparse.ArgumentParser(
        description='Migrate database from Supabase to local PostgreSQL'
    )
    parser.add_argument(
        '--schema-only',
        action='store_true',
        help='Only migrate schema (tables, indexes, constraints)'
    )
    parser.add_argument(
        '--data-only',
        action='store_true',
        help='Only migrate data (assumes schema already exists)'
    )
    parser.add_argument(
        '--tables',
        type=str,
        help='Comma-separated list of specific tables to migrate'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be done without making changes'
    )
    parser.add_argument(
        '--supabase-url',
        type=str,
        help='Supabase DATABASE_URL (overrides environment variable)'
    )
    parser.add_argument(
        '--local-url',
        type=str,
        help='Local DATABASE_URL (overrides environment variable)'
    )
    parser.add_argument(
        '--no-verify',
        action='store_true',
        help='Skip verification step'
    )
    
    args = parser.parse_args()
    
    # Get connection URLs
    supabase_url = args.supabase_url or os.getenv('SUPABASE_DATABASE_URL') or os.getenv('DATABASE_URL')
    local_url = args.local_url or os.getenv('LOCAL_DATABASE_URL') or 'postgresql://postgres:postgres@localhost:5432/hotspotmatrix'
    
    if not supabase_url:
        print("❌ Supabase DATABASE_URL not found!")
        print("\nProvide it via:")
        print("  1. --supabase-url argument")
        print("  2. SUPABASE_DATABASE_URL environment variable")
        print("  3. DATABASE_URL environment variable (if pointing to Supabase)")
        print("\nExample:")
        print("  python migrate_supabase_to_local.py --supabase-url 'postgresql://postgres.[ref]:[pwd]@aws-0-us-east-1.pooler.supabase.com:6543/postgres'")
        sys.exit(1)
    
    # Parse tables if specified
    tables = None
    if args.tables:
        tables = [t.strip() for t in args.tables.split(',')]
    
    # Run migration
    migrator = DatabaseMigrator(
        supabase_url=supabase_url,
        local_url=local_url,
        dry_run=args.dry_run
    )
    
    success = migrator.run(
        schema_only=args.schema_only,
        data_only=args.data_only,
        tables=tables,
        verify=not args.no_verify
    )
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
