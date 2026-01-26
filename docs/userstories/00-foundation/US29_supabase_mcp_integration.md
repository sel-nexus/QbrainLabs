# US29: Supabase PostgreSQL Database via MCP Client Integration

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** Infrastructure & Database  
**Story Type:** Technical/Infrastructure  
**Priority:** High  
**Story Points:** 8

---

## User Story

**As a** System Architect,  
**I want to** connect to Supabase PostgreSQL database through MCP (Model Context Protocol) client,  
**So that** AI assistants can securely query and interact with the production database for enhanced intelligence features.

---

## Description

Integrate Supabase PostgreSQL as the primary cloud database using the Model Context Protocol (MCP) client. MCP provides a standardized way for AI assistants to interact with external data sources securely. This integration enables AI-powered features to access workshop data, submissions, and analytics while maintaining security boundaries and connection management best practices.

Supabase offers a fully managed PostgreSQL database with additional features like real-time subscriptions, Row Level Security (RLS), and built-in authentication that align well with the QbrainLabs application requirements.

---

## Requirements

### Functional Requirements

1. **Supabase Project Setup**
   - Create Supabase project with PostgreSQL database
   - Configure database schema for QbrainLabs collections
   - Enable Row Level Security (RLS) policies
   - Set up connection pooling via Supavisor

2. **MCP Server Configuration**
   - Install and configure `@modelcontextprotocol/server-postgres` MCP server
   - Configure secure connection to Supabase PostgreSQL
   - Set up resource and tool definitions for database operations
   - Implement connection string management via environment variables

3. **Database Schema Migration**
   - Create tables:
     - `workshops` - Workshop configurations and metadata
     - `submissions` - Use case submissions
     - `scores` - Participant scoring data
     - `sessions` - Active participant sessions
     - `users` - User accounts and authentication
   - Define foreign key relationships
   - Create indexes for query optimization

4. **MCP Client Integration**
   - Configure MCP client in application context
   - Implement query tools for CRUD operations
   - Set up read-only and read-write resource access
   - Configure rate limiting and query validation

5. **Security & Access Control**
   - Implement Row Level Security (RLS) policies
   - Configure service role and anon keys appropriately
   - Set up API key rotation schedule
   - Enable SSL/TLS for all connections

### Non-Functional Requirements

- Connection pool size: 10-50 connections (via Supavisor)
- Query timeout: 30 seconds
- Automatic reconnection on failure
- Connection string stored securely (environment variables)
- Logging for all database operations via MCP
- Sub-100ms latency for simple queries
- 99.9% uptime SLA compliance

---

## Acceptance Criteria

### Scenario 1: MCP Server Connection at Startup
**Given** the MCP server is configured with Supabase credentials  
**When** the MCP client attempts to connect  
**Then** the connection is successfully established  
**And** available tools and resources are listed  
**And** a health check query returns successfully

### Scenario 2: Query Execution via MCP Tools
**Given** the MCP connection is active  
**When** an AI assistant requests workshop data via MCP tool  
**Then** the query is executed against Supabase PostgreSQL  
**And** results are returned in structured format  
**And** query execution is logged

### Scenario 3: Row Level Security Enforcement
**Given** RLS policies are enabled on tables  
**When** a query attempts to access data outside its scope  
**Then** only authorized rows are returned  
**And** no unauthorized data is leaked  
**And** access attempts are logged

### Scenario 4: Connection Failure Recovery
**Given** the database connection is temporarily lost  
**When** the MCP client attempts a query  
**Then** the system retries connection up to 3 times  
**And** logs the connection failure  
**And** returns appropriate error to the caller

### Scenario 5: CRUD Operations via MCP Resources
**Given** MCP resources are configured for database tables  
**When** create, read, update, delete operations are requested  
**Then** operations execute with proper validation  
**And** changes are persisted to Supabase  
**And** audit trail is maintained

---

## Technical Implementation

### Supabase Project Setup

#### Database Configuration
- **Plan:** Free Tier (500 MB database, 1 GB file storage)
- **Region:** Choose nearest to application servers (e.g., us-east-1)
- **PostgreSQL Version:** 15.x
- **Connection Pooler:** Supavisor (Transaction mode)

#### Connection URLs
```env
# Direct connection (for migrations)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# Pooled connection (for application - recommended)
DATABASE_URL_POOLED=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true

# Supabase API
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### MCP Server Installation

#### Package Installation
```bash
# Install MCP PostgreSQL server globally
npm install -g @modelcontextprotocol/server-postgres

