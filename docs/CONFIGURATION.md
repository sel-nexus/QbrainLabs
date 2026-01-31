# Configuration Management Guide

## Overview

All application configurations are centralized in **one primary configuration file**:
- **`server/app/core/config.py`** - Single source of truth for all application settings

This centralized approach provides:
- ✅ Single source of truth for all settings
- ✅ Environment variable support with validation
- ✅ Type safety with Pydantic
- ✅ Clear documentation for each setting
- ✅ Easy deployment across environments

## Configuration File Structure

### Primary Configuration: `server/app/core/config.py`

All application settings are managed through the `Settings` class using Pydantic BaseSettings.

**Configuration Categories:**
1. Application Settings
2. Server Configuration
3. Database Configuration (PostgreSQL)
4. Redis Configuration
5. Security - JWT Authentication
6. Security - Password Policies
7. Security - Rate Limiting
8. Security - Headers
9. CORS Configuration
10. AI Services Configuration
11. Logging Configuration
12. Monitoring Configuration
13. Feature Flags
14. File Upload Configuration
15. Request Tracking Configuration

## Environment Variables

### How to Configure

Settings can be configured via:
1. **Environment variables** (recommended for production)
2. **`.env` file** (for local development)
3. **Default values** (fallback)

The application automatically searches for `.env` files in:
- `server/.env`
- Project root `.env`

### Required Environment Variables (Production)

```bash
# Security - REQUIRED
SECRET_KEY=<generate-with-python-secrets-token-urlsafe-32>

# Database - REQUIRED
DATABASE_URL=postgresql://user:password@host:port/dbname

# Environment
ENVIRONMENT=production
DEBUG=false
```

### Optional Environment Variables

#### Application Settings
```bash
PROJECT_NAME="Qbrain AI Labs"
API_V1_STR="/api/v1"
ENVIRONMENT=development  # development, staging, production, testing
DEBUG=true
```

#### Server Configuration
```bash
HOST=127.0.0.1
PORT=8000
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
WORKERS=4  # Number of worker processes for production
```

#### Database Configuration
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hotspotmatrix
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=1800
DB_ECHO=false
```

#### Redis Configuration
```bash
REDIS_URL=redis://localhost:6379/0
REDIS_PASSWORD=  # Optional
```

#### Security - JWT Authentication
```bash
SECRET_KEY=<your-secret-key-min-32-chars>
JWT_SECRET_KEY=  # Optional, falls back to SECRET_KEY
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200  # 30 days
REFRESH_TOKEN_EXPIRE_DAYS=7
```

#### Security - Password Policies
```bash
PASSWORD_MIN_LENGTH=8
PASSWORD_MAX_LENGTH=128
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_DIGIT=true
PASSWORD_REQUIRE_SPECIAL=false
BCRYPT_ROUNDS=12  # 10-14 recommended
```

#### Security - Rate Limiting
```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60  # seconds
# Distributed rate limiting (requires Redis)
REDIS_URL=redis://localhost:6379/0
```

#### Security - Headers
```bash
SECURITY_HEADERS_ENABLED=true
HSTS_MAX_AGE=31536000
```

#### CORS Configuration
```bash
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ENABLE_DYNAMIC_CORS=true
CLIENT_PORT=5173
```

#### AI Services Configuration
```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
OPENAI_TEMPERATURE=0.7
AI_MOCK_MODE=false  # Force mock mode even with API key
```

#### Logging Configuration
```bash
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_FORMAT=text  # text or json
LOG_FILE=  # Optional log file path
LOG_SQL_QUERIES=false
```

#### Monitoring Configuration
```bash
PROMETHEUS_ENABLED=true
HEALTH_CHECK_ENABLED=true
SENTRY_DSN=  # Optional Sentry DSN
```

#### Feature Flags
```bash
ENABLE_AI_FEATURES=true
ENABLE_WEBSOCKETS=true
ENABLE_METRICS=true
```

#### File Upload Configuration
```bash
MAX_UPLOAD_SIZE=10485760  # 10MB in bytes
```

#### Request Tracking Configuration
```bash
# X-Request-ID header tracking
REQUEST_ID_HEADER=X-Request-ID
```

## Usage in Code

### Importing Settings

```python
from app.core.config import settings

# Access any setting
api_key = settings.OPENAI_API_KEY
db_url = settings.DATABASE_URL
is_prod = settings.is_production  # Computed property
```

### Advanced Features

#### Caching Decorator
The application provides a `@cache_result` decorator for easy query result caching with Redis (and in-memory fallback):

```python
from app.core.caching import cache_result

@router.get("/workshop/{workshop_id}")
@cache_result(ttl=600)  # Cache for 10 minutes
async def get_workshop(workshop_id: str, db: AsyncSession):
    # This result will be cached in Redis if available
    ...
```

#### Redis Connection Management
Redis is used for distributed rate limiting and caching. If Redis is unavailable, the system gracefully falls back to in-memory storage.

```python
from app.core.redis_client import get_redis_client

redis = await get_redis_client()
if redis:
    await redis.set("key", "value")
