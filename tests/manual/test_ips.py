
import sys
import os

# Add server directory to path
sys.path.append(os.path.join(os.getcwd(), 'server'))

from app.core.network_utils import get_local_ip_addresses, get_cors_origins_for_ips

ips = get_local_ip_addresses()
print(f"Detected IPs: {ips}")

origins = get_cors_origins_for_ips(ips)
print(f"Allowed Origins (from detected IPs):")
for origin in origins:
    print(f"  - {origin}")

from app.core.config import settings
print(f"Configured Origins (from .env): {settings.CORS_ORIGINS}")
