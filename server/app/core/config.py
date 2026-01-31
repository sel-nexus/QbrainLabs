"""Centralized Configuration Management

All application settings are managed here. Configuration values can be set via:
1. Environment variables (recommended for production)
2. .env file (for local development)
3. .env.secure file (for encrypted database credentials)
4. Default values (fallback)

Configuration Categories:
- Application: Basic app metadata
- Server: Server and deployment settings
- Database: PostgreSQL connection and pool settings
- Redis: Cache and rate limiting backend
- Security: Authentication, password policies, rate limiting
- CORS: Cross-origin resource sharing
- AI Services: OpenAI and other AI integrations
- Logging: Structured logging configuration
- Monitoring: Prometheus metrics and health checks
- Feature Flags: Enable/disable features
"""
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import Optional, List
from pathlib import Path
import secrets
import os
import base64
from cryptography.fernet import Fernet


def find_env_file() -> str:
    """Find .env file - check current dir, then parent dir (project root)"""
    current = Path(__file__).parent.parent.parent  # server/
    env_file = current / ".env"
    if env_file.exists():
        return str(env_file)
    parent_env = current.parent / ".env"  # project root
    if parent_env.exists():
        return str(parent_env)
    return ".env"  # fallback


def load_secure_db_config() -> Optional[str]:
    """Load and decrypt database configuration from .env.secure file."""
    secure_env_file = Path(__file__).parent.parent / ".env.secure"
    
    if not secure_env_file.exists():
        return None
    
    # Load secure environment variables
    secure_config = {}
    with open(secure_env_file, 'r') as f:
        for line in f:
            if line.strip() and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                secure_config[key] = value
    
    # Get master password from environment or prompt
    master_password = os.getenv('DB_MASTER_PASSWORD')
    if not master_password:
        # In production, this should be set via environment variable
        # For development, you might want to prompt or use a default
        return None
    
    # Decrypt password
    try:
        encrypted_password = secure_config.get('DB_ENCRYPTED_PASSWORD')
        if not encrypted_password:
            return None
        
        # Generate encryption key (same as in secure_db_connection.py)
        salt = b'secure_salt_for_qbrainlabs_2026'
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        from cryptography.hazmat.primitives import hashes
        import hashlib
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(master_password.encode()))
        
        # Decrypt password
        f = Fernet(key)
        encrypted_data = base64.urlsafe_b64decode(encrypted_password.encode())
        decrypted_password = f.decrypt(encrypted_data).decode()
        
        # Build database URL
        host = secure_config.get('DB_HOST', 'localhost')
        port = secure_config.get('DB_PORT', '5432')
        database = secure_config.get('DB_NAME', 'qbrainlabs')
        username = secure_config.get('DB_USER', 'qbrainlabs_db_user')
        
        return f"postgresql://{username}:{decrypted_password}@{host}:{port}/{database}"
        
    except Exception as e:
        # Log error but don't expose details
        print(f"Warning: Failed to decrypt database configuration: {e}")
        return None


