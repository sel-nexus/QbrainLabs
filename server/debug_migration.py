#!/usr/bin/env python3
"""
Debug the migration script schema generation
"""
import psycopg2
from psycopg2.extras import RealDictCursor
from urllib.parse import quote_plus
import keyring

def debug_migration():
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
                
            return schema
        
        # Get schema for users table
        schema = get_table_schema(supabase_conn, 'users')
        
        print("Schema structure:")
        print(f"  Columns: {len(schema['columns'])}")
        print(f"  Primary key: {schema['primary_key']}")
        print(f"  PK type: {type(schema['primary_key'])}")
        
        if schema['primary_key']:
            print(f"  PK[0]: {schema['primary_key'][0]}")
            print(f"  PK[0] type: {type(schema['primary_key'][0])}")
        
        supabase_conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_migration()