```

### Computed Properties

The `Settings` class provides helpful computed properties:

```python
# JWT secret with fallback
jwt_secret = settings.jwt_secret  # Returns JWT_SECRET_KEY or SECRET_KEY

# Environment checks
if settings.is_production:
    # Production-specific logic
    pass

if settings.is_development:
    # Development-specific logic
    pass

# CORS origins as list
origins = settings.cors_origins_list  # Parses comma-separated string
```

## Configuration Best Practices

### 1. Development Environment

Create a `.env` file in the project root:

```bash
# .env
ENVIRONMENT=development
DEBUG=true
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hotspotmatrix
SECRET_KEY=dev-secret-key-not-for-production-use-only
LOG_LEVEL=DEBUG
LOG_FORMAT=text
OPENAI_API_KEY=sk-your-dev-key
```

### 2. Production Environment

Set environment variables directly (never commit `.env` to version control):

```bash
export ENVIRONMENT=production
export DEBUG=false
export SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
export DATABASE_URL=postgresql://user:pass@prod-host:5432/dbname
export REDIS_URL=redis://prod-redis:6379/0
export LOG_LEVEL=INFO
export LOG_FORMAT=json
export OPENAI_API_KEY=sk-your-prod-key
```

### 3. Docker/Container Deployment

Use environment variables in `docker-compose.yml` or Kubernetes ConfigMaps:

```yaml
environment:
  - ENVIRONMENT=production
  - DATABASE_URL=${DATABASE_URL}
  - SECRET_KEY=${SECRET_KEY}
  - REDIS_URL=redis://redis:6379/0
```

### 4. Security Considerations

**DO:**
- ✅ Use strong, randomly generated `SECRET_KEY` (min 32 characters)
- ✅ Set `DEBUG=false` in production
- ✅ Use environment variables for sensitive data
- ✅ Rotate secrets regularly
- ✅ Use different secrets for different environments

**DON'T:**
- ❌ Commit `.env` files to version control
- ❌ Use default/example secret keys in production
- ❌ Share secrets across environments
- ❌ Hard-code sensitive values in code

## Migration from Old Configuration

### Removed Files

The following configuration file has been **deprecated**:
- ~~`server/app/core/config_production.py`~~ - Merged into `config.py`

### Changes Made

1. **Consolidated all settings** into single `config.py`
2. **Updated AI services** to use centralized config:
   - `copilot_service.py` - Now uses `settings.OPENAI_API_KEY`
   - `rag_service.py` - Now uses `settings.OPENAI_API_KEY`
   - `roadmap_service.py` - Now uses `settings.OPENAI_API_KEY`

3. **Updated security module** to use config values:
   - Password policies now configurable via environment variables
   - Bcrypt rounds configurable via `BCRYPT_ROUNDS`
   - Rate limiting uses centralized defaults

4. **Updated logging** to use centralized config:
   - Log level from `LOG_LEVEL`
   - Log format from `LOG_FORMAT`

### Migration Steps

If you have existing `.env` files or environment variables:

1. **Review your current settings** - Check existing `.env` or environment variables
2. **Update variable names** - Ensure they match the new naming convention
3. **Add new required variables** - Add any missing required settings
4. **Remove deprecated files** - Delete `config_production.py` if present
5. **Test configuration** - Verify all settings load correctly

## Validation

The configuration includes built-in validation:

### Secret Key Validation
```python
# Warns if using default/insecure secret keys
if SECRET_KEY in default_keys:
    warnings.warn("SECRET_KEY is using a default value. This is a SECURITY RISK!")
```

### Environment Validation
```python
# Ensures valid environment values
ENVIRONMENT must be one of: development, staging, production, testing
```

### Field Validation
- Port numbers: 1-65535
- Pool sizes: Minimum and maximum constraints
- String lengths: Minimum requirements for security

## Troubleshooting

### Configuration Not Loading

**Issue:** Settings not being read from `.env` file

**Solution:**
1. Ensure `.env` file is in correct location (`server/.env` or project root)
2. Check file encoding is UTF-8
3. Verify no syntax errors in `.env` file
4. Restart application after changing `.env`

### Secret Key Warnings

**Issue:** Getting warnings about default SECRET_KEY

**Solution:**
```bash
# Generate a secure secret key
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Set in environment
export SECRET_KEY=<generated-key>
```

### Database Connection Issues

**Issue:** Cannot connect to database

**Solution:**
1. Verify `DATABASE_URL` format: `postgresql://user:password@host:port/dbname`
2. Check database server is running
3. Verify credentials and network access
4. Check connection pool settings if experiencing timeouts

### AI Services Not Working

**Issue:** AI services running in mock mode

**Solution:**
1. Set `OPENAI_API_KEY` environment variable
2. Verify API key is valid
3. Check `AI_MOCK_MODE` is not set to `true`

## Summary

All application configuration is now managed centrally in `server/app/core/config.py`. This provides:
- Single source of truth
- Environment-based configuration
- Type safety and validation
- Clear documentation
- Easy deployment
- **Redis-based distributed caching and rate limiting**
- **Request ID tracking for observability**

For questions or issues, refer to this documentation or check the inline comments in `config.py`.