# Or add to project dependencies
npm install @modelcontextprotocol/server-postgres
```

#### MCP Configuration File
```json
// mcp_config.json or claude_desktop_config.json
{
  "mcpServers": {
    "supabase-postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require"
      ],
      "env": {
        "PGPASSWORD": "${SUPABASE_DB_PASSWORD}"
      }
    }
  }
}
```

#### Secure Configuration (Recommended)
```json
// mcp_config.json with environment variable reference
{
  "mcpServers": {
    "supabase-postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres"
      ],
      "env": {
        "DATABASE_URL": "${SUPABASE_DATABASE_URL}"
      }
    }
  }
}
```

### Database Schema

#### Tables Definition
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workshops table
CREATE TABLE workshops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pin VARCHAR(6) UNIQUE NOT NULL CHECK (pin ~ '^[0-9]{6}$'),
    title VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    criteria JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submissions table
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    participant_id UUID NOT NULL,
    title VARCHAR(80) NOT NULL CHECK (char_length(title) >= 10),
    problem_description TEXT NOT NULL CHECK (char_length(problem_description) BETWEEN 50 AND 500),
    target_user VARCHAR(200) NOT NULL,
    expected_kpi VARCHAR(300) NOT NULL,
    ai_category VARCHAR(50) NOT NULL,
    data_readiness INTEGER CHECK (data_readiness BETWEEN 1 AND 5),
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ
);

-- Scores table
CREATE TABLE scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    criterion_scores JSONB NOT NULL DEFAULT '[]',
    weighted_total DECIMAL(5,2) NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    locked BOOLEAN DEFAULT TRUE,
    UNIQUE(submission_id, session_id)
);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
    participant_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'participant' CHECK (role IN ('facilitator', 'participant', 'observer')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for performance
CREATE INDEX idx_workshops_pin ON workshops(pin);
CREATE INDEX idx_workshops_status ON workshops(status);
CREATE INDEX idx_submissions_workshop ON submissions(workshop_id);
CREATE INDEX idx_scores_submission ON scores(submission_id);
CREATE INDEX idx_sessions_workshop ON sessions(workshop_id);
CREATE INDEX idx_sessions_active ON sessions(is_active) WHERE is_active = TRUE;
```

#### Row Level Security Policies
```sql
-- Enable RLS on all tables
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Workshops: Anyone can read active workshops
CREATE POLICY "Read active workshops" ON workshops
    FOR SELECT USING (status = 'active');

-- Workshops: Only facilitators can create/update
CREATE POLICY "Facilitators manage workshops" ON workshops
    FOR ALL USING (
        auth.uid() = created_by OR
        auth.jwt() ->> 'role' = 'facilitator'
    );

-- Submissions: Participants can manage their own
CREATE POLICY "Participants manage own submissions" ON submissions
    FOR ALL USING (
        participant_id = auth.uid()::uuid
    );

-- Submissions: Anyone in workshop can read
CREATE POLICY "Workshop members read submissions" ON submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.workshop_id = submissions.workshop_id 
            AND sessions.id = auth.uid()::uuid
        )
    );

-- Scores: Users manage their own scores
CREATE POLICY "Users manage own scores" ON scores
    FOR ALL USING (session_id = auth.uid()::uuid);

-- Service role bypass (for MCP server)
CREATE POLICY "Service role full access workshops" ON workshops
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    
CREATE POLICY "Service role full access submissions" ON submissions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    
CREATE POLICY "Service role full access scores" ON scores
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
```

### MCP Tools & Resources

#### Available MCP Tools (from server-postgres)
```typescript
// Tools automatically exposed by MCP PostgreSQL server
interface MCPPostgresTools {
  // Execute read-only SQL query
  query: {
    sql: string;          // SQL query to execute
    params?: any[];       // Optional parameters for prepared statements
  };
  
  // Get table schema information
  describe_table: {
    table_name: string;   // Name of table to describe
  };
  
  // List all tables in database
  list_tables: {};
}
```

#### Custom MCP Resource Definitions
```typescript
// Custom resources for QbrainLabs
interface QbrainLabsResources {
  // Workshop summary resource
  "workshop://{pin}": {
    uri: string;
    name: string;
    description: "Get workshop details by PIN";
    mimeType: "application/json";
  };
  
  // Submissions for workshop
  "submissions://{workshop_id}": {
    uri: string;
    name: string;
    description: "List all submissions for a workshop";
    mimeType: "application/json";
  };
  
  // Analytics summary
  "analytics://{workshop_id}": {
    uri: string;
    name: string;
    description: "Get workshop analytics and scoring summary";
    mimeType: "application/json";
  };
}
```

