
import uvicorn
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(env_path)

if __name__ == "__main__":
    # Get configuration from environment
    host = os.getenv("SERVER_HOST", "0.0.0.0")
    port = int(os.getenv("SERVER_PORT", "8000"))
    use_https = os.getenv("USE_HTTPS", "false").lower() == "true"
    
    # Base configuration
    config = {
        "app": "app.main:app",
        "host": host,
        "port": port,
        "reload": True,  # auto-reload on file changes
    }
    
    # Add SSL configuration if enabled
    if use_https:
        certs_dir = Path(__file__).resolve().parent.parent / "certs"
        key_path = certs_dir / "key.pem"
        cert_path = certs_dir / "cert.pem"
        
        if key_path.exists() and cert_path.exists():
            print(f"Starting server with HTTPS on {host}:{port}")
            config["ssl_keyfile"] = str(key_path)
            config["ssl_certfile"] = str(cert_path)
        else:
            print(f"WARNING: SSL certificates not found at {certs_dir}. Falling back to HTTP.")
            print(f"Expected: {key_path} and {cert_path}")
    else:
        print(f"Starting server with HTTP on {host}:{port}")
        
    # Run server
    uvicorn.run(**config)
    
    # Trigger reload 1
