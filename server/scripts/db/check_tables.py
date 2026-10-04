
import sqlite3
import os

db_path = "hotspotmatrix.db"

def list_tables():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("Tables found:")
        for table in tables:
            print(f"- {table[0]}")
            
            # If it looks like a user table, show columns
            if 'user' in table[0].lower():
                print(f"  Columns in {table[0]}:")
                cursor.execute(f"PRAGMA table_info({table[0]})")
                columns = cursor.fetchall()
                for col in columns:
                    print(f"    - {col[1]} ({col[2]})")

        conn.close()
    except Exception as e:
        print(f"Error querying DB: {e}")

if __name__ == "__main__":
    list_tables()
