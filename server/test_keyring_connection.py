#!/usr/bin/env python3
"""
Test connection using keyring password
"""
import psycopg2
import keyring
from urllib.parse import quote_plus

def test_connection():
    try:
        # Get password from keyring
        password = keyring.get_password('postgresql', 'qbrainlabs_db_user')
        if not password:
            print("❌ No password found in keyring")
            return False
            
        # URL encode the password to handle special characters
        encoded_password = quote_plus(password)
        
        # Test connection
        conn_str = f"postgresql://qbrainlabs_db_user:{encoded_password}@localhost:5432/qbrainlabs"
        print(f"🔌 Testing connection to localhost:5432/qbrainlabs")
        
        conn = psycopg2.connect(conn_str)
        with conn.cursor() as cur:
            cur.execute("SELECT version()")
            version = cur.fetchone()[0]
            print(f"✅ Connected: {version.split(',')[0]}")
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    test_connection()