### FastAPI Integration

#### Database Connection with Supabase Client
```python
# app/database/supabase_client.py
from supabase import create_client, Client
from functools import lru_cache
import os
import logging

logger = logging.getLogger(__name__)

class SupabaseDB:
    client: Client = None
    
    @classmethod
    def connect(cls) -> Client:
        """Initialize Supabase client"""
        if cls.client is None:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            
            if not url or not key:
                raise ValueError("Supabase credentials not configured")
            
            cls.client = create_client(url, key)
            logger.info("✅ Connected to Supabase")
        
        return cls.client
    
    @classmethod
    def get_client(cls) -> Client:
        """Get Supabase client instance"""
        if cls.client is None:
            return cls.connect()
        return cls.client

@lru_cache()
def get_supabase() -> Client:
    """Dependency injection for Supabase client"""
    return SupabaseDB.get_client()
```

#### Direct PostgreSQL Connection (Alternative)
```python
# app/database/postgres.py
import asyncpg
from contextlib import asynccontextmanager
import os
import logging

logger = logging.getLogger(__name__)

class PostgresDB:
    pool: asyncpg.Pool = None
    
    @classmethod
    async def connect(cls):
        """Create connection pool to Supabase PostgreSQL"""
        cls.pool = await asyncpg.create_pool(
            dsn=os.getenv("SUPABASE_DATABASE_URL"),
            min_size=5,
            max_size=20,
            command_timeout=30,
            ssl='require'
        )
        logger.info("✅ Connected to Supabase PostgreSQL")
    
    @classmethod
    async def disconnect(cls):
        """Close connection pool"""
        if cls.pool:
            await cls.pool.close()
            logger.info("Closed PostgreSQL connection pool")
    
    @classmethod
    @asynccontextmanager
    async def connection(cls):
        """Get connection from pool"""
        async with cls.pool.acquire() as conn:
            yield conn
    
    @classmethod
    async def execute(cls, query: str, *args):
        """Execute a query"""
        async with cls.connection() as conn:
            return await conn.execute(query, *args)
    
    @classmethod
    async def fetch(cls, query: str, *args):
        """Fetch rows from query"""
        async with cls.connection() as conn:
            return await conn.fetch(query, *args)
    
    @classmethod
    async def fetchrow(cls, query: str, *args):
        """Fetch single row from query"""
        async with cls.connection() as conn:
            return await conn.fetchrow(query, *args)
```

#### Application Lifespan
```python
# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.database.postgres import PostgresDB

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await PostgresDB.connect()
    yield
    # Shutdown
    await PostgresDB.disconnect()

app = FastAPI(lifespan=lifespan)
```

### MCP Client Usage Examples

#### Querying via MCP Tool
```python
# Example MCP tool invocation from AI assistant context
mcp_query = {
    "tool": "query",
    "arguments": {
        "sql": """
            SELECT w.title, w.pin, COUNT(s.id) as submission_count
            FROM workshops w
            LEFT JOIN submissions s ON w.id = s.workshop_id
            WHERE w.status = 'active'
            GROUP BY w.id
            ORDER BY w.created_at DESC
            LIMIT 10
        """
    }
}
```

#### Reading MCP Resource
```python
# Example MCP resource read
mcp_resource = {
    "resource": "workshop://123456",
    "action": "read"
}
# Returns workshop details for PIN 123456
```

---

## Dependencies

### Python Dependencies
```txt
# requirements.txt additions
supabase==2.3.0
asyncpg==0.29.0
python-dotenv==1.0.0
```

### Node.js Dependencies (for MCP Server)
```json
{
  "dependencies": {
    "@modelcontextprotocol/server-postgres": "^0.5.0"
  }
}
```

---

## Environment Variables

```env
# .env
# Supabase Configuration
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Direct PostgreSQL Connection (pooled)
SUPABASE_DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require

# MCP Configuration
MCP_POSTGRES_CONNECTION_STRING=${SUPABASE_DATABASE_URL}
MCP_SERVER_LOG_LEVEL=info
```

---

## Testing Requirements

