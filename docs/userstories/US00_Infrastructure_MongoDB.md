# US06: MongoDB Atlas SaaS Integration

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** Infrastructure & Database  
**Story Type:** Technical/Infrastructure  
**Priority:** Critical (Prerequisite)  
**Story Points:** 8

---

## User Story

**As a** System Architect,  
**I want to** configure a MongoDB Atlas M0 cluster and API connection logic,  
**So that** the application has a reliable, schema-less document store.

---

## Description

Establish the foundational database infrastructure using MongoDB Atlas. This cloud-hosted solution provides a scalable, managed database service that requires minimal operational overhead. The integration includes connection management, data models, and CRUD operations that support all application features.

---

## Requirements

### Functional Requirements

1. **MongoDB Atlas Cluster Setup**
   - Create M0 (Free Tier) cluster
   - Configure cluster in preferred region (lowest latency)
   - Enable automatic backups
   - Set up IP whitelisting or network peering

2. **Database Configuration**
   - Database name: `hotspot_flow`
   - Collections:
     - `workshops` - Workshop configurations and metadata
     - `submissions` - Use case submissions
     - `scores` - Participant scoring data
     - `sessions` - Active participant sessions
   - Enable data encryption at rest
   - Configure retention policies

3. **Connection Management**
   - Implement `motor` async driver for FastAPI
   - Connection pooling configuration
   - Retry logic for transient failures
   - Health check endpoint

4. **Pydantic Data Models**
   - `Workshop` model with validation
   - `Submission` model with validation
   - `Score` model with validation
   - `Session` model with validation

5. **CRUD Operations**
   - Create operations for all collections
   - Read operations with filtering
   - Update operations with versioning
   - Delete operations (soft delete preferred)

### Non-Functional Requirements

- Connection pool size: 10-100 connections
- Query timeout: 30 seconds
- Automatic reconnection on failure
- Connection string stored securely (environment variables)
- Logging for all database operations
- Monitoring and alerting for performance issues

---

## Acceptance Criteria

### Scenario 1: Database Connection at Startup
**Given** the FastAPI application is starting  
**When** the application attempts to connect to MongoDB Atlas  
**Then** the connection is successfully established  
**And** a confirmation log message is written  
**And** the health check endpoint returns status "healthy"

### Scenario 2: CRUD Operations on Submissions
**Given** the database connection is active  
**When** the API creates a new submission document  
**Then** the document is successfully inserted into the `submissions` collection  
**And** returns the generated `_id`  
**When** the API reads the submission  
**Then** the correct document is retrieved  
**When** the API updates the submission  
**Then** the changes are persisted  
**When** the API deletes the submission  
**Then** the document is marked as deleted (soft delete)

### Scenario 3: Connection Failure Handling
**Given** the database connection is lost  
**When** the API attempts a database operation  
**Then** the system retries the connection up to 3 times  
**And** logs the connection failure  
**And** returns a 503 Service Unavailable error to the client

### Scenario 4: Data Validation
**Given** an API request with invalid data  
**When** Pydantic validates the input  
**Then** validation errors are returned to the client  
**And** no database operation is attempted  
**And** the error response includes specific validation messages

---

## Technical Implementation

### MongoDB Atlas Setup

#### Cluster Configuration
- **Tier:** M0 (Free, 512 MB storage)
- **Provider:** AWS/GCP/Azure (choose based on location)
- **Region:** Choose nearest to application servers
- **MongoDB Version:** 6.0+
- **Backup:** Automatic daily snapshots

#### Security Configuration
- Enable authentication (username/password)
- Create application-specific database user
- Configure network access (IP whitelist or VPC peering)
- Enable audit logging
- Rotate credentials periodically

### FastAPI Integration

#### Dependencies
```python
# requirements.txt
motor==3.3.2
pymongo==4.6.1
pydantic==2.5.3
python-dotenv==1.0.0
```

