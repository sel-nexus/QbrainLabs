
import sqlite3
import os

db_path = "hotspotmatrix.db"

def check_db():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("\n--- Checking 'admin@qbrainlabs.com' ---")
        cursor.execute("SELECT email, role, status, is_admin, password_hash FROM users WHERE email=?", ("admin@qbrainlabs.com",))
        row = cursor.fetchone()
        if row:
            print(f"User FOUND: {row[0]}")
            print(f"Role: {row[1]}")
            print(f"Status: {row[2]}")
            print(f"Is Admin: {row[3]}")
            print(f"Password Hash: {row[4][:20]}...")
        else:
            print("User 'admin@qbrainlabs.com' NOT FOUND")

        print("\n--- Checking 'admin@hotspotmatrix.ai' ---")
        cursor.execute("SELECT email, role, status, is_admin, password_hash FROM users WHERE email=?", ("admin@hotspotmatrix.ai",))
        row = cursor.fetchone()
        if row:
            print(f"User FOUND: {row[0]}")
            print(f"Role: {row[1]}")
            print(f"Status: {row[2]}")
            print(f"Is Admin: {row[3]}")
            print(f"Password Hash: {row[4][:20]}...")
        else:
            print("User 'admin@hotspotmatrix.ai' NOT FOUND")

        conn.close()
    except Exception as e:
        print(f"Error querying DB: {e}")

if __name__ == "__main__":
    check_db()
