#!/usr/bin/env python3
"""
Migration script to replicate SQLite database schema and data to PostgreSQL.
"""

import sqlite3
import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv
from urllib.parse import urlparse

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Database paths
SQLITE_DB = os.path.join(os.path.dirname(__file__), 'hotspotmatrix.db')
POSTGRES_URL = os.getenv('DATABASE_URL')

def parse_postgres_url(url):
    """Parse PostgreSQL connection URL."""
    parsed = urlparse(url)
    return {
        'dbname': parsed.path[1:],
        'user': parsed.username,
        'password': parsed.password,
        'host': parsed.hostname,
        'port': parsed.port or 5432
    }

# SQLite to PostgreSQL type mapping
TYPE_MAPPING = {
    'CHAR(36)': 'VARCHAR(36)',
    'VARCHAR': 'TEXT',  # Use TEXT for unlimited VARCHAR to handle JSON fields
    'TEXT': 'TEXT',
    'INTEGER': 'INTEGER',
    'BOOLEAN': 'BOOLEAN',
    'DATETIME': 'TIMESTAMP',
    'FLOAT': 'DOUBLE PRECISION',
}

def get_postgres_type(sqlite_type):
    """Convert SQLite type to PostgreSQL type."""
    sqlite_type = sqlite_type.upper().strip()
    
    # Direct mapping
    if sqlite_type in TYPE_MAPPING:
        return TYPE_MAPPING[sqlite_type]
    
    # Handle VARCHAR with length
    if sqlite_type.startswith('VARCHAR('):
        return sqlite_type
    
    # Handle CHAR with length
    if sqlite_type.startswith('CHAR('):
        return sqlite_type.replace('CHAR(', 'VARCHAR(')
    
    # Default mappings
    if 'INT' in sqlite_type:
        return 'INTEGER'
    if 'CHAR' in sqlite_type or 'TEXT' in sqlite_type:
        return 'TEXT'
    if 'REAL' in sqlite_type or 'FLOAT' in sqlite_type or 'DOUBLE' in sqlite_type:
        return 'DOUBLE PRECISION'
    if 'BOOL' in sqlite_type:
        return 'BOOLEAN'
    if 'BLOB' in sqlite_type:
        return 'BYTEA'
    if 'DATE' in sqlite_type or 'TIME' in sqlite_type:
        return 'TIMESTAMP'
    
    return 'TEXT'

def get_sqlite_tables(cursor):
    """Get all table names from SQLite database."""
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    return [row[0] for row in cursor.fetchall()]

def get_sqlite_table_info(cursor, table_name):
    """Get column information for a SQLite table."""
    cursor.execute(f"PRAGMA table_info({table_name})")
    return cursor.fetchall()

def get_sqlite_foreign_keys(cursor, table_name):
    """Get foreign key information for a SQLite table."""
    cursor.execute(f"PRAGMA foreign_key_list({table_name})")
    return cursor.fetchall()

def get_sqlite_indexes(cursor, table_name):
    """Get index information for a SQLite table."""
    cursor.execute(f"PRAGMA index_list({table_name})")
    indexes = cursor.fetchall()
    result = []
    for idx in indexes:
        idx_name = idx[1]
        is_unique = idx[2]
        cursor.execute(f"PRAGMA index_info({idx_name})")
        columns = [col[2] for col in cursor.fetchall()]
        result.append((idx_name, is_unique, columns))
    return result