class Settings(BaseSettings):
    """Centralized application settings with environment variable support"""
    
    # ============================================================================
    # APPLICATION SETTINGS
    # ============================================================================
    PROJECT_NAME: str = "Qbrain AI Labs"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = Field(
        default="development",
        description="Environment: development, staging, production"
    )
    DEBUG: bool = Field(
        default=True,
        description="Enable debug mode (disable in production)"
    )
    
    # ============================================================================
    # SERVER CONFIGURATION
    # ============================================================================
    HOST: str = Field(
        default="127.0.0.1",
        description="Server host/IP address"
    )
    PORT: int = Field(
        default=8000,
        ge=1,
        le=65535,
        description="Server port number"
    )
    SERVER_HOST: str = Field(
        default="0.0.0.0",
        description="Server bind host (for uvicorn)"
    )
    SERVER_PORT: int = Field(
        default=8000,
        ge=1,
        le=65535,
        description="Server bind port (for uvicorn)"
    )
    WORKERS: int = Field(
        default=1,
        ge=1,
        description="Number of worker processes (production)"
    )
    
    # ============================================================================
    # DATABASE CONFIGURATION - PostgreSQL
    # ============================================================================
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/hotspotmatrix",
        description="PostgreSQL connection string"
    )
    
    @field_validator('DATABASE_URL', mode='before')
    @classmethod
    def resolve_database_url(cls, v, info):
        """Resolve DATABASE_URL from secure config if available."""
        # If DATABASE_URL is explicitly set, use it
        if v and v != "postgresql://postgres:postgres@localhost:5432/hotspotmatrix":
            return v
        
        # Try to load from secure configuration
        secure_url = load_secure_db_config()
        if secure_url:
            return secure_url
        
        # Fall back to default or environment variable
        return v
    DB_POOL_SIZE: int = Field(
        default=10,
        ge=5,
        le=50,
        description="Database connection pool size"
    )
    DB_MAX_OVERFLOW: int = Field(
        default=20,
        ge=10,
        le=100,
        description="Maximum overflow connections"
    )
    DB_POOL_TIMEOUT: int = Field(
        default=30,
        description="Connection pool timeout in seconds"
    )
    DB_POOL_RECYCLE: int = Field(
        default=1800,
        description="Recycle connections after N seconds (30 min default)"
    )
    DB_ECHO: bool = Field(
        default=False,
        description="Enable SQL query logging"
    )
    
    # ============================================================================
    # REDIS CONFIGURATION
    # ============================================================================
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL for caching and rate limiting"
    )
    REDIS_PASSWORD: Optional[str] = Field(
        default=None,
        description="Redis password (if required)"
    )
    
    # ============================================================================
    # SECURITY - JWT AUTHENTICATION
    # ============================================================================
    SECRET_KEY: str = Field(
        default="CHANGE_ME_TO_A_SECURE_RANDOM_STRING_AT_LEAST_32_CHARS",
        min_length=32,
        description="Secret key for JWT tokens. MUST be set via environment variable in production. "
                    "Generate with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
    )
    JWT_SECRET_KEY: Optional[str] = Field(
        default=None,
        description="Separate JWT secret key (falls back to SECRET_KEY if not set)"
    )
    ALGORITHM: str = Field(
        default="HS256",
        description="JWT signing algorithm"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=43200,
        ge=15,
        le=43200,
        description="Access token expiration in minutes (30 days max)"
    )
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7,
        description="Refresh token expiration in days"
    )
    
    # ============================================================================
    # SECURITY - PASSWORD POLICIES
    # ============================================================================
    PASSWORD_MIN_LENGTH: int = Field(
        default=8,
        ge=6,
        le=128,
        description="Minimum password length"
    )
    PASSWORD_MAX_LENGTH: int = Field(
        default=128,
        description="Maximum password length"
    )
    PASSWORD_REQUIRE_UPPERCASE: bool = Field(
        default=True,
        description="Require uppercase letter in password"
    )
    PASSWORD_REQUIRE_LOWERCASE: bool = Field(
        default=True,
        description="Require lowercase letter in password"
    )
    PASSWORD_REQUIRE_DIGIT: bool = Field(
        default=True,
        description="Require digit in password"
    )
    PASSWORD_REQUIRE_SPECIAL: bool = Field(
        default=False,
        description="Require special character in password"
    )
    BCRYPT_ROUNDS: int = Field(
        default=12,
        ge=10,
        le=14,
        description="Bcrypt hashing rounds (higher = more secure but slower)"
    )
    
    # ============================================================================
    # SECURITY - RATE LIMITING
    # ============================================================================
    RATE_LIMIT_ENABLED: bool = Field(
        default=True,
        description="Enable rate limiting"
    )
    RATE_LIMIT_REQUESTS: int = Field(
        default=100,
        description="Maximum requests per window"
    )
    RATE_LIMIT_WINDOW: int = Field(
        default=60,
        description="Rate limit window in seconds"
    )
    
    # ============================================================================
    # SECURITY - HEADERS
    # ============================================================================
    SECURITY_HEADERS_ENABLED: bool = Field(
        default=True,
        description="Enable security headers"
    )
    HSTS_MAX_AGE: int = Field(
        default=31536000,
        description="HTTP Strict Transport Security max age"
    )
    
    # ============================================================================
    # CORS CONFIGURATION
    # ============================================================================
    CORS_ORIGINS: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        description="Comma-separated list of allowed CORS origins"
    )
    ENABLE_DYNAMIC_CORS: bool = Field(
        default=True,
        description="Enable dynamic CORS (auto-accepts origins matching server IPs)"
    )
    CLIENT_PORT: int = Field(
        default=5173,
        ge=1,
        le=65535,
        description="Client/frontend port for dynamic CORS origins"
    )
    
    # ============================================================================
    # AI SERVICES CONFIGURATION
    # ============================================================================
    # OpenAI Configuration
    OPENAI_API_KEY: Optional[str] = Field(
        default=None,
        description="OpenAI API key for AI features (copilot, RAG, roadmap)"
    )
    OPENAI_MODEL: str = Field(
        default="gpt-4",
        description="Default OpenAI model to use"
    )
    OPENAI_TEMPERATURE: float = Field(
        default=0.7,
        ge=0.0,
        le=2.0,
        description="OpenAI temperature for response randomness"
    )
    
    # Azure OpenAI Configuration
    AZURE_OPENAI_ENDPOINT: Optional[str] = Field(
        default=None,
        description="Azure OpenAI endpoint URL"
    )
    AZURE_OPENAI_API_KEY: Optional[str] = Field(
        default=None,
        description="Azure OpenAI API key"
    )
    AZURE_OPENAI_DEPLOYMENT: Optional[str] = Field(
        default=None,
        description="Azure OpenAI deployment name"
    )
    AZURE_OPENAI_MODEL_NAME: Optional[str] = Field(
        default=None,
        description="Azure OpenAI model name"
    )
    AZURE_OPENAI_API_VERSION: str = Field(
        default="2024-12-01-preview",
        description="Azure OpenAI API version"
    )
    AZURE_OPENAI_EMBEDDING_MODEL: Optional[str] = Field(
        default=None,
        description="Azure OpenAI embedding model"
    )
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME: Optional[str] = Field(
        default=None,
        description="Azure OpenAI embedding deployment name"
    )
    AZURE_OPENAI_EMBEDDING_API_VERSION: str = Field(
        default="2024-12-01-preview",
        description="Azure OpenAI embedding API version"
    )
    
    # Azure Anthropic Configuration
    AZURE_ANTHROPIC_ENDPOINT: Optional[str] = Field(
        default=None,
        description="Azure Anthropic endpoint URL"
    )
    AZURE_ANTHROPIC_API_KEY: Optional[str] = Field(
        default=None,
        description="Azure Anthropic API key"
    )
    AZURE_ANTHROPIC_DEPLOYMENT_NAME: Optional[str] = Field(
        default=None,
        description="Azure Anthropic deployment name (e.g., claude-sonnet-4-5)"
    )
    
    # AI General Settings
    AI_MOCK_MODE: bool = Field(
        default=False,
        description="Force AI services to run in mock mode (ignores API key)"
    )
    
    # ============================================================================
    # LOGGING CONFIGURATION
    # ============================================================================
    LOG_LEVEL: str = Field(
        default="INFO",
        description="Logging level: DEBUG, INFO, WARNING, ERROR, CRITICAL"
    )
    LOG_FORMAT: str = Field(
        default="text",
        description="Log format: text or json"
    )
    LOG_FILE: Optional[str] = Field(
        default=None,
        description="Optional log file path"
    )
    LOG_SQL_QUERIES: bool = Field(
        default=False,
        description="Log SQL queries (same as DB_ECHO)"
    )
    
    # ============================================================================
    # MONITORING CONFIGURATION
    # ============================================================================
    PROMETHEUS_ENABLED: bool = Field(
        default=True,
        description="Enable Prometheus metrics endpoint"
    )
    HEALTH_CHECK_ENABLED: bool = Field(
        default=True,
        description="Enable health check endpoints"
    )
    SENTRY_DSN: Optional[str] = Field(
        default=None,
        description="Sentry DSN for error tracking"
    )
    
    # ============================================================================
    # FEATURE FLAGS
    # ============================================================================
    ENABLE_AI_FEATURES: bool = Field(
        default=True,
        description="Enable AI-powered features (copilot, RAG, roadmap)"
    )
    ENABLE_WEBSOCKETS: bool = Field(
        default=True,
        description="Enable WebSocket support"
    )
    ENABLE_METRICS: bool = Field(
        default=True,
        description="Enable metrics collection"
    )
    
    # ============================================================================
    # FILE UPLOAD CONFIGURATION
    # ============================================================================
    MAX_UPLOAD_SIZE: int = Field(
        default=10 * 1024 * 1024,
        description="Maximum file upload size in bytes (10MB default)"
    )
    
    # ============================================================================
    # VALIDATORS
    # ============================================================================
    @field_validator('SECRET_KEY')
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Ensure secret key is not the default value in production"""
        default_keys = [
            "CHANGE_ME_TO_A_SECURE_RANDOM_STRING_AT_LEAST_32_CHARS",
            "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7",
            "dev-secret-key-not-for-production-use-only"
        ]
        if v in default_keys:
            import warnings
            warnings.warn(
                "SECRET_KEY is using a default value. "
                "This is a SECURITY RISK! Set SECRET_KEY environment variable.",
                UserWarning
            )
        return v
    
    @field_validator('ENVIRONMENT')
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Validate environment value"""
        valid_envs = ["development", "staging", "production", "testing"]
        if v.lower() not in valid_envs:
            raise ValueError(f"ENVIRONMENT must be one of: {', '.join(valid_envs)}")
        return v.lower()
    
    # ============================================================================
    # COMPUTED PROPERTIES
    # ============================================================================
    @property
    def jwt_secret(self) -> str:
        """Get JWT secret, falling back to SECRET_KEY if not set"""
        return self.JWT_SECRET_KEY or self.SECRET_KEY
    
    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.ENVIRONMENT == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.ENVIRONMENT == "development"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string into list"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = find_env_file()
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


# Singleton settings instance
settings = Settings()
