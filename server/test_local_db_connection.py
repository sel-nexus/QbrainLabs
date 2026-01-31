"""
Local PostgreSQL Connection Test Script
========================================
This script tests the connection to your local PostgreSQL database
and verifies basic functionality.

Usage:
    python test_local_db_connection.py [--url CONNECTION_STRING]
"""

import os
import sys
import argparse
from pathlib import Path
from datetime import datetime

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
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
    script_dir.parent / ".env",
    script_dir / ".env",
]

for env_file in env_files:
    if env_file.exists():
        load_dotenv(env_file, override=True)
        print(f"📁 Loaded environment from: {env_file}")
        break


def test_connection(database_url: str) -> bool:
    """Test basic database connection and return success status."""
    print("\n" + "="*60)
    print("🔌 TESTING DATABASE CONNECTION")
    print("="*60)
    
    try:
        print(f"📡 Connecting to: {database_url.split('@')[1] if '@' in database_url else database_url}")
        
        conn = psycopg2.connect(
            database_url,
            connect_timeout=10
        )
        
        with conn.cursor() as cur:
            # Test basic query
            cur.execute("SELECT version()")
            version = cur.fetchone()[0]
            print(f"✅ Connected successfully!")
            print(f"📊 PostgreSQL version: {version.split(',')[0]}")
            
            # Get database info
            cur.execute("SELECT current_database()")
            db_name = cur.fetchone()[0]
            print(f"📊 Database: {db_name}")
            
            # Get current user
            cur.execute("SELECT current_user")
            user = cur.fetchone()[0]
            print(f"👤 User: {user}")
            
        conn.close()
        return True
        
    except psycopg2.OperationalError as e:
        print(f"❌ Connection failed: {e}")
        print("\n💡 Common solutions:")
        print("   1. Ensure PostgreSQL is running: pg_ctl status")
        print("   2. Check if database exists: psql -l")
        print("   2. Create database: createdb qbrainlabs")
        print("   4. Verify connection string format")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def test_database_operations(database_url: str) -> bool:
    """Test basic database operations (create, read, update, delete)."""
    print("\n" + "="*60)
    print("🧪 TESTING DATABASE OPERATIONS")
    print("="*60)
    
    try:
        conn = psycopg2.connect(database_url)
        conn.autocommit = False
        
        with conn.cursor() as cur:
            print("📝 Testing table creation...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS test_connection (
                    id SERIAL PRIMARY KEY,
                    message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            print("📝 Testing INSERT...")
            cur.execute("""
                INSERT INTO test_connection (message) 
                VALUES (%s) RETURNING id
            """, (f"Test message at {datetime.now()}",))
            insert_id = cur.fetchone()[0]
            
            print("📝 Testing SELECT...")
            cur.execute("""
                SELECT id, message, created_at 
                FROM test_connection 
                WHERE id = %s
            """, (insert_id,))
            result = cur.fetchone()
            print(f"   Retrieved: ID={result[0]}, Message='{result[1]}'")
            
            print("📝 Testing UPDATE...")
            cur.execute("""
                UPDATE test_connection 
                SET message = %s 
                WHERE id = %s
            """, (f"Updated message at {datetime.now()}", insert_id))
            
            print("📝 Testing DELETE...")
            cur.execute("DELETE FROM test_connection WHERE id = %s", (insert_id,))
            
            print("📝 Testing table cleanup...")
            cur.execute("DROP TABLE IF EXISTS test_connection")
            
            conn.commit()
            print("✅ All operations completed successfully!")
            
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Operations test failed: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False


def test_schema_info(database_url: str) -> bool:
    """Test schema information retrieval."""
    print("\n" + "="*60)
    print("📋 TESTING SCHEMA INFORMATION")
    print("="*60)
    
    try:
        conn = psycopg2.connect(database_url)
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # List all tables
            print("📊 Tables in public schema:")
            cur.execute("""
                SELECT table_name, table_type
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """)
            tables = cur.fetchall()
            
            if tables:
                for table in tables:
                    print(f"   - {table['table_name']} ({table['table_type']})")
            else:
                print("   (No tables found)")
            
            # Check for extensions
            print("\n🔧 Installed extensions:")
            cur.execute("""
                SELECT extname, extversion
                FROM pg_extension
                ORDER BY extname
            """)
            extensions = cur.fetchall()
            
            if extensions:
                for ext in extensions:
                    print(f"   - {ext['extname']} v{ext['extversion']}")
            else:
                print("   (No extensions found)")
            
            # Database size
            print("\n💾 Database size:")
            cur.execute("""
                SELECT pg_size_pretty(pg_database_size(current_database()))
            """)
            size = cur.fetchone()[0]
            print(f"   Total size: {size}")
            
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Schema test failed: {e}")
        return False


def test_permissions(database_url: str) -> bool:
    """Test database permissions."""
    print("\n" + "="*60)
    print("🔐 TESTING PERMISSIONS")
    print("="*60)
    
    try:
        conn = psycopg2.connect(database_url)
        
        with conn.cursor() as cur:
            # Test CREATE TABLE permission
            print("📝 Testing CREATE permission...")
            try:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS test_permissions (
                        id SERIAL PRIMARY KEY
                    )
                """)
                cur.execute("DROP TABLE IF EXISTS test_permissions")
                print("   ✅ CREATE permission granted")
            except Exception as e:
                print(f"   ❌ CREATE permission denied: {e}")
            
            # Test INSERT permission
            print("📝 Testing INSERT permission...")
            cur.execute("CREATE TEMP TABLE test_permissions (id SERIAL PRIMARY KEY)")
            try:
                cur.execute("INSERT INTO test_permissions DEFAULT VALUES")
                print("   ✅ INSERT permission granted")
            except Exception as e:
                print(f"   ❌ INSERT permission denied: {e}")
            
            # Test SELECT permission
            print("📝 Testing SELECT permission...")
            try:
                cur.execute("SELECT COUNT(*) FROM test_permissions")
                print("   ✅ SELECT permission granted")
            except Exception as e:
                print(f"   ❌ SELECT permission denied: {e}")
            
            # Test UPDATE permission
            print("📝 Testing UPDATE permission...")
            try:
                cur.execute("UPDATE test_permissions SET id = 1 WHERE id = 1")
                print("   ✅ UPDATE permission granted")
            except Exception as e:
                print(f"   ❌ UPDATE permission denied: {e}")
            
            # Test DELETE permission
            print("📝 Testing DELETE permission...")
            try:
                cur.execute("DELETE FROM test_permissions")
                print("   ✅ DELETE permission granted")
            except Exception as e:
                print(f"   ❌ DELETE permission denied: {e}")
            
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Permissions test failed: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description='Test local PostgreSQL database connection')
    parser.add_argument(
        '--url',
        type=str,
        help='Database connection URL (overrides environment)'
    )
    parser.add_argument(
        '--operations',
        action='store_true',
        help='Test CRUD operations'
    )
    parser.add_argument(
        '--schema',
        action='store_true',
        help='Test schema information'
    )
    parser.add_argument(
        '--permissions',
        action='store_true',
        help='Test database permissions'
    )
    parser.add_argument(
        '--all',
        action='store_true',
        help='Run all tests'
    )
    
    args = parser.parse_args()
    
    # Get database URL
    database_url = args.url or os.getenv('DATABASE_URL') or os.getenv('LOCAL_DATABASE_URL') or 'postgresql://qbrainlabs_db_user:Ilmnps@$2026@localhost:5432/qbrainlabs'
    
    if not database_url:
        print("❌ No database URL provided!")
        print("\nProvide it via:")
        print("  1. --url argument")
        print("  2. DATABASE_URL environment variable")
        print("  3. LOCAL_DATABASE_URL environment variable")
        print("\nExample:")
        print("  python test_local_db_connection.py --url 'postgresql://qbrainlabs_db_user:<password>@localhost:5432/qbrainlabs'")
        sys.exit(1)
    
    print("\n" + "="*60)
    print("🚀 LOCAL POSTGRESQL CONNECTION TEST")
    print("="*60)
    print(f"   Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run tests
    success = True
    
    # Basic connection test (always run)
    success = test_connection(database_url) and success
    
    if args.all or args.operations:
        success = test_database_operations(database_url) and success
    
    if args.all or args.schema:
        success = test_schema_info(database_url) and success
    
    if args.all or args.permissions:
        success = test_permissions(database_url) and success
    
    # Summary
    print("\n" + "="*60)
    print("📋 TEST SUMMARY")
    print("="*60)
    
    if success:
        print("✅ All tests passed!")
        print("\n🎉 Your local PostgreSQL database is ready for use!")
        print("\n📝 Next steps:")
        print("   1. Update your .env file:")
        print(f"      DATABASE_URL={database_url}")
        print("   2. Run the migration script:")
        print("      python migrate_supabase_to_local.py")
        print("   3. Start your application")
    else:
        print("⚠️ Some tests failed. Check the output above for details.")
        print("\n💡 Common solutions:")
        print("   1. Start PostgreSQL service: pg_ctl start -D /path/to/data")
        print("   2. Create database: createdb qbrainlabs")
        print("   3. Check connection string format")
        print("   4. Verify user permissions")
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
