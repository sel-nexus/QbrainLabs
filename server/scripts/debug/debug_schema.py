#!/usr/bin/env python3
"""
Debug schema extraction from Supabase
"""
import psycopg2
from psycopg2.extras import RealDictCursor
from urllib.parse import quote_plus
import keyring

def debug_schema():
    try:
        # Get password from keyring
        password = keyring.get_password('postgresql', 'qbrainlabs_db_user')
        encoded_password = quote_plus(password)
        
        # Connect to Supabase
        supabase_conn = psycopg2.connect("postgresql://postgres.ngizbskgujghosbyguqw:mCPLxdcjY0W2PlwT@aws-1-us-east-1.pooler.supabase.com:6543/postgres")
        
        with supabase_conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get columns for users table
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
            """, ('users',))
            columns = cur.fetchall()
            
            print("Users table columns:")
            for i, col in enumerate(columns):
                print(f"  {i}: {col}")
            
            # Get primary key
            cur.execute("""
                SELECT a.attname
                FROM pg_index i
                JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                WHERE i.indrelid = %s::regclass AND i.indisprimary
            """, ('users',))
            pk_cols = cur.fetchall()
            print(f"\nPrimary key columns: {pk_cols}")
            
        supabase_conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_schema()