def create_postgres_table(pg_cursor, table_name, columns, foreign_keys, deferred_fks):
    """Create a PostgreSQL table based on SQLite schema (FKs added later)."""
    col_defs = []
    pk_columns = []
    
    for col in columns:
        cid, name, col_type, notnull, default_val, pk = col
        pg_type = get_postgres_type(col_type)
        
        col_def = f'"{name}" {pg_type}'
        if notnull:
            col_def += ' NOT NULL'
        if default_val is not None:
            # Handle SQLite default values
            if default_val.upper() in ('NULL', 'CURRENT_TIMESTAMP'):
                col_def += f' DEFAULT {default_val}'
            elif default_val.isdigit():
                col_def += f' DEFAULT {default_val}'
            else:
                col_def += f" DEFAULT '{default_val}'"
        if pk:
            pk_columns.append(name)
        
        col_defs.append(col_def)
    
    # Add primary key constraint
    if pk_columns:
        pk_cols_quoted = ', '.join(['"' + c + '"' for c in pk_columns])
        col_defs.append(f'PRIMARY KEY ({pk_cols_quoted})')
    
    # Store foreign keys to add later (avoids circular dependency issues)
    for fk in foreign_keys:
        fk_id, seq, ref_table, from_col, to_col, on_update, on_delete, match = fk
        deferred_fks.append((table_name, from_col, ref_table, to_col, on_delete, on_update))
    
    col_defs_str = ",\n  ".join(col_defs)
    create_sql = f'CREATE TABLE IF NOT EXISTS "{table_name}" (\n  {col_defs_str}\n)'
    
    try:
        pg_cursor.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
        pg_cursor.execute(create_sql)
        print(f"  ✓ Created table: {table_name}")
    except Exception as e:
        print(f"  ✗ Error creating table {table_name}: {e}")
        print(f"    SQL: {create_sql}")
        raise

def add_foreign_keys(pg_cursor, deferred_fks):
    """Add foreign key constraints after all tables are created."""
    for table_name, from_col, ref_table, to_col, on_delete, on_update in deferred_fks:
        fk_name = f"fk_{table_name}_{from_col}"[:63]
        alter_sql = f'ALTER TABLE "{table_name}" ADD CONSTRAINT "{fk_name}" FOREIGN KEY ("{from_col}") REFERENCES "{ref_table}" ("{to_col}")'
        if on_delete and on_delete != 'NO ACTION':
            alter_sql += f' ON DELETE {on_delete}'
        if on_update and on_update != 'NO ACTION':
            alter_sql += f' ON UPDATE {on_update}'
        
        try:
            pg_cursor.execute(alter_sql)
            print(f"  ✓ Added FK: {table_name}.{from_col} -> {ref_table}.{to_col}")
        except Exception as e:
            print(f"  ✗ Error adding FK {fk_name}: {e}")

def create_postgres_index(pg_cursor, table_name, idx_name, is_unique, columns):
    """Create a PostgreSQL index."""
    # Skip auto-generated primary key indexes
    if 'sqlite_autoindex' in idx_name:
        return
    
    unique_str = 'UNIQUE ' if is_unique else ''
    cols_str = ', '.join([f'"{c}"' for c in columns])
    
    # Generate a valid PostgreSQL index name
    pg_idx_name = f"idx_{table_name}_{'_'.join(columns)}"[:63]  # Max 63 chars
    
    create_sql = f'CREATE {unique_str}INDEX IF NOT EXISTS "{pg_idx_name}" ON "{table_name}" ({cols_str})'
    
    try:
        pg_cursor.execute(create_sql)
        print(f"  ✓ Created index: {pg_idx_name}")
    except Exception as e:
        print(f"  ✗ Error creating index {pg_idx_name}: {e}")

def migrate_data(sqlite_cursor, pg_cursor, table_name, columns):
    """Migrate data from SQLite to PostgreSQL."""
    col_names = [col[1] for col in columns]
    col_types = [col[2].upper() for col in columns]
    
    # Read all data from SQLite
    sqlite_cursor.execute(f'SELECT * FROM "{table_name}"')
    rows = sqlite_cursor.fetchall()
    
    if not rows:
        print(f"  - No data in table: {table_name}")
        return 0
    
    # Prepare INSERT statement
    placeholders = ', '.join(['%s'] * len(col_names))
    cols_str = ', '.join([f'"{c}"' for c in col_names])
    insert_sql = f'INSERT INTO "{table_name}" ({cols_str}) VALUES ({placeholders})'
    
    # Insert data
    count = 0
    for row in rows:
        # Convert SQLite values to PostgreSQL compatible values
        converted_row = []
        for i, val in enumerate(row):
            if val is None:
                converted_row.append(None)
            elif 'BOOL' in col_types[i]:
                # Convert SQLite integer (0/1) to Python boolean
                converted_row.append(bool(val) if val is not None else None)
            elif isinstance(val, str):
                converted_row.append(val)
            else:
                converted_row.append(val)
        
        try:
            pg_cursor.execute(insert_sql, converted_row)
            count += 1
        except Exception as e:
            print(f"  ✗ Error inserting row into {table_name}: {e}")
            print(f"    Row: {row}")
            raise
    
    print(f"  ✓ Migrated {count} rows to: {table_name}")
    return count