#### Database Connection Manager
```python
# app/database/mongodb.py
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
import logging
import os

logger = logging.getLogger(__name__)

class MongoDB:
    client: AsyncIOMotorClient = None
    
    @classmethod
    async def connect_db(cls):
        """Connect to MongoDB Atlas"""
        try:
            cls.client = AsyncIOMotorClient(
                os.getenv("MONGODB_URL"),
                maxPoolSize=50,
                minPoolSize=10,
                serverSelectionTimeoutMS=5000,
                retryWrites=True
            )
            # Verify connection
            await cls.client.admin.command('ping')
            logger.info("✅ Connected to MongoDB Atlas")
        except ConnectionFailure as e:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")
            raise
    
    @classmethod
    async def close_db(cls):
        """Close MongoDB connection"""
        if cls.client:
            cls.client.close()
            logger.info("Closed MongoDB connection")
    
    @classmethod
    def get_database(cls):
        """Get database instance"""
        return cls.client.hotspot_flow
```

#### Application Lifespan
```python
# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await MongoDB.connect_db()
    yield
    # Shutdown
    await MongoDB.close_db()

app = FastAPI(lifespan=lifespan)
```

### Pydantic Models

#### Workshop Model
```python
# app/models/workshop.py
from pydantic import BaseModel, Field, validator
from typing import List
from datetime import datetime
from enum import Enum

class WorkshopStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Criterion(BaseModel):
    name: str
    weight: float = Field(ge=0, le=100)
    axis: str = Field(pattern="^(x|y)$")  # x=ease, y=impact

class Workshop(BaseModel):
    workshop_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pin: str = Field(regex="^[0-9]{6}$")
    title: str = Field(max_length=100)
    department: str
    date: datetime
    criteria: List[Criterion]
    status: WorkshopStatus = WorkshopStatus.ACTIVE
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    
    @validator('criteria')
    def validate_weights(cls, criteria):
        total = sum(c.weight for c in criteria)
        if not (99.9 <= total <= 100.1):  # Allow small floating-point variance
            raise ValueError('Criterion weights must sum to 100')
        return criteria
```

#### Submission Model
```python
# app/models/submission.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

class SubmissionStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"

class Submission(BaseModel):
    submission_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workshop_pin: str = Field(regex="^[0-9]{6}$")
    session_id: str
    participant_id: str
    title: str = Field(min_length=10, max_length=80)
    problem_description: str = Field(min_length=50, max_length=500)
    target_user: str = Field(min_length=10, max_length=200)
    expected_kpi: str = Field(min_length=20, max_length=300)
    ai_category: str
    data_readiness: int = Field(ge=1, le=5)
    status: SubmissionStatus = SubmissionStatus.SUBMITTED
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    submitted_at: Optional[datetime] = None
```

#### Score Model
```python
# app/models/score.py
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime
import uuid

class CriterionScore(BaseModel):
    criterion: str
    weight: float
    value: int = Field(ge=1, le=10)

class Score(BaseModel):
    score_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workshop_pin: str
    submission_id: str
    session_id: str
    scores: List[CriterionScore]
    weighted_total: float
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    locked: bool = True
```

### CRUD Operations

#### Repository Pattern
```python
# app/repositories/workshop_repository.py
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.workshop import Workshop
from typing import Optional, List

class WorkshopRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db.workshops
    
    async def create(self, workshop: Workshop) -> str:
        """Create new workshop"""
        result = await self.collection.insert_one(workshop.dict())
        return str(result.inserted_id)
    
    async def find_by_pin(self, pin: str) -> Optional[Workshop]:
        """Find workshop by PIN"""
        doc = await self.collection.find_one({"pin": pin})
        return Workshop(**doc) if doc else None
    
    async def update_status(self, workshop_id: str, status: str) -> bool:
        """Update workshop status"""
        result = await self.collection.update_one(
            {"workshop_id": workshop_id},
            {"$set": {"status": status}}
        )
        return result.modified_count > 0
    
    async def find_active(self) -> List[Workshop]:
        """Find all active workshops"""
        cursor = self.collection.find({"status": "active"})
        return [Workshop(**doc) async for doc in cursor]
```

### Health Check Endpoint
```python
# app/api/health.py
from fastapi import APIRouter, status
from app.database.mongodb import MongoDB

router = APIRouter()

@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Health check endpoint"""
    try:
        db = MongoDB.get_database()
        await db.command('ping')
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.utcnow()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.utcnow()
        }
```

---

## Dependencies

