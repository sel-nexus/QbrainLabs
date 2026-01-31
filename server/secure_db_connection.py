"""
Secure PostgreSQL Connection with Encrypted Password
====================================================
This script demonstrates how to use encrypted passwords for database connections
and provides utilities for secure credential management.

Methods covered:
1. Environment variables with encrypted password
2. .pgpass file for PostgreSQL
3. Connection string with SSL/TLS
4. Keyring for secure storage
"""

import os
import sys
import getpass
import base64
from pathlib import Path
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("❌ psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

try:
    from cryptography.fernet import Fernet
except ImportError:
    print("❌ cryptography not installed. Run: pip install cryptography")
    sys.exit(1)

try:
    import keyring
except ImportError:
    print("⚠️ keyring not installed. Run: pip install keyring (optional)")
    keyring = None


class SecureDatabaseConnection:
    """Handles secure database connections with encrypted passwords."""
    
    def __init__(self, host: str, port: str, database: str, username: str):
        self.host = host
        self.port = port
        self.database = database
        self.username = username
        self.password = None
        self.encrypted_password = None
    
    @staticmethod
    def generate_key(password: str, salt: bytes = None) -> bytes:
        """Generate encryption key from password using PBKDF2."""
        if salt is None:
            salt = b'secure_salt_for_qbrainlabs_2026'  # Change this in production
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return key
    
    @staticmethod
    def encrypt_password(password: str, encryption_key: bytes) -> str:
        """Encrypt password using Fernet symmetric encryption."""
        f = Fernet(encryption_key)
        encrypted_password = f.encrypt(password.encode())
        return base64.urlsafe_b64encode(encrypted_password).decode()
    
    @staticmethod
    def decrypt_password(encrypted_password: str, encryption_key: bytes) -> str:
        """Decrypt password using Fernet symmetric encryption."""
        try:
            encrypted_data = base64.urlsafe_b64decode(encrypted_password.encode())
            f = Fernet(encryption_key)
            decrypted_password = f.decrypt(encrypted_data).decode()
            return decrypted_password
        except Exception as e:
            raise ValueError(f"Failed to decrypt password: {e}")
    
    def set_password(self, password: str, encryption_key: bytes = None):
        """Set and encrypt password."""
        if encryption_key is None:
            encryption_key = self.generate_key('default_key_change_me')
        
        self.password = password
        self.encrypted_password = self.encrypt_password(password, encryption_key)
    
    def get_password(self, encryption_key: bytes = None) -> str:
        """Get decrypted password."""
        if self.password:
            return self.password
        
        if self.encrypted_password:
            if encryption_key is None:
                encryption_key = self.generate_key('default_key_change_me')
            return self.decrypt_password(self.encrypted_password, encryption_key)
        
        raise ValueError("No password set")
    
    def get_connection_string(self, include_password: bool = True) -> str:
        """Get database connection string."""
        if include_password and self.password:
            return f"postgresql://{self.username}:{self.password}@{self.host}:{self.port}/{self.database}"
        elif include_password and self.encrypted_password:
            return f"postgresql://{self.username}:[ENCRYPTED]@{self.host}:{self.port}/{self.database}"
        else:
            return f"postgresql://{self.username}@{self.host}:{self.port}/{self.database}"
    
    def test_connection(self, encryption_key: bytes = None) -> bool:
        """Test database connection."""
        try:
            password = self.get_password(encryption_key)
            conn_str = self.get_connection_string(include_password=True)
            
            conn = psycopg2.connect(
                conn_str,
                sslmode='require',  # Always use SSL for security
                connect_timeout=10
            )
            
            with conn.cursor() as cur:
                cur.execute("SELECT version()")
                version = cur.fetchone()[0]
                print(f"✅ Connected successfully!")
                print(f"📊 PostgreSQL version: {version.split(',')[0]}")
            
            conn.close()
            return True
            
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False


def setup_pgpass_file():
    """Setup .pgpass file for PostgreSQL password storage."""
    print("\n" + "="*60)
    print("🔐 SETUP .PGPASS FILE")
    print("="*60)
    
    home_dir = Path.home()
    pgpass_file = home_dir / ".pgpass"
    
    print(f"📁 .pgpass location: {pgpass_file}")
    print("\n📝 .pgpass format: hostname:port:database:username:password")
    print("📝 Example: localhost:5432:qbrainlabs:qbrainlabs_db_user:your_password")
    
    # Check if .pgpass exists
    if pgpass_file.exists():
        print("✅ .pgpass file already exists")
        choice = input("   View existing entries? (y/n): ").lower()
        if choice == 'y':
            with open(pgpass_file, 'r') as f:
                lines = f.readlines()
                for i, line in enumerate(lines, 1):
                    parts = line.strip().split(':')
                    if len(parts) == 5:
                        print(f"   {i}. {parts[0]}:{parts[1]}:{parts[2]}:{parts[3]}:***")
    else:
        print("📝 Creating new .pgpass file...")
        hostname = input("   Hostname (default: localhost): ") or "localhost"
        port = input("   Port (default: 5432): ") or "5432"
        database = input("   Database name (default: qbrainlabs): ") or "qbrainlabs"
        username = input("   Username (default: qbrainlabs_db_user): ") or "qbrainlabs_db_user"
        password = getpass.getpass("   Password: ")
        
        pgpass_entry = f"{hostname}:{port}:{database}:{username}:{password}\n"
        
        with open(pgpass_file, 'w') as f:
            f.write(pgpass_entry)
        
        # Set correct permissions (600)
        os.chmod(pgpass_file, 0o600)
        print("✅ .pgpass file created with secure permissions")
    
    print("\n💡 Usage:")
    print("   1. Set DATABASE_URL without password: postgresql://qbrainlabs_db_user@localhost:5432/qbrainlabs")
    print("   2. PostgreSQL will automatically read .pgpass for authentication")
    print("   3. Ensure .pgpass has 600 permissions (read/write for owner only)")


def setup_keyring_storage():
    """Setup keyring for secure password storage."""
    if not keyring:
        print("❌ keyring not available. Install with: pip install keyring")
        return
    
    print("\n" + "="*60)
    print("🔐 SETUP KEYRING STORAGE")
    print("="*60)
    
    service_name = "postgresql"
    username = "qbrainlabs_db_user"
    
    # Check if password already stored
    try:
        stored_password = keyring.get_password(service_name, username)
        if stored_password:
            print("✅ Password already found in keyring")
            choice = input("   Update stored password? (y/n): ").lower()
            if choice != 'y':
                return
    except Exception as e:
        print(f"⚠️ Keyring access issue: {e}")
    
    # Store new password
    password = getpass.getpass("   Enter database password: ")
    try:
        keyring.set_password(service_name, username, password)
        print("✅ Password stored securely in keyring")
    except Exception as e:
        print(f"❌ Failed to store password: {e}")
    
    print("\n💡 Usage:")
    print("   Retrieve password with: keyring.get_password('postgresql', 'qbrainlabs_db_user')")


def create_encrypted_env_file():
    """Create encrypted environment file with database credentials."""
    print("\n" + "="*60)
    print("🔐 SETUP ENCRYPTED ENVIRONMENT")
    print("="*60)
    
    # Generate encryption key
    master_password = getpass.getpass("   Enter master password for encryption: ")
    encryption_key = SecureDatabaseConnection.generate_key(master_password)
    
    # Get database credentials
    host = input("   Host (default: localhost): ") or "localhost"
    port = input("   Port (default: 5432): ") or "5432"
    database = input("   Database (default: qbrainlabs): ") or "qbrainlabs"
    username = input("   Username (default: qbrainlabs_db_user): ") or "qbrainlabs_db_user"
    password = getpass.getpass("   Database password: ")
    
    # Create secure connection object
    secure_conn = SecureDatabaseConnection(host, port, database, username)
    secure_conn.set_password(password, encryption_key)
    
    # Save encrypted data to file
    env_file = Path(__file__).parent / ".env.secure"
    
    with open(env_file, 'w') as f:
        f.write(f"# Secure Database Configuration\n")
        f.write(f"# Master password required to decrypt\n")
        f.write(f"DB_HOST={host}\n")
        f.write(f"DB_PORT={port}\n")
        f.write(f"DB_NAME={database}\n")
        f.write(f"DB_USER={username}\n")
        f.write(f"DB_ENCRYPTED_PASSWORD={secure_conn.encrypted_password}\n")
    
    os.chmod(env_file, 0o600)
    print(f"✅ Encrypted configuration saved to: {env_file}")
    
    # Test decryption
    try:
        test_password = SecureDatabaseConnection.decrypt_password(
            secure_conn.encrypted_password, 
            encryption_key
        )
        print("✅ Encryption/decryption test passed")
    except Exception as e:
        print(f"❌ Encryption test failed: {e}")
    
    print("\n💡 Usage:")
    print("   1. Store master password securely (environment variable, keyring, etc.)")
    print("   2. Use decrypt_password() function to retrieve database password")
    print("   3. Never commit .env.secure to version control")


def test_ssl_connection():
    """Test SSL/TLS connection to PostgreSQL."""
    print("\n" + "="*60)
    print("🔒 TESTING SSL/TLS CONNECTION")
    print("="*60)
    
    # SSL connection string options
    ssl_modes = {
        'disable': 'No SSL',
        'allow': 'Prefer SSL if available',
        'prefer': 'Prefer SSL (default)',
        'require': 'Require SSL',
        'verify-ca': 'Require SSL + verify CA',
        'verify-full': 'Require SSL + verify CA + hostname'
    }
    
    print("📋 SSL Modes:")
    for mode, desc in ssl_modes.items():
        print(f"   {mode}: {desc}")
    
    # Test with different SSL modes
    database_url = "postgresql://qbrainlabs_db_user:Ilmnps@$2026@localhost:5432/qbrainlabs"
    
    for ssl_mode in ['require', 'verify-ca', 'verify-full']:
        print(f"\n🔌 Testing SSL mode: {ssl_mode}")
        try:
            conn = psycopg2.connect(
                database_url,
                sslmode=ssl_mode,
                sslrootdir=None,  # Use system CA certificates
                connect_timeout=10
            )
            
            with conn.cursor() as cur:
                cur.execute("SELECT ssl_is_used(), ssl_cipher()")
                ssl_used, cipher = cur.fetchone()
                print(f"   ✅ SSL used: {ssl_used}, Cipher: {cipher}")
            
            conn.close()
            
        except Exception as e:
            print(f"   ❌ SSL test failed: {e}")


def main():
    """Main function for secure database setup."""
    print("\n" + "="*60)
    print("🔐 SECURE DATABASE CONNECTION SETUP")
    print("="*60)
    
    print("\n📋 Available options:")
    print("   1. Setup .pgpass file (PostgreSQL native)")
    print("   2. Setup keyring storage (system keyring)")
    print("   3. Create encrypted environment file")
    print("   4. Test SSL/TLS connection")
    print("   5. Test encrypted password connection")
    
    choice = input("\n   Select option (1-5): ").strip()
    
    if choice == '1':
        setup_pgpass_file()
    elif choice == '2':
        setup_keyring_storage()
    elif choice == '3':
        create_encrypted_env_file()
    elif choice == '4':
        test_ssl_connection()
    elif choice == '5':
        # Test encrypted password connection
        master_password = getpass.getpass("   Enter master password: ")
        encryption_key = SecureDatabaseConnection.generate_key(master_password)
        
        secure_conn = SecureDatabaseConnection(
            "localhost", "5432", "qbrainlabs", "qbrainlabs_db_user"
        )
        
        # Load from encrypted file if exists
        env_file = Path(__file__).parent / ".env.secure"
        if env_file.exists():
            with open(env_file, 'r') as f:
                for line in f:
                    if line.startswith('DB_ENCRYPTED_PASSWORD='):
                        secure_conn.encrypted_password = line.split('=', 1)[1].strip()
                        break
        
        if secure_conn.encrypted_password:
            print("🔌 Testing connection with encrypted password...")
            success = secure_conn.test_connection(encryption_key)
            if success:
                print("✅ Encrypted connection test successful!")
            else:
                print("❌ Encrypted connection test failed!")
        else:
            print("❌ No encrypted password found. Run option 3 first.")
    else:
        print("❌ Invalid option")


if __name__ == "__main__":
    main()