def main():
    print("=" * 60)
    print("SQLite to PostgreSQL Migration")
    print("=" * 60)
    
    # Parse PostgreSQL connection
    pg_params = parse_postgres_url(POSTGRES_URL)
    print(f"\nPostgreSQL: {pg_params['host']}:{pg_params['port']}/{pg_params['dbname']}")
    print(f"SQLite: {SQLITE_DB}")
    
    # Connect to databases
    print("\n[1] Connecting to databases...")
    sqlite_conn = sqlite3.connect(SQLITE_DB)
    sqlite_cursor = sqlite_conn.cursor()
    
    pg_conn = psycopg2.connect(**pg_params)
    pg_conn.autocommit = False
    pg_cursor = pg_conn.cursor()
    
    print("  ✓ Connected to SQLite")
    print("  ✓ Connected to PostgreSQL")
    
    try:
        # Get all tables
        tables = get_sqlite_tables(sqlite_cursor)
        print(f"\n[2] Found {len(tables)} tables to migrate")
        
        # Define table creation order (respecting foreign key dependencies)
        # Tables with no dependencies first, then tables that depend on them
        table_order = [
            'users',
            'organizations',
            'survey_templates',
            'workshops',
            'participants',
            'registered_participants',
            'use_cases',
            'votes',
            'surveys',
            'survey_questions',
            'survey_responses',
            'survey_answers',
            'participant_workshop_links',
            'organization_members',
            'organization_invitations',
            'organization_workshops',
            'organization_usage_logs',
            'template_collections',
            'marketplace_templates',
            'template_reviews',
            'template_downloads',
            'template_favorites',
            'template_collection_items',
        ]
        
        # Add any tables not in the order list
        for table in tables:
            if table not in table_order:
                table_order.append(table)
        
        # Filter to only existing tables
        table_order = [t for t in table_order if t in tables]
        
        # Create tables (without FKs to avoid circular dependencies)
        print("\n[3] Creating PostgreSQL tables...")
        deferred_fks = []
        for table in table_order:
            columns = get_sqlite_table_info(sqlite_cursor, table)
            foreign_keys = get_sqlite_foreign_keys(sqlite_cursor, table)
            create_postgres_table(pg_cursor, table, columns, foreign_keys, deferred_fks)
        
        # Add foreign keys after all tables exist
        print("\n[4] Adding foreign key constraints...")
        add_foreign_keys(pg_cursor, deferred_fks)
        
        # Create indexes
        print("\n[5] Creating indexes...")
        for table in table_order:
            indexes = get_sqlite_indexes(sqlite_cursor, table)
            for idx_name, is_unique, columns in indexes:
                create_postgres_index(pg_cursor, table, idx_name, is_unique, columns)
        
        # Migrate data
        print("\n[6] Migrating data...")
        total_rows = 0
        for table in table_order:
            columns = get_sqlite_table_info(sqlite_cursor, table)
            count = migrate_data(sqlite_cursor, pg_cursor, table, columns)
            total_rows += count
        
        # Commit transaction
        pg_conn.commit()
        
        print("\n" + "=" * 60)
        print(f"Migration completed successfully!")
        print(f"  - Tables created: {len(table_order)}")
        print(f"  - Total rows migrated: {total_rows}")
        print("=" * 60)
        
    except Exception as e:
        pg_conn.rollback()
        print(f"\n✗ Migration failed: {e}")
        raise
    finally:
        sqlite_conn.close()
        pg_conn.close()

if __name__ == '__main__':
    main()
