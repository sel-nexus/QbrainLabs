"""
Test Secure Database Configuration
==================================
This script tests the secure database configuration loading from .env.secure
"""

import os
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.append(str(Path(__file__).parent))

from app.core.config import settings, load_secure_db_config

def test_secure_config():
    """Test loading secure database configuration."""
    print("\n" + "="*60)
    print("🔐 TESTING SECURE DATABASE CONFIGURATION")
    print("="*60)
    
    # Check if secure file exists
    secure_file = Path(__file__).parent / ".env.secure"
    print(f"📁 Secure config file: {secure_file}")
    print(f"   Exists: {secure_file.exists()}")
    
    # Check for master password
    master_password = os.getenv('DB_MASTER_PASSWORD')
    print(f"🔑 Master password in environment: {'✅ Set' if master_password else '❌ Missing'}")
    
    if not master_password:
        print("\n⚠️ Set master password to test secure configuration:")
        print("   export DB_MASTER_PASSWORD='your_master_password'")
        print("   python test_secure_config.py")
        return False
    
    # Test loading secure config
    print("\n🔌 Testing secure configuration loading...")
    try:
        secure_url = load_secure_db_config()
        if secure_url:
            print("✅ Secure configuration loaded successfully!")
            # Show URL without password
            parts = secure_url.split('@')
            if len(parts) > 1:
                masked_url = f"postgresql://***@{parts[1]}"
                print(f"   Database URL: {masked_url}")
        else:
            print("❌ Failed to load secure configuration")
            return False
    except Exception as e:
        print(f"❌ Error loading secure configuration: {e}")
        return False
    
    # Test settings integration
    print("\n⚙️ Testing settings integration...")
    try:
        print(f"   Settings DATABASE_URL: {settings.DATABASE_URL.split('@')[0] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
        print("✅ Settings integration successful!")
    except Exception as e:
        print(f"❌ Settings integration failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = test_secure_config()
    
    if success:
        print("\n✅ All tests passed!")
        print("\n📝 Usage:")
        print("   1. Set DB_MASTER_PASSWORD environment variable")
        print("   2. Application will automatically use secure database config")
        print("   3. No need to set DATABASE_URL explicitly")
    else:
        print("\n❌ Tests failed. Check the output above.")
    
    sys.exit(0 if success else 1)
