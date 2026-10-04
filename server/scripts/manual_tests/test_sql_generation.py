#!/usr/bin/env python3
"""
Test the SQL generation step by step
"""
import psycopg2
from psycopg2.extras import RealDictCursor
from urllib.parse import quote_plus
import keyring

def generate_create_table_sql(table_name: str, schema):
    """Generate CREATE TABLE SQL from schema information."""
    columns = []
    
    print(f"Processing table: {table_name}")
    print(f"Number of columns: {len(schema['columns'])}")
    
    for i, col in enumerate(schema['columns']):
        print(f"  Column {i}: {col['column_name']} ({col['data_type']})")
        
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
    print(f"Primary key: {schema['primary_key']}")
    if schema['primary_key']:
        pk_cols = ', '.join(f'"{c}"' for c in schema['primary_key'])
        columns.append(f"PRIMARY KEY ({pk_cols})")
    
    create_sql = f'CREATE TABLE IF NOT EXISTS "{table_name}" (\n    '
    create_sql += ',\n    '.join(columns)
    create_sql += '\n);'
    
    return create_sql

def test_sql_generation():
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
        
        # Generate SQL
        sql = generate_create_table_sql('users', schema)
        print("\nGenerated SQL:")
        print(sql)
        
        supabase_conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_sql_generation()
