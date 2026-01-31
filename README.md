.# Qbrain AI Labs

An AI-driven Collaborative Workshop Platform for use case prioritization.
Qbrain AI Labs allows real-time facilitation of "Hotspot" prioritization workshops. Participants join via mobile/web, submit use cases, and vote on criteria (e.g., Feasibility vs. Business Value) in real-time. The results are instantly visualized in an interactive Matrix (Bubble Chart) to identify "Strategic Bets," "Quick Wins," etc.

## Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Local Development](#-local-development)
  - [Windows](#windows)
  - [Linux](#linux-ubuntudebian)
  - [macOS (Unix)](#macos-unix)
- [Using Supabase PostgreSQL](#-using-supabase-postgresql-cloud-database)
- [Docker Deployment](#-docker-deployment)
- [Production Deployment](#-production-deployment)
  - [Linux (systemd)](#linux-systemd-production)
  - [Windows Server](#windows-server-production)
  - [PM2 (Cross-Platform)](#pm2-cross-platform)
- [Cloud Deployment (Hyperscalers)](#-cloud-deployment-hyperscalers)
  - [Azure](#-azure-deployment)
  - [AWS](#-aws-deployment)
  - [Google Cloud Platform](#-google-cloud-platform-gcp-deployment)
  - [DigitalOcean](#-digitalocean-deployment)
- [Security Best Practices](#-security-best-practices)
- [Monitoring & Logging](#-monitoring--logging)
- [CI/CD Integration](#-cicd-integration)
- [Usage Guide](#-usage-guide)
- [Project Structure](#-project-structure)

---

## ✨ Key Features

- **Facilitator Authentication**: Secure login/signup system for facilitators with JWT-based authentication.
- **Enterprise Admin Panel**: System-wide dashboard for administrators with:
  - **User & Workshop Management**: System stats, user deactivation, and workshop oversight.
  - **Subscription Management**: Tier-based access control (Free, Pro, Enterprise).
  - **Feature Flags**: Toggle features dynamically per organization.
  - **System Settings**: Database-driven configuration and audit logs.
- **Distributed Caching & Rate Limiting**: Redis-powered protection and performance.
- **Request ID Tracking**: Full observability for every API request.
- **Real-Time Collaboration**: Powered by WebSockets (Socket.io), ensure instant updates for all participants.
- **Interactive Workshops**:
  - **Three-Phase Flow**: Intake, Scoring, and Analysis.
  - **Live Polls**: Conduct real-time polls to gauge audience sentiment instantly.
  - **Q&A**: Integrated question and answer flow.
- **Advanced Analytics & Reporting**:
  - **Heatmaps**: Visual voting patterns and participant agreement analysis.
  - **Executive Summaries**: AI-generated reports available in PDF and HTML.
  - **Consensus Metrics**: Identify areas of alignment and divergence.
  - **Data Export**: Full CSV export for offline analysis.
- **Knowledge Base**: Integrated documentation and guides for users.
- **Marketplace**: Browse and adopt industry-standard prioritization templates.
- **Mobile-First Participant UI**: Optimized for phone intake and voting with **QR Code Access**.

---

## 🛠 Tech Stack

### Frontend (Client)
- **Framework**: React 19 (Vite)
- **Styling**: Tailwind CSS (v4)
- **Components**: Radix UI primitives (via customized components)
- **Visualization**: Recharts, D3.js (Custom Interactive Matrix)
- **Real-time**: Socket.io Client
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Notifications**: Sonner

### Backend (Server)
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL (via Supabase or self-hosted)
- **ORM**: SQLAlchemy 2.0 (AsyncIO)
- **Migrations**: Alembic
- **Real-time**: Socket.io (AsyncServer)
- **Caching & Rate Limiting**: Redis (Distributed)
- **AI Integration**: OpenAI API (for summaries and insights)
- **Validation**: Pydantic v2
- **Logging**: Structured logging (structlog)

---

## 🚀 Quick Start

### Using Docker Compose (Fastest)

```bash
# Clone the repository
git clone https://github.com/your-org/qbrainlabs.git
cd qbrainlabs

# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Initialize database (creates tables, runs migrations, and seeds default data)
docker-compose exec backend python init_db.py
```

Access the application:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

**Default Admin Credentials:**
- Email: `admin@qbrainlabs.com`
- Password: `admin123`
- ⚠️ **Change the default password after first login!**

---

## 💻 Local Development

### Prerequisites (All Platforms)

| Component | Version | Notes |
|-----------|---------|-------|
| Python | 3.11+ | Required for backend |
| Node.js | 18+ | Required for frontend |
| PostgreSQL | 15+ | Database (Supabase or self-hosted) |
| Redis | 7+ | Required for distributed rate limiting & caching |
| Git | 2.30+ | Version control |

**Note:** You can use **Supabase PostgreSQL** (cloud-hosted) instead of installing PostgreSQL locally. See the [Supabase Setup Guide](#-using-supabase-postgresql-cloud-database) for details.

---

### Windows

#### 1. Install Prerequisites

**Option A: Using winget (Windows 11/10)**
```powershell
# Run PowerShell as Administrator
winget install Python.Python.3.11
winget install OpenJS.NodeJS.LTS
winget install PostgreSQL.PostgreSQL
winget install Git.Git
```

**Option B: Using Chocolatey**
```powershell
# Install Chocolatey first (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install dependencies
choco install python311 nodejs-lts postgresql15 git redis-64 -y
```

**Option C: Manual Installation**
- Python: https://www.python.org/downloads/
- Node.js: https://nodejs.org/
- PostgreSQL: https://www.postgresql.org/download/windows/
- Git: https://git-scm.com/download/win

#### 2. Setup PostgreSQL (Windows)

```powershell
# Start PostgreSQL service
net start postgresql-x64-15

# Create database (using psql or pgAdmin)
psql -U postgres -c "CREATE DATABASE qbrainlabs;"
```

#### 3. Setup Backend (Windows)

```powershell
# Navigate to server directory
cd server

# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# If execution policy error, run:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
copy ..\.env.example .env
# Edit .env with your settings using notepad or VS Code
notepad .env

# Initialize database (creates tables, runs migrations, and seeds default data)
python init_db.py

# Run development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

#### 4. Setup Frontend (Windows)

```powershell
# Open new terminal, navigate to client directory
cd client

# Install dependencies
npm install

# Run development server
npm run dev
```

#### Windows-Specific Notes
- Use PowerShell or Windows Terminal for best experience
- If using WSL2, follow the Linux instructions instead
- For Docker Desktop on Windows, enable WSL2 backend for better performance

---

### Linux (Ubuntu/Debian)

#### 1. Install Prerequisites

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install Python 3.11+
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Install Node.js 18+ (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis (optional)
sudo apt install -y redis-server

# Install Git
sudo apt install -y git

# Install build essentials (for native dependencies)
sudo apt install -y build-essential libpq-dev
```

#### 2. Setup PostgreSQL (Linux)

```bash
# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE qbrainlabs;
CREATE USER qbrainlabs_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE qbrainlabs TO qbrainlabs_user;
ALTER DATABASE qbrainlabs OWNER TO qbrainlabs_user;
\c qbrainlabs
GRANT ALL ON SCHEMA public TO qbrainlabs_user;
EOF
```

#### 3. Setup Backend (Linux)

```bash
# Navigate to server directory
cd server

# Create virtual environment
python3.11 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Copy and configure environment
cp ../.env.example .env
nano .env  # or vim .env

# Update DATABASE_URL in .env:
# DATABASE_URL=postgresql://qbrainlabs_user:your_secure_password@localhost:5432/qbrainlabs

# Initialize database (creates tables, runs migrations, and seeds default data)
python init_db.py

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 4. Setup Frontend (Linux)

```bash
# Open new terminal, navigate to client directory
cd client

# Install dependencies
npm install

# Run development server
npm run dev -- --host 0.0.0.0
```

#### Linux (RHEL/CentOS/Fedora)

```bash
# Fedora/RHEL 9+
sudo dnf install -y python3.11 python3.11-devel python3.11-pip nodejs npm postgresql-server postgresql-contrib redis git gcc libpq-devel

# Initialize PostgreSQL
sudo postgresql-setup --initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Linux (Arch Linux)

```bash
sudo pacman -S python python-pip nodejs npm postgresql redis git base-devel
sudo systemctl start postgresql redis
sudo -u postgres initdb -D /var/lib/postgres/data
```

---

### macOS (Unix)

#### 1. Install Prerequisites

**Using Homebrew (Recommended)**

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install python@3.11 node@18 postgresql@15 redis git

# Link Python 3.11
brew link python@3.11

# Start services
brew services start postgresql@15
brew services start redis
```

#### 2. Setup PostgreSQL (macOS)

```bash
# Create database
createdb qbrainlabs

# Or with user
psql postgres << EOF
CREATE DATABASE qbrainlabs;
CREATE USER qbrainlabs_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE qbrainlabs TO qbrainlabs_user;
EOF
```

#### 3. Setup Backend (macOS)

```bash
# Navigate to server directory
cd server

# Create virtual environment
python3.11 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Copy and configure environment
cp ../.env.example .env
nano .env  # or vim, or code .env

# Initialize database (creates tables, runs migrations, and seeds default data)
python init_db.py

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 4. Setup Frontend (macOS)

```bash
# Open new terminal, navigate to client directory
cd client

# Install dependencies
npm install

# Run development server
npm run dev
```

---

## ☁️ Using Supabase PostgreSQL (Cloud Database)

Instead of installing PostgreSQL locally, you can use Supabase's managed PostgreSQL database. This is especially useful for:
- **Development**: Quick setup without local database installation
- **Production**: Fully managed, scalable PostgreSQL with built-in features
- **Collaboration**: Shared database for team development
- **Backups**: Automatic backups and point-in-time recovery

### 1. Create Supabase Project

1. **Sign up/Login**: Go to [https://supabase.com](https://supabase.com) and create an account
2. **Create New Project**:
   - Click "New Project"
   - Choose your organization
   - Enter project name (e.g., `qbrainlabs-dev`)
   - Set a strong database password (save this securely!)
   - Select a region closest to your location
   - Click "Create new project"

### 2. Get Database Connection String

Once your project is created:

1. **Navigate to Project Settings**:
   - Go to your project dashboard
   - Click on the gear icon (⚙️) → **Settings**
   - Select **Database** from the left sidebar

2. **Find Connection String**:
   - Scroll to **Connection string** section
   - You'll see two connection options:
     - **Direct connection** (port 5432): For migrations and admin tasks
     - **Connection pooling** (port 6543): For application connections (recommended)

3. **Copy Connection String**:
   - For **application use** (recommended), use the **Connection pooling** string:
     ```
     postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
     ```
   - Replace `[password]` with your database password
   - The connection string will look like:
     ```
     postgresql://postgres.abcdefghijklmnop:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
     ```

### 3. Configure Environment Variables

Update your `.env` file with the Supabase connection string:

```bash
# Copy .env.example to .env if you haven't already
cp .env.example .env

# Edit .env file
```

**For Application Use (Recommended - Connection Pooling):**
```env
# Use connection pooling (port 6543) for better performance
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

**For Migrations/Admin Tasks (Direct Connection):**
```env
# Use direct connection (port 5432) for migrations
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

**Important Notes:**
- Replace `[project-ref]` with your actual project reference (found in your Supabase project URL)
- Replace `[password]` with your database password
- Replace `[region]` with your actual region (e.g., `us-east-1`, `eu-west-1`)
- The `?pgbouncer=true` parameter is important for connection pooling mode

### 4. SSL Connection (Required)

Supabase requires SSL connections. The connection string automatically includes SSL, but if you need to explicitly configure it:

```env
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
```

### 5. Initialize Database Schema

After configuring your `.env` file, initialize the database:

```bash
# Navigate to server directory
cd server

# Activate virtual environment (if not already active)
# Windows:
.\.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

# Run database initialization (creates tables, runs migrations, and seeds default data)
python init_db.py
```

This will create all necessary tables and run migrations.

### 6. Verify Connection

You can verify the connection by:

1. **Check Supabase Dashboard**:
   - Go to **Table Editor** in your Supabase dashboard
   - You should see tables created by `init_db.py`

2. **Test from Application**:
   - Start your backend server: `uvicorn app.main:app --reload`
   - Check the API docs: http://localhost:8000/docs
   - Try creating a user or workshop to verify database writes

### 7. Supabase-Specific Features

Supabase provides additional features you can leverage:

#### Connection Pooling (Supavisor)
- **Transaction Mode** (port 6543): Recommended for most applications
- **Session Mode** (port 5432): For migrations and admin tasks
- Automatically handles connection limits and improves performance

#### Row Level Security (RLS)
- Enable RLS policies in Supabase dashboard for additional security
- Configure policies via SQL or Supabase dashboard

#### Real-time Subscriptions
- Supabase provides real-time database subscriptions
- Can be used alongside Socket.io for enhanced real-time features

### 8. Environment-Specific Configuration

**Development:**
```env
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
ENVIRONMENT=development
```

**Production:**
```env
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
ENVIRONMENT=production
```

### Troubleshooting

**Connection Timeout:**
- Ensure your IP is not blocked (check Supabase dashboard → Settings → Database → Connection Pooling)
- Verify the connection string format is correct
- Check that SSL is enabled (`sslmode=require`)

**"Too many connections" Error:**
- Use connection pooling (port 6543) instead of direct connection
- Reduce `DB_POOL_SIZE` in `.env` if needed
- Check Supabase dashboard for connection limits

**Migration Issues:**
- Use direct connection (port 5432) for migrations
- Ensure you're using the correct database password
- Check Supabase logs in the dashboard

**SSL Certificate Errors:**
- Add `?sslmode=require` to connection string
- For production, use `sslmode=verify-full` for stricter validation

### Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Connection Pooling Guide](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)

---

## 🐳 Docker Deployment

### Docker Compose (Development/Staging)

```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_DB: qbrainlabs
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    environment:
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD:-postgres}@db:5432/qbrainlabs
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=${SECRET_KEY:-change-me-in-production}
      - CORS_ORIGINS=http://localhost:5173,http://localhost:3000
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile
      args:
        VITE_API_URL: http://localhost:8000
    ports:
      - "5173:80"
    depends_on:
      - backend
    environment:
      - BACKEND_URL=http://backend:8000

volumes:
  postgres_data:
  redis_data:
```

### Docker Compose (Production)

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    restart: always
    networks:
      - backend-network

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    restart: always
    networks:
      - backend-network

  backend:
    image: ${REGISTRY}/hotspotmatrix-backend:${TAG:-latest}
    expose:
      - "8000"
    depends_on:
      - db
      - redis
    environment:
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/qbrainlabs
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - SECRET_KEY=${SECRET_KEY}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - CORS_ORIGINS=${CORS_ORIGINS}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    restart: always
    networks:
      - backend-network
      - frontend-network
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 2G
          cpus: '1'

  frontend:
    image: ${REGISTRY}/hotspotmatrix-frontend:${TAG:-latest}
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    environment:
      - BACKEND_URL=http://backend:8000
    restart: always
    networks:
      - frontend-network
    volumes:
      - ./nginx/certs:/etc/nginx/certs:ro

networks:
  backend-network:
    internal: true
  frontend-network:

volumes:
  postgres_data:
  redis_data:
```

**Run Production Stack:**

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale backend
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

---

## 🏭 Production Deployment

### Linux (systemd) Production

#### 1. Create System User

```bash
# Create dedicated user
sudo useradd --system --create-home --shell /bin/bash qbrainlabs
sudo mkdir -p /opt/qbrainlabs
sudo chown -R qbrainlabs:qbrainlabs /opt/qbrainlabs
```

#### 2. Deploy Application

```bash
# Clone repository
sudo -u qbrainlabs git clone https://github.com/your-org/qbrainlabs.git /opt/qbrainlabs/app

# Setup backend
cd /opt/qbrainlabs/app/server
sudo -u qbrainlabs python3.11 -m venv .venv
sudo -u qbrainlabs .venv/bin/pip install -r requirements.txt
sudo -u qbrainlabs .venv/bin/pip install gunicorn

# Setup frontend
cd /opt/qbrainlabs/app/client
sudo -u qbrainlabs npm ci
sudo -u qbrainlabs npm run build
```

#### 3. Create Backend systemd Service

```bash
sudo tee /etc/systemd/system/qbrainlabs-backend.service << 'EOF'
[Unit]
Description=QbrainLabs Backend API
After=network.target postgresql.service redis.service
Requires=postgresql.service

[Service]
Type=exec
User=qbrainlabs
Group=qbrainlabs
WorkingDirectory=/opt/qbrainlabs/app/server
Environment="PATH=/opt/qbrainlabs/app/server/.venv/bin"
EnvironmentFile=/opt/qbrainlabs/.env
ExecStart=/opt/qbrainlabs/app/server/.venv/bin/gunicorn \
    -k uvicorn.workers.UvicornWorker \
    -w 4 \
    -b 0.0.0.0:8000 \
    --access-logfile /var/log/qbrainlabs/access.log \
    --error-logfile /var/log/qbrainlabs/error.log \
    app.main:app
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

#### 4. Create Environment File

```bash
sudo tee /opt/qbrainlabs/.env << 'EOF'
DATABASE_URL=postgresql://qbrainlabs_user:your_password@localhost:5432/qbrainlabs
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-min-32-chars-long
JWT_SECRET_KEY=your-jwt-secret-key-here
CORS_ORIGINS=https://qbrainlabs.com
OPENAI_API_KEY=your-openai-key
EOF

sudo chown qbrainlabs:qbrainlabs /opt/qbrainlabs/.env
sudo chmod 600 /opt/qbrainlabs/.env
```

#### 5. Production Configuration for IP Addresses and Domain Names

When deploying to production, you need to configure the application to work with specific IP addresses or domain names. This section covers all necessary configuration steps.

##### 5.1 Environment Variables Configuration

Create or update your `.env` file with production settings:

```bash
# ===========================================
# PRODUCTION CONFIGURATION
# ===========================================

# Environment
ENVIRONMENT=production
DEBUG=false
NODE_ENV=production

# Server Configuration
# Bind to all interfaces (0.0.0.0) to accept connections from any IP
SERVER_HOST=0.0.0.0
SERVER_PORT=8000

# Frontend Configuration
# For production, frontend is typically served via nginx on port 80/443
# If running Vite dev server, use 0.0.0.0 to allow network access
CLIENT_HOST=0.0.0.0
CLIENT_PORT=5173

# CORS Configuration
# IMPORTANT: Add all domains and IP addresses that will access your application
# Format: comma-separated list of origins (protocol://domain:port)
# Examples:
#   - Single domain: https://qbrainlabs.com
#   - Multiple domains: https://qbrainlabs.com,https://www.qbrainlabs.com
#   - IP address: http://192.168.1.100:5173
#   - Multiple IPs: http://192.168.1.100:5173,http://10.0.0.50:5173
#   - Mixed: https://qbrainlabs.com,http://192.168.1.100:5173
CORS_ORIGINS=https://qbrainlabs.com,https://www.qbrainlabs.com,http://192.168.1.100:5173

# Frontend API URL (for build-time configuration)
# This is used when building the frontend with Vite
# Leave empty to use auto-detection based on hostname
# Examples:
#   - Domain: https://api.qbrainlabs.com
#   - IP: http://192.168.1.100:8000
#   - Auto-detect: (leave empty)
VITE_API_URL=

# Database
DATABASE_URL=postgresql://user:password@host:5432/qbrainlabs

# Security (CRITICAL: Generate new keys for production!)
SECRET_KEY=your-production-secret-key-min-32-chars
JWT_SECRET_KEY=your-production-jwt-secret-key
```

##### 5.2 CORS Configuration for Multiple Domains/IPs

The application uses CORS (Cross-Origin Resource Sharing) to control which domains can access the API. Configure this properly for production:

**Option A: Specific Domains/IPs (Recommended for Production)**

```bash
# In your .env file
CORS_ORIGINS=https://qbrainlabs.com,https://www.qbrainlabs.com,https://app.qbrainlabs.com
```

**Option B: Allow All Origins (NOT Recommended - Use Only for Development)**

```bash
# In server/app/main.py, modify CORS middleware:
# WARNING: This allows any origin - security risk!
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # NOT recommended for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Option C: Dynamic CORS Based on Environment**

For flexibility, you can configure CORS based on environment:

```python
# In server/app/main.py
import os

cors_origins = os.getenv("CORS_ORIGINS", "").split(",")
cors_origins = [origin.strip() for origin in cors_origins if origin.strip()]

# Allow localhost in development
if os.getenv("ENVIRONMENT") == "development":
    cors_origins.extend([
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

##### 5.3 Frontend API URL Configuration

The frontend automatically detects the API URL based on the hostname when accessed. However, for production builds, you may want to set it explicitly.

**For Development (Vite Dev Server):**

The frontend auto-detects the API URL:
- If accessing via `localhost` → API uses `http://localhost:8000`
- If accessing via IP `192.168.1.100` → API uses `http://192.168.1.100:8000`
- If accessing via domain `qbrainlabs.com` → API uses `http://qbrainlabs.com:8000`

**For Production Build:**

Option 1: Set at build time (recommended for single-domain deployments):

```bash
# Build with specific API URL
cd client
VITE_API_URL=https://api.qbrainlabs.com npm run build
```

Option 2: Use environment variable substitution in nginx (recommended for multi-domain):

```nginx
# In nginx.conf, proxy API requests
location /api {
    proxy_pass http://backend:8000/api;
    # ... other proxy settings
}
```

Then configure frontend to use relative URLs (already configured in the code).

##### 5.4 Network Binding Configuration

**Backend (FastAPI):**

Ensure the backend binds to `0.0.0.0` to accept connections from any IP:

```bash
# In .env
SERVER_HOST=0.0.0.0
SERVER_PORT=8000

# Or when running directly
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Frontend (Vite Dev Server):**

For development, bind to `0.0.0.0`:

```bash
# In .env
CLIENT_HOST=0.0.0.0
CLIENT_PORT=5173

# Or when running directly
npm run dev -- --host 0.0.0.0
```

**Production Frontend (Nginx):**

Nginx should listen on all interfaces:

```nginx
server {
    listen 80;
    listen [::]:80;  # IPv6
    server_name qbrainlabs.com www.qbrainlabs.com;
    # ... rest of config
}
```

##### 5.5 Reverse Proxy Configuration (Nginx)

For production, use nginx as a reverse proxy. This allows:
- Single domain/port for both frontend and backend
- SSL/TLS termination
- Load balancing
- Better security

**Complete Nginx Configuration:**

```nginx
# /etc/nginx/sites-available/qbrainlabs

# Upstream backend
upstream backend {
    server 127.0.0.1:8000;
    keepalive 32;
}

# HTTP server (redirects to HTTPS)
server {
    listen 80;
    listen [::]:80;
    server_name qbrainlabs.com www.qbrainlabs.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name qbrainlabs.com www.qbrainlabs.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/qbrainlabs.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/qbrainlabs.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Root directory (frontend build)
    root /opt/qbrainlabs/app/client/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/json application/xml+rss;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket connections
    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

**Enable the site:**

```bash
sudo ln -s /etc/nginx/sites-available/qbrainlabs /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

##### 5.6 Domain Name Configuration

**Step 1: DNS Configuration**

Point your domain to your server's IP address:

```
Type: A
Name: @ (or qbrainlabs.com)
Value: YOUR_SERVER_IP_ADDRESS
TTL: 3600

Type: A
Name: www
Value: YOUR_SERVER_IP_ADDRESS
TTL: 3600
```

**Step 2: Update CORS Origins**

After DNS is configured, update your `.env`:

```bash
CORS_ORIGINS=https://qbrainlabs.com,https://www.qbrainlabs.com
```

**Step 3: SSL Certificate (Let's Encrypt)**

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d qbrainlabs.com -d www.qbrainlabs.com

# Auto-renewal (already configured by certbot)
sudo certbot renew --dry-run
```

##### 5.7 IP Address Access Configuration

If you need to access the application via IP address (without domain):

**Step 1: Update CORS**

```bash
# Add IP address to CORS origins
CORS_ORIGINS=http://YOUR_IP_ADDRESS:5173,https://qbrainlabs.com
```

**Step 2: Configure Nginx for IP Access**

```nginx
# Add server block for IP access
server {
    listen 80;
    server_name YOUR_IP_ADDRESS;

    # Same configuration as domain server block
    # ... (copy from above)
}
```

**Step 3: Firewall Configuration**

Ensure ports are open:

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8000/tcp  # If accessing backend directly
sudo ufw allow 5173/tcp  # If using Vite dev server

# firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

##### 5.8 Docker Production Configuration

For Docker deployments, update `docker-compose.prod.yml`:

```yaml
services:
  backend:
    environment:
      - SERVER_HOST=0.0.0.0
      - SERVER_PORT=8000
      - CORS_ORIGINS=https://qbrainlabs.com,https://www.qbrainlabs.com
      - DATABASE_URL=${DATABASE_URL}
      - SECRET_KEY=${SECRET_KEY}
    # ... other config

  frontend:
    environment:
      - VITE_API_URL=  # Empty for auto-detection or set to backend URL
    # ... other config
```

##### 5.9 Verification Checklist

After configuration, verify:

- [ ] Backend is accessible: `curl http://YOUR_DOMAIN_OR_IP:8000/`
- [ ] Frontend is accessible: `curl http://YOUR_DOMAIN_OR_IP/`
- [ ] API endpoints work: `curl http://YOUR_DOMAIN_OR_IP/api/workshops`
- [ ] CORS headers are correct: Check browser Network tab
- [ ] WebSocket connections work: Check browser console for socket.io connection
- [ ] SSL certificate is valid (if using HTTPS)
- [ ] Firewall allows necessary ports
- [ ] DNS resolves correctly: `nslookup qbrainlabs.com`

##### 5.10 Troubleshooting

**Issue: CORS errors in browser**

- Check `CORS_ORIGINS` includes your domain/IP
- Verify protocol matches (http vs https)
- Check port numbers match
- Restart backend after changing CORS settings

**Issue: API calls fail**

- Verify `VITE_API_URL` is set correctly or auto-detection works
- Check backend is accessible from frontend server
- Verify nginx proxy configuration
- Check browser console for errors

**Issue: WebSocket connections fail**

- Verify `/ws` location in nginx config
- Check `proxy_set_header Upgrade` and `Connection` headers
- Verify backend WebSocket endpoint is accessible
- Check firewall allows WebSocket connections

**Issue: Application not accessible from network**

- Verify `SERVER_HOST=0.0.0.0` (not `127.0.0.1`)
- Check firewall rules
- Verify network routing
- Check if server is behind NAT/router (may need port forwarding)

#### 6. Setup Nginx Reverse Proxy

```bash
sudo tee /etc/nginx/sites-available/qbrainlabs << 'EOF'
upstream backend {
    server 127.0.0.1:8000;
    keepalive 32;
}

server {
    listen 80;
    server_name qbrainlabs.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name qbrainlabs.com;

    ssl_certificate /etc/letsencrypt/live/qbrainlabs.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/qbrainlabs.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # Frontend static files
    root /opt/qbrainlabs/app/client/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
    }

    # WebSocket proxy
    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/qbrainlabs /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

#### 6. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d qbrainlabs.com

# Auto-renewal is configured automatically
sudo systemctl enable certbot.timer
```

#### 7. Start Services

```bash
# Create log directory
sudo mkdir -p /var/log/qbrainlabs
sudo chown qbrainlabs:qbrainlabs /var/log/qbrainlabs

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable qbrainlabs-backend
sudo systemctl start qbrainlabs-backend

# Check status
sudo systemctl status qbrainlabs-backend
journalctl -u qbrainlabs-backend -f
```

---

### Windows Server Production

#### 1. Install Prerequisites

```powershell
# Run PowerShell as Administrator

# Install IIS with required features
Install-WindowsFeature -Name Web-Server, Web-WebSockets, Web-Http-Redirect -IncludeManagementTools

# Install URL Rewrite Module
# Download from: https://www.iis.net/downloads/microsoft/url-rewrite

# Install Python 3.11
winget install Python.Python.3.11

# Install Node.js
winget install OpenJS.NodeJS.LTS

# Install PostgreSQL
winget install PostgreSQL.PostgreSQL
```

#### 2. Install NSSM (Non-Sucking Service Manager)

```powershell
# Download NSSM
Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile "nssm.zip"
Expand-Archive -Path "nssm.zip" -DestinationPath "C:\nssm"

# Add to PATH
$env:Path += ";C:\nssm\nssm-2.24\win64"
[Environment]::SetEnvironmentVariable("Path", $env:Path, [EnvironmentVariableTarget]::Machine)
```

#### 3. Deploy Application

```powershell
# Create application directory
New-Item -ItemType Directory -Path "C:\qbrainlabs" -Force

# Clone repository
cd C:\qbrainlabs
git clone https://github.com/your-org/qbrainlabs.git app

# Setup backend
cd C:\qbrainlabs\app\server
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install waitress

# Create environment file
Copy-Item ..\.env.example .env
notepad .env  # Edit with your settings

# Initialize database
python init_db.py

# Build frontend
cd C:\qbrainlabs\app\client
npm ci
npm run build
```

#### 4. Create Windows Service for Backend

```powershell
# Create startup script
@"
@echo off
cd /d C:\qbrainlabs\app\server
call .venv\Scripts\activate
waitress-serve --host=127.0.0.1 --port=8000 app.main:app
"@ | Out-File -FilePath "C:\qbrainlabs\start-backend.bat" -Encoding ASCII

# Install as Windows service using NSSM
nssm install QbrainLabs-Backend "C:\qbrainlabs\start-backend.bat"
nssm set QbrainLabs-Backend DisplayName "QbrainLabs Backend"
nssm set QbrainLabs-Backend Description "QbrainLabs FastAPI Backend Service"
nssm set QbrainLabs-Backend AppDirectory "C:\qbrainlabs\app\server"
nssm set QbrainLabs-Backend AppStdout "C:\qbrainlabs\logs\backend-stdout.log"
nssm set QbrainLabs-Backend AppStderr "C:\qbrainlabs\logs\backend-stderr.log"
nssm set QbrainLabs-Backend Start SERVICE_AUTO_START

# Create logs directory
New-Item -ItemType Directory -Path "C:\qbrainlabs\logs" -Force

# Start service
nssm start QbrainLabs-Backend
```

#### 5. Configure IIS as Reverse Proxy

```powershell
# Install ARR (Application Request Routing)
# Download from: https://www.iis.net/downloads/microsoft/application-request-routing

# Create IIS site for frontend
New-WebSite -Name "QbrainAILabs" -Port 443 -HostHeader "qbrainlabs.com" -PhysicalPath "C:\qbrainlabs\app\client\dist" -Ssl

# Import SSL certificate
Import-PfxCertificate -FilePath "C:\certs\yourdomain.pfx" -CertStoreLocation "Cert:\LocalMachine\My" -Password (ConvertTo-SecureString -String "password" -AsPlainText -Force)
```

Create `web.config` in `C:\qbrainlabs\app\client\dist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <!-- API Proxy -->
                <rule name="API Proxy" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <action type="Rewrite" url="http://127.0.0.1:8000/api/{R:1}" />
                </rule>
                <!-- WebSocket Proxy -->
                <rule name="WebSocket Proxy" stopProcessing="true">
                    <match url="^socket.io/(.*)" />
                    <action type="Rewrite" url="http://127.0.0.1:8000/socket.io/{R:1}" />
                </rule>
                <!-- SPA Fallback -->
                <rule name="SPA Routes" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="/" />
                </rule>
            </rules>
        </rewrite>
        <staticContent>
            <mimeMap fileExtension=".json" mimeType="application/json" />
            <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
        </staticContent>
    </system.webServer>
</configuration>
```

---

### PM2 (Cross-Platform)

PM2 works on Windows, Linux, and macOS for managing Node.js and Python processes.

#### 1. Install PM2

```bash
npm install -g pm2

# Windows: Install windows-startup
npm install -g pm2-windows-startup
pm2-startup install
```

#### 2. Create PM2 Ecosystem File

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'qbrainlabs-backend',
      cwd: './server',
      script: '.venv/bin/uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8000',
      interpreter: 'none',
      env: {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/qbrainlabs',
        REDIS_URL: 'redis://localhost:6379/0',
        SECRET_KEY: 'your-secret-key',
      },
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
    },
    {
      name: 'qbrainlabs-frontend',
      cwd: './client',
      script: 'npx',
      args: 'serve -s dist -l 3000',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
    }
  ]
};
```

#### 3. Start with PM2

```bash
# Start all apps
pm2 start ecosystem.config.js

# Save process list
pm2 save

# Setup startup script
pm2 startup

# Monitor
pm2 monit

# View logs
pm2 logs
```

---

## ☁️ Cloud Deployment (Hyperscalers)

### Prerequisites for All Platforms

1. **Environment Variables**: Prepare the following:
   ```bash
   # Database
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   
   # Redis
   REDIS_URL=redis://host:6379/0
   
   # Security
   SECRET_KEY=your-secret-key-min-32-chars
   JWT_SECRET_KEY=your-jwt-secret-key
   
   # CORS (comma-separated)
   CORS_ORIGINS=https://qbrainlabs.com
   
   # OpenAI (optional)
   OPENAI_API_KEY=your-openai-api-key
   ```

2. **Docker Images**: Build and push Docker images:
   ```bash
# Build backend image
cd server
docker build -t qbrainlabs-backend:latest .

# Build frontend image
cd client
docker build -t qbrainlabs-frontend:latest .
   ```

---

## 🟦 Azure Deployment

### Option 1: Azure Container Apps (Recommended)

Azure Container Apps provides serverless container hosting with built-in scaling.

#### 1. Create Azure Resources

```bash
# Login to Azure
az login

# Set variables
RESOURCE_GROUP="qbrainlabs-rg"
LOCATION="eastus"
ACR_NAME="qbrainlabsacr"
CONTAINER_APP_ENV="qbrainlabs-env"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Container Registry
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic
az acr login --name $ACR_NAME

# Build and push images
cd server
docker build -t $ACR_NAME.azurecr.io/qbrainlabs-backend:latest .
docker push $ACR_NAME.azurecr.io/qbrainlabs-backend:latest

cd ../client
docker build -t $ACR_NAME.azurecr.io/qbrainlabs-frontend:latest .
docker push $ACR_NAME.azurecr.io/qbrainlabs-frontend:latest
```

#### 2. Create Azure Database for PostgreSQL

```bash
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name qbrainlabs-db \
  --location $LOCATION \
  --admin-user postgres \
  --admin-password "YourSecurePassword123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 15 \
  --storage-size 32

az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name qbrainlabs-db \
  --database-name qbrainlabs
```

#### 3. Create Azure Cache for Redis

```bash
az redis create \
  --resource-group $RESOURCE_GROUP \
  --name qbrainlabs-redis \
  --location $LOCATION \
  --sku Basic \
  --vm-size c0
```

#### 4. Create Container Apps Environment and Deploy

```bash
# Create environment
az containerapp env create \
  --name $CONTAINER_APP_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Deploy backend
az containerapp create \
  --name qbrainlabs-backend \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_APP_ENV \
  --image $ACR_NAME.azurecr.io/qbrainlabs-backend:latest \
  --target-port 8000 \
  --ingress external \
  --registry-server $ACR_NAME.azurecr.io \
  --env-vars \
    DATABASE_URL="postgresql://postgres:YourSecurePassword123!@qbrainlabs-db.postgres.database.azure.com:5432/qbrainlabs" \
    REDIS_URL="redis://qbrainlabs-redis.redis.cache.windows.net:6380?ssl=true" \
    SECRET_KEY="your-secret-key-here" \
  --cpu 1.0 --memory 2.0Gi \
  --min-replicas 1 --max-replicas 10

# Deploy frontend
BACKEND_URL=$(az containerapp show --name qbrainlabs-backend --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)

az containerapp create \
  --name qbrainlabs-frontend \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_APP_ENV \
  --image $ACR_NAME.azurecr.io/qbrainlabs-frontend:latest \
  --target-port 80 \
  --ingress external \
  --registry-server $ACR_NAME.azurecr.io \
  --env-vars VITE_API_URL="https://$BACKEND_URL" \
  --cpu 0.5 --memory 1.0Gi
```

### Option 2: Azure App Service

```bash
# Create App Service Plan
az appservice plan create \
  --name qbrainlabs-plan \
  --resource-group $RESOURCE_GROUP \
  --sku B1 --is-linux

# Create Web App
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan qbrainlabs-plan \
  --name qbrainlabs-backend \
  --deployment-container-image-name $ACR_NAME.azurecr.io/qbrainlabs-backend:latest

# Enable WebSockets
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name qbrainlabs-backend \
  --web-sockets-enabled true
```

---

## 🟧 AWS Deployment

### Option 1: AWS ECS with Fargate (Recommended)

#### 1. Create ECR Repositories

```bash
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create repositories
aws ecr create-repository --repository-name qbrainlabs-backend --region $AWS_REGION
aws ecr create-repository --repository-name qbrainlabs-frontend --region $AWS_REGION

# Login and push
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

docker tag qbrainlabs-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/qbrainlabs-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/qbrainlabs-backend:latest
```

#### 2. Create RDS PostgreSQL

```bash
aws rds create-db-instance \
  --db-instance-identifier qbrainlabs-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username postgres \
  --master-user-password YourSecurePassword123! \
  --allocated-storage 20 \
  --storage-encrypted
```

#### 3. Create ECS Cluster and Service

```bash
# Create cluster
aws ecs create-cluster --cluster-name qbrainlabs-cluster

# Create task definition (see full JSON in docs)
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service with Fargate
aws ecs create-service \
  --cluster qbrainlabs-cluster \
  --service-name qbrainlabs-backend \
  --task-definition qbrainlabs-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Option 2: AWS Elastic Beanstalk

```bash
pip install awsebcli

cd server
eb init -p python-3.11 qbrainlabs-backend --region us-east-1
eb create qbrainlabs-backend-env
eb setenv DATABASE_URL="postgresql://..." REDIS_URL="redis://..."
eb deploy
```

### Option 3: AWS App Runner

```bash
aws apprunner create-service \
  --service-name qbrainlabs-backend \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "'$AWS_ACCOUNT_ID'.dkr.ecr.'$AWS_REGION'.amazonaws.com/qbrainlabs-backend:latest",
      "ImageRepositoryType": "ECR"
    }
  }' \
  --instance-configuration '{
    "Cpu": "1024",
    "Memory": "2048"
  }'
```

---

## 🟩 Google Cloud Platform (GCP) Deployment

### Option 1: Cloud Run (Recommended)

#### 1. Setup Project

```bash
PROJECT_ID="your-project-id"
REGION="us-central1"

gcloud config set project $PROJECT_ID

gcloud services enable \
  run.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  containerregistry.googleapis.com
```

#### 2. Create Cloud SQL PostgreSQL

```bash
gcloud sql instances create qbrainlabs-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --root-password=YourSecurePassword123!

gcloud sql databases create qbrainlabs --instance=qbrainlabs-db
```

#### 3. Create Memorystore Redis

```bash
gcloud redis instances create qbrainlabs-redis \
  --size=1 \
  --region=$REGION \
  --redis-version=redis_7_0
```

#### 4. Build and Deploy

```bash
# Configure Docker
gcloud auth configure-docker

# Build and push
cd server
gcloud builds submit --tag gcr.io/$PROJECT_ID/qbrainlabs-backend:latest

# Deploy to Cloud Run
gcloud run deploy qbrainlabs-backend \
  --image gcr.io/$PROJECT_ID/qbrainlabs-backend:latest \
  --platform managed \
  --region=$REGION \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --min-instances=1 \
  --max-instances=10 \
  --port=8000
```

### Option 2: Google Kubernetes Engine (GKE)

```bash
# Create cluster
gcloud container clusters create qbrainlabs-cluster \
  --num-nodes=3 \
  --machine-type=e2-medium \
  --region=$REGION \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=10

# Apply Kubernetes manifests
kubectl apply -f k8s/
```

---

## 🌊 DigitalOcean Deployment

### App Platform (Recommended)

```bash
# Install doctl
brew install doctl  # macOS
# or: snap install doctl  # Linux

# Authenticate
doctl auth init

# Create app from spec
doctl apps create --spec .do/app.yaml
```

Create `.do/app.yaml`:

```yaml
name: qbrainlabs
region: nyc
services:
  - name: backend
    github:
      repo: your-org/qbrainlabs
      branch: main
      deploy_on_push: true
    source_dir: server
    dockerfile_path: Dockerfile
    http_port: 8000
    instance_size_slug: basic-s
    instance_count: 2
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        value: ${db.DATABASE_URL}
      - key: SECRET_KEY
        scope: RUN_TIME
        type: SECRET
        
  - name: frontend
    github:
      repo: your-org/hotspotmatrix
      branch: main
    source_dir: client
    dockerfile_path: Dockerfile
    http_port: 80
    
databases:
  - name: db
    engine: PG
    version: "15"
    size: db-s-1vcpu-1gb
```

### Droplet (Manual)

```bash
# Create droplet with Docker
doctl compute droplet create qbrainlabs \
  --image docker-20-04 \
  --size s-2vcpu-4gb \
  --region nyc1 \
  --ssh-keys your-ssh-key-id

# SSH and deploy
ssh root@your-droplet-ip
git clone https://github.com/your-org/qbrainlabs.git
cd qbrainlabs
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔐 Security Best Practices

### Secrets Management

| Platform | Service | Configuration |
|----------|---------|---------------|
| Azure | Key Vault | `az keyvault secret set --vault-name mykeyvault --name SECRET_KEY --value "..."` |
| AWS | Secrets Manager | `aws secretsmanager create-secret --name qbrainlabs/secrets --secret-string '{"SECRET_KEY":"..."}'` |
| GCP | Secret Manager | `echo -n "..." | gcloud secrets create SECRET_KEY --data-file=-` |

### SSL/TLS Configuration

```bash
# Let's Encrypt (Linux)
sudo certbot certonly --standalone -d qbrainlabs.com

# AWS Certificate Manager
aws acm request-certificate --domain-name qbrainlabs.com --validation-method DNS

# GCP Managed SSL
gcloud compute ssl-certificates create qbrainlabs-cert \
  --domains=qbrainlabs.com
```

### Database Security

- Use private endpoints/VPCs
- Enable SSL/TLS connections
- Restrict network access with security groups
- Enable encryption at rest
- Regular automated backups

### Environment Variables

- Never commit secrets to version control
- Use `.env.example` as a template
- Rotate secrets regularly
- Use platform-specific secret management

---

## 📊 Monitoring & Logging

### Azure
- **Application Insights**: APM and monitoring
- **Log Analytics**: Centralized logging
- **Azure Monitor**: Alerts and dashboards

### AWS
- **CloudWatch**: Metrics and logs
- **X-Ray**: Distributed tracing
- **CloudWatch Alarms**: Automated alerting

### GCP
- **Cloud Monitoring**: Metrics and dashboards
- **Cloud Logging**: Centralized logs
- **Error Reporting**: Exception tracking
- **Cloud Trace**: Distributed tracing

### Self-Hosted
- **Prometheus + Grafana**: Metrics and visualization
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Sentry**: Error tracking
- **Jaeger**: Distributed tracing

---

## 🚀 CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: |
          cd server && pip install -r requirements.txt && pytest
          cd ../client && npm ci && npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build and push Docker images
        run: |
          docker build -t ${{ secrets.REGISTRY }}/qbrainlabs-backend:${{ github.sha }} ./server
          docker push ${{ secrets.REGISTRY }}/qbrainlabs-backend:${{ github.sha }}
          
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy qbrainlabs-backend \
            --image ${{ secrets.REGISTRY }}/qbrainlabs-backend:${{ github.sha }} \
            --region us-central1
```

---

## 📖 Usage Guide

### Administrator
1. Log in with admin credentials
2. Access the **Admin Panel** via the Shield icon
3. Manage **Subscriptions**, **Feature Flags**, and **System Settings**
4. View **Audit Logs** to track system changes

### Facilitator
1. **Sign up/Log in** as a facilitator
2. **Create Workshop**: choose a template from the **Marketplace** or custom criteria
3. Share the **QR Code** or PIN
4. Manage the workshop flow:
   - **Intake**: Approve incoming use cases
   - **Scoring**: Present cards for voting
   - **Polls**: Launch ad-hoc polls for feedback
5. **Analyze**: Dashboard with heatmaps and "Strategic Bets" identification
6. **Export**: Generate PDF reports for stakeholders

### Participant
1. Scan QR Code or visit the join page
2. Enter PIN and nickname
3. Submit ideas, vote on criteria, and answer polls in real-time

---

## 📂 Project Structure

```
├── client/              # React 19 + Vite Frontend
│   ├── src/
│   │   ├── components/  # Core UI components
│   │   ├── pages/       # Route pages
│   │   ├── context/     # Global State (Auth, Theme, Session)
│   │   └── lib/         # API Client & Socket.io
│   ├── Dockerfile       # Frontend container
│   └── nginx.conf       # Production nginx config
├── server/              # FastAPI Backend
│   ├── app/
│   │   ├── api/         # REST Endpoints
│   │   ├── core/        # Config, Database, Security
│   │   ├── models/      # SQLAlchemy Models
│   │   ├── schemas/     # Pydantic Schemas
│   │   └── services/    # Business Logic
│   ├── migrations/      # Alembic DB Migrations
│   └── Dockerfile       # Backend container
├── docs/                # Project Documentation
├── docker-compose.yml   # Local development
└── .env.example         # Environment template
```

---

## 📄 License

MIT
