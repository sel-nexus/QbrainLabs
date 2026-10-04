#!/usr/bin/env python3
"""
Debug the exact location of the tuple index error
"""
import psycopg2
from psycopg2.extras import RealDictCursor
from urllib.parse import quote_plus
import keyring
import traceback

def debug_migration_error():
    try:
        # Get password from keyring
        password = keyring.get_password('postgresql', 'qbrainlabs_db_user')
        encoded_password = quote_plus(password)
        
        # Connect to Supabase
        supabase_conn = psycopg2.connect("postgresql://postgres.ngizbskgujghosbyguqw:mCPLxdcjY0W2PlwT@aws-1-us-east-1.pooler.supabase.com:6543/postgres")
        
        def get_table_schema(conn, table_name: str):
            """Get detailed schema information for a table."""
            schema = {
                'columns': [],
                'primary_key': None,
                'foreign_keys': [],
                'indexes': [],
                'constraints': []
            }
            
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                try:
                    # Get columns
                    print(f"Getting columns for {table_name}...")
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
                    print(f"  Found {len(schema['columns'])} columns")
                    
                    # Get primary key
                    print(f"Getting primary key for {table_name}...")
                    cur.execute("""
                        SELECT a.attname
                        FROM pg_index i
                        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                        WHERE i.indrelid = %s::regclass AND i.indisprimary
                    """, (table_name,))
                    pk_results = cur.fetchall()
                    pk_cols = []
                    for row in pk_results:
                        if isinstance(row, dict) and 'attname' in row:
                            pk_cols.append(row['attname'])
                        elif hasattr(row, 'attname'):
                            pk_cols.append(row.attname)
                        elif len(row) > 0:
                            pk_cols.append(row[0])
                    if pk_cols:
                        schema['primary_key'] = pk_cols
                    print(f"  Primary key: {schema['primary_key']}")
                    
                    # Get foreign keys
                    print(f"Getting foreign keys for {table_name}...")
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
                    print(f"  Found {len(schema['foreign_keys'])} foreign keys")
                    
                    # Get indexes
                    print(f"Getting indexes for {table_name}...")
                    cur.execute("""
                        SELECT
                            indexname,
                            indexdef
                        FROM pg_indexes
                        WHERE schemaname = 'public' AND tablename = %s
                        AND indexname NOT LIKE '%%_pkey'
                    """, (table_name,))
                    schema['indexes'] = cur.fetchall()
                    print(f"  Found {len(schema['indexes'])} indexes")
                    
                except Exception as e:
                    print(f"Error in get_table_schema for {table_name}: {e}")
                    traceback.print_exc()
                    raise
                
            return schema
        
        # Test with workshops table
        print("Testing workshops table schema extraction...")
        schema = get_table_schema(supabase_conn, 'workshops')
        print("✅ Workshops schema extracted successfully")
        
        supabase_conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    debug_migration_error()