### Unit Tests
```python
# tests/test_supabase_connection.py
import pytest
from app.database.supabase_client import SupabaseDB

@pytest.mark.asyncio
async def test_connection():
    """Test Supabase connection"""
    client = SupabaseDB.get_client()
    result = client.table('workshops').select('count').execute()
    assert result is not None

@pytest.mark.asyncio
async def test_crud_operations():
    """Test basic CRUD operations"""
    client = SupabaseDB.get_client()
    
    # Create
    workshop = {
        "pin": "999999",
        "title": "Test Workshop",
        "department": "Engineering",
        "date": "2025-01-24T00:00:00Z",
        "criteria": []
    }
    result = client.table('workshops').insert(workshop).execute()
    assert len(result.data) == 1
    workshop_id = result.data[0]['id']
    
    # Read
    result = client.table('workshops').select('*').eq('id', workshop_id).execute()
    assert result.data[0]['title'] == "Test Workshop"
    
    # Update
    result = client.table('workshops').update({"title": "Updated Workshop"}).eq('id', workshop_id).execute()
    assert result.data[0]['title'] == "Updated Workshop"
    
    # Delete
    result = client.table('workshops').delete().eq('id', workshop_id).execute()
    assert len(result.data) == 1
```

### Integration Tests
- MCP server connection and tool listing
- Query execution via MCP tools
- Resource fetching via MCP resources
- RLS policy enforcement
- Connection pool behavior under load

### MCP Server Tests
```bash
# Test MCP server connection
npx @modelcontextprotocol/inspector npx -y @modelcontextprotocol/server-postgres "$SUPABASE_DATABASE_URL"
```

---

## Security Best Practices

1. **Credential Management**
   - Store all credentials in environment variables
   - Never commit credentials to version control
   - Use Supabase service role key only on server-side
   - Rotate API keys every 90 days

2. **Row Level Security**
   - Enable RLS on all tables
   - Define explicit policies for each operation
   - Test policies thoroughly
   - Use service role only when necessary

3. **Network Security**
   - Always use SSL connections (`sslmode=require`)
   - Use connection pooler for application connections
   - Configure allowed IP ranges in Supabase dashboard
   - Enable connection throttling

4. **Query Safety**
   - Use parameterized queries to prevent SQL injection
   - Validate and sanitize all user inputs
   - Implement query timeout limits
   - Log and monitor all database queries

---

## Monitoring & Alerts

### Supabase Dashboard Monitoring
- Database connections
- Query performance
- Storage usage
- API request metrics

### Application Logging
```python
import logging
import structlog

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

# Log database queries
logger.info("database_query", query_type="select", table="workshops", duration_ms=45)
```

### Metrics to Track
- Query latency (p50, p95, p99)
- Connection pool utilization
- Error rates by operation type
- RLS policy denials
- MCP tool invocation frequency

---

## Migration Plan

### Phase 1: Supabase Setup (Day 1-2)
1. Create Supabase project
2. Configure database schema
3. Set up RLS policies
4. Generate API keys
5. Test direct connection

### Phase 2: MCP Server Configuration (Day 3)
1. Install MCP PostgreSQL server
2. Configure connection string
3. Test MCP tools via inspector
4. Document available tools/resources

### Phase 3: Application Integration (Day 4-5)
1. Add Supabase client to FastAPI
2. Update environment variables
3. Migrate existing endpoints
4. Update tests

### Phase 4: Validation & Deployment (Day 6-7)
1. Run full test suite
2. Performance testing
3. Security review
4. Deploy to staging
5. Production deployment

---

## Related User Stories

- **US00:** Infrastructure MongoDB (Alternative database, may migrate from)
- **US07:** AI Intelligence RAG (MCP enables AI database access)
- **US16:** AI Copilot Assistant (Uses MCP for data queries)
- **US25:** Analytics Insights Dashboard (Queries via MCP)

---

## Questions/Clarifications

1. Should we migrate existing data from SQLite/MongoDB to Supabase?
2. What is the expected concurrent user load for connection pool sizing?
3. Are there specific compliance requirements (GDPR, SOC2) for data storage?
4. Should we enable Supabase Realtime for live updates?
5. What is the backup retention requirement?

---

## Future Enhancements

- Enable Supabase Realtime for live workshop updates
- Implement Edge Functions for serverless compute
- Add Supabase Storage for file attachments
- Implement Supabase Auth for unified authentication
- Add read replicas for geographic distribution
- Implement database branching for development
- Advanced vector search with pgvector extension

---

## Definition of Done

- [ ] Supabase project created and configured
- [ ] Database schema migrated to PostgreSQL
- [ ] RLS policies implemented and tested
- [ ] MCP PostgreSQL server installed and configured
- [ ] MCP tools tested via inspector
- [ ] FastAPI integration completed
- [ ] Environment variables configured
- [ ] All acceptance criteria met
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Security review completed
- [ ] Documentation updated
- [ ] MCP configuration documented
- [ ] Connection pooling optimized
- [ ] Monitoring and logging configured
- [ ] Code review completed