- MongoDB Atlas account
- FastAPI framework
- Python 3.9+
- Environment variable management (.env file)

---

## Environment Variables

```env
# .env
MONGODB_URL=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/hotspot_flow?retryWrites=true&w=majority
MONGODB_DB_NAME=hotspot_flow
MONGODB_MAX_POOL_SIZE=50
MONGODB_MIN_POOL_SIZE=10
```

---

## Testing Requirements

### Unit Tests
- Connection establishment
- CRUD operations for each model
- Pydantic validation rules
- Repository methods

### Integration Tests
- Full database lifecycle
- Connection pool behavior
- Transaction handling
- Error recovery

### Load Tests
- Concurrent connections (100+)
- Query performance under load
- Connection pool efficiency

---

## Monitoring & Alerts

### MongoDB Atlas Monitoring
- Enable performance advisor
- Configure alerts for:
  - High connection count
  - Slow queries (> 1000ms)
  - Storage reaching 80%
  - Failed authentication attempts

### Application Logging
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)
```

### Metrics to Track
- Connection pool utilization
- Query latency (p50, p95, p99)
- Error rates by operation
- Document growth rate
- Index usage

---

## Security Best Practices

1. **Credentials Management**
   - Store connection string in environment variables
   - Never commit credentials to version control
   - Rotate credentials every 90 days
   - Use AWS Secrets Manager or similar

2. **Network Security**
   - Enable IP whitelisting
   - Use VPC peering in production
   - Enable encryption in transit (TLS/SSL)

3. **Access Control**
   - Create application-specific user with minimal privileges
   - Enable role-based access control (RBAC)
   - Audit user actions

4. **Data Protection**
   - Enable encryption at rest
   - Implement field-level encryption for sensitive data
   - Configure backup retention

---

## Performance Optimization

### Indexing Strategy
```python
# Create indexes for common queries
await db.workshops.create_index("pin", unique=True)
await db.workshops.create_index([("status", 1), ("date", -1)])
await db.submissions.create_index("workshop_pin")
await db.submissions.create_index([("workshop_pin", 1), ("created_at", -1)])
await db.scores.create_index([("submission_id", 1), ("session_id", 1)], unique=True)
```

### Query Optimization
- Use projection to limit returned fields
- Implement pagination for large result sets
- Use aggregation pipelines for complex queries
- Cache frequently accessed data (Redis)

---

## Backup & Recovery

### Backup Strategy
- Automatic daily snapshots (Atlas feature)
- Retention: 7 days (free tier)
- Manual backups before major changes
- Test restoration quarterly

### Disaster Recovery
- Document recovery procedures
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 24 hours

---

## Migration Plan

### Initial Setup
1. Create MongoDB Atlas account
2. Create M0 cluster
3. Configure network access
4. Create database user
5. Get connection string
6. Test connection locally

### Data Migration (if needed)
- Export existing data
- Transform to MongoDB schema
- Bulk import using mongoimport
- Verify data integrity
- Update connection strings

---

## Related User Stories

All other user stories depend on this infrastructure:
- US01: Workshop Initialization
- US02: PIN-Based Participant Entry
- US03: Digital Use Case Canvas
- US04: Live Scoring Interface
- US05: Interactive Hotspot Matrix

---

## Questions/Clarifications

1. What is the expected data growth rate?
2. Should we implement data archival after workshop completion?
3. What is the backup retention requirement?
4. Do we need multi-region deployment?
5. Should we implement read replicas?

---

## Future Enhancements

- Upgrade to paid tier for higher capacity
- Implement sharding for horizontal scaling
- Add read replicas for geographic distribution
- Implement change streams for real-time updates
- Advanced analytics and reporting collections
- Data warehouse integration
- Implement time-series collections for metrics

---

## Definition of Done

- [ ] MongoDB Atlas M0 cluster created
- [ ] Database and collections configured
- [ ] Motor driver integrated with FastAPI
- [ ] Pydantic models defined and validated
- [ ] Connection pooling configured
- [ ] CRUD operations implemented and tested
- [ ] Health check endpoint functional
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] All acceptance criteria met
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Load tests passing
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Connection string secured in env variables
- [ ] Monitoring and alerts configured
- [ ] Code review completed
