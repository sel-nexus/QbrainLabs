"""
Network utilities for detecting server IP addresses and managing CORS dynamically.
"""
import socket
import ipaddress
from typing import List, Set, Optional
import logging

logger = logging.getLogger(__name__)


def get_local_ip_addresses() -> List[str]:
    """
    Detect all local IP addresses (both private and public) of the server.
    Returns a list of IP addresses excluding loopback.
    """
    ip_addresses: Set[str] = set()
    
    try:
        # Get hostname
        hostname = socket.gethostname()
        
        # Get all IP addresses associated with hostname
        try:
            addr_info = socket.getaddrinfo(hostname, None, socket.AF_INET)
            for addr_tuple in addr_info:
                ip = addr_tuple[4][0]
                if ip and ip != '127.0.0.1':
                    ip_addresses.add(ip)
        except socket.gaierror:
            pass
        
        # Also check all network interfaces
        try:
            import netifaces
            for interface in netifaces.interfaces():
                addrs = netifaces.ifaddresses(interface)
                if netifaces.AF_INET in addrs:
                    for addr_info in addrs[netifaces.AF_INET]:
                        ip = addr_info.get('addr')
                        if ip and ip != '127.0.0.1':
                            ip_addresses.add(ip)
        except ImportError:
            # netifaces not available, try alternative method
            pass
        except Exception as e:
            logger.debug(f"Error getting network interfaces: {e}")
        
        # Fallback: Connect to external address to determine local IP
        try:
            # Connect to a public DNS server to determine local IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            if local_ip and local_ip != '127.0.0.1':
                ip_addresses.add(local_ip)
        except Exception as e:
            logger.debug(f"Error determining local IP via socket: {e}")

        # Get Public IP
        try:
            import urllib.request
            # Set a short timeout to avoid hanging if internet is slow/unavailable
            with urllib.request.urlopen('https://checkip.amazonaws.com', timeout=3) as response:
                public_ip = response.read().decode('utf-8').strip()
                if public_ip:
                    ip_addresses.add(public_ip)
        except Exception as e:
            logger.debug(f"Error getting public IP: {e}")
    
    except Exception as e:
        logger.warning(f"Error detecting IP addresses: {e}")
    
    return sorted(list(ip_addresses))


def is_private_ip(ip: str) -> bool:
    """Check if an IP address is private (RFC 1918)."""
    try:
        ip_obj = ipaddress.ip_address(ip)
        return ip_obj.is_private
    except ValueError:
        return False


def is_public_ip(ip: str) -> bool:
    """Check if an IP address is public (not private or loopback)."""
    try:
        ip_obj = ipaddress.ip_address(ip)
        return not (ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local)
    except ValueError:
        return False


def get_cors_origins_for_ips(ip_addresses: List[str], client_port: int = 5173) -> List[str]:
    """
    Generate CORS origins for a list of IP addresses.
    Includes both HTTP and HTTPS variants, and both the specified port and common ports.
    """
    origins: Set[str] = set()
    
    # Always include localhost origins
    origins.add("http://localhost:5173")
    origins.add("http://127.0.0.1:5173")
    origins.add("http://localhost:3000")
    origins.add("http://127.0.0.1:3000")
    
    # Add origins for each detected IP
    for ip in ip_addresses:
        # HTTP origins
        origins.add(f"http://{ip}:{client_port}")
        origins.add(f"http://{ip}:80")
        origins.add(f"http://{ip}:3000")
        
        # HTTPS origins (for production)
        origins.add(f"https://{ip}:443")
        origins.add(f"https://{ip}:{client_port}")
    
    return sorted(list(origins))


def origin_matches_server_ip(origin: str, server_ips: List[str], client_port: int = 5173) -> bool:
    """
    Check if a CORS origin matches any of the server's IP addresses.
    Supports both HTTP and HTTPS, and various ports.
    """
    if not origin:
        return False
    
    # Extract hostname/IP from origin
    try:
        # Remove protocol
        if origin.startswith("http://"):
            hostname = origin[7:]
        elif origin.startswith("https://"):
            hostname = origin[8:]
        else:
            return False
        
        # Remove port if present
        if ":" in hostname:
            hostname, port = hostname.rsplit(":", 1)
            try:
                port = int(port)
            except ValueError:
                return False
        else:
            port = None
        
        # Check if hostname matches any server IP
        if hostname in server_ips:
            return True
        
        # Also check if it's localhost/127.0.0.1
        if hostname in ["localhost", "127.0.0.1"]:
            return True
            
        # Allow requests if the hostname matches the detected server IPs
        # This covers cases where the request comes effectively from the server itself (e.g. proxy)
        if hostname in server_ips: 
            return True
        
        # Try to resolve hostname to IP and check
        try:
            resolved_ip = socket.gethostbyname(hostname)
            if resolved_ip in server_ips:
                return True
        except socket.gaierror:
            pass
        
        return False
    
    except Exception as e:
        logger.debug(f"Error checking origin match: {e}")
        return False
