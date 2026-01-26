# Qbrain AI Labs

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
- **AI Integration**: OpenAI API (for summaries and insights)
- **Validation**: Pydantic v2

---

## 🚀 Quick Start

### Using Docker Compose (Fastest)

```bash
# Clone the repository
git clone https://github.com/your-org/hotspotmatrix.git
cd hotspotmatrix

# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Initialize database
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
| PostgreSQL | 15+ | Database (or use Docker) |
| Redis | 7+ | Optional, for caching |
| Git | 2.30+ | Version control |

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
psql -U postgres -c "CREATE DATABASE hotspotmatrix;"
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

# Initialize database
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
CREATE DATABASE hotspotmatrix;
CREATE USER hotspotmatrix_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE hotspotmatrix TO hotspotmatrix_user;
ALTER DATABASE hotspotmatrix OWNER TO hotspotmatrix_user;
\c hotspotmatrix
GRANT ALL ON SCHEMA public TO hotspotmatrix_user;
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
# DATABASE_URL=postgresql://hotspotmatrix_user:your_secure_password@localhost:5432/hotspotmatrix

# Initialize database
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
createdb hotspotmatrix

# Or with user
psql postgres << EOF
CREATE DATABASE hotspotmatrix;
CREATE USER hotspotmatrix_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE hotspotmatrix TO hotspotmatrix_user;
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

# Initialize database
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
      POSTGRES_DB: hotspotmatrix
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
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD:-postgres}@db:5432/hotspotmatrix
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
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
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
sudo useradd --system --create-home --shell /bin/bash hotspotmatrix
sudo mkdir -p /opt/hotspotmatrix
sudo chown -R hotspotmatrix:hotspotmatrix /opt/hotspotmatrix
```

#### 2. Deploy Application

```bash
# Clone repository
sudo -u hotspotmatrix git clone https://github.com/your-org/hotspotmatrix.git /opt/hotspotmatrix/app

# Setup backend
cd /opt/hotspotmatrix/app/server
sudo -u hotspotmatrix python3.11 -m venv .venv
sudo -u hotspotmatrix .venv/bin/pip install -r requirements.txt
sudo -u hotspotmatrix .venv/bin/pip install gunicorn

# Setup frontend
cd /opt/hotspotmatrix/app/client
sudo -u hotspotmatrix npm ci
sudo -u hotspotmatrix npm run build
```

#### 3. Create Backend systemd Service

```bash
sudo tee /etc/systemd/system/hotspotmatrix-backend.service << 'EOF'
[Unit]
Description=Hotspot Matrix Backend API
After=network.target postgresql.service redis.service
Requires=postgresql.service

[Service]
Type=exec
User=hotspotmatrix
Group=hotspotmatrix
WorkingDirectory=/opt/hotspotmatrix/app/server
Environment="PATH=/opt/hotspotmatrix/app/server/.venv/bin"
EnvironmentFile=/opt/hotspotmatrix/.env
ExecStart=/opt/hotspotmatrix/app/server/.venv/bin/gunicorn \
    -k uvicorn.workers.UvicornWorker \
    -w 4 \
    -b 0.0.0.0:8000 \
    --access-logfile /var/log/hotspotmatrix/access.log \
    --error-logfile /var/log/hotspotmatrix/error.log \
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
sudo tee /opt/hotspotmatrix/.env << 'EOF'
DATABASE_URL=postgresql://hotspotmatrix_user:your_password@localhost:5432/hotspotmatrix
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-min-32-chars-long
JWT_SECRET_KEY=your-jwt-secret-key-here
CORS_ORIGINS=https://qbrainlabs.com
OPENAI_API_KEY=your-openai-key
EOF

sudo chown hotspotmatrix:hotspotmatrix /opt/hotspotmatrix/.env
sudo chmod 600 /opt/hotspotmatrix/.env
```

#### 5. Setup Nginx Reverse Proxy

```bash
sudo tee /etc/nginx/sites-available/hotspotmatrix << 'EOF'
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
    root /opt/hotspotmatrix/app/client/dist;
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
sudo ln -s /etc/nginx/sites-available/hotspotmatrix /etc/nginx/sites-enabled/
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
sudo mkdir -p /var/log/hotspotmatrix
sudo chown hotspotmatrix:hotspotmatrix /var/log/hotspotmatrix

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable hotspotmatrix-backend
sudo systemctl start hotspotmatrix-backend

# Check status
sudo systemctl status hotspotmatrix-backend
journalctl -u hotspotmatrix-backend -f
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
New-Item -ItemType Directory -Path "C:\hotspotmatrix" -Force

# Clone repository
cd C:\hotspotmatrix
git clone https://github.com/your-org/hotspotmatrix.git app

# Setup backend
cd C:\hotspotmatrix\app\server
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
cd C:\hotspotmatrix\app\client
npm ci
npm run build
```

#### 4. Create Windows Service for Backend

```powershell
# Create startup script
@"
@echo off
cd /d C:\hotspotmatrix\app\server
call .venv\Scripts\activate
waitress-serve --host=127.0.0.1 --port=8000 app.main:app
"@ | Out-File -FilePath "C:\hotspotmatrix\start-backend.bat" -Encoding ASCII

# Install as Windows service using NSSM
nssm install HotspotMatrix-Backend "C:\hotspotmatrix\start-backend.bat"
nssm set HotspotMatrix-Backend DisplayName "Hotspot Matrix Backend"
nssm set HotspotMatrix-Backend Description "Hotspot Matrix FastAPI Backend Service"
nssm set HotspotMatrix-Backend AppDirectory "C:\hotspotmatrix\app\server"
nssm set HotspotMatrix-Backend AppStdout "C:\hotspotmatrix\logs\backend-stdout.log"
nssm set HotspotMatrix-Backend AppStderr "C:\hotspotmatrix\logs\backend-stderr.log"
nssm set HotspotMatrix-Backend Start SERVICE_AUTO_START

# Create logs directory
New-Item -ItemType Directory -Path "C:\hotspotmatrix\logs" -Force

# Start service
nssm start HotspotMatrix-Backend
```

#### 5. Configure IIS as Reverse Proxy

```powershell
# Install ARR (Application Request Routing)
# Download from: https://www.iis.net/downloads/microsoft/application-request-routing

# Create IIS site for frontend
New-WebSite -Name "QbrainAILabs" -Port 443 -HostHeader "qbrainlabs.com" -PhysicalPath "C:\hotspotmatrix\app\client\dist" -Ssl

# Import SSL certificate
Import-PfxCertificate -FilePath "C:\certs\yourdomain.pfx" -CertStoreLocation "Cert:\LocalMachine\My" -Password (ConvertTo-SecureString -String "password" -AsPlainText -Force)
```

Create `web.config` in `C:\hotspotmatrix\app\client\dist`:

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
      name: 'hotspotmatrix-backend',
      cwd: './server',
      script: '.venv/bin/uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8000',
      interpreter: 'none',
      env: {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/hotspotmatrix',
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
      name: 'hotspotmatrix-frontend',
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
   docker build -t hotspotmatrix-backend:latest .
   
   # Build frontend image
   cd client
   docker build -t hotspotmatrix-frontend:latest .
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
RESOURCE_GROUP="hotspotmatrix-rg"
LOCATION="eastus"
ACR_NAME="hotspotmatrixacr"
CONTAINER_APP_ENV="hotspotmatrix-env"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Container Registry
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic
az acr login --name $ACR_NAME

# Build and push images
cd server
docker build -t $ACR_NAME.azurecr.io/hotspotmatrix-backend:latest .
docker push $ACR_NAME.azurecr.io/hotspotmatrix-backend:latest

cd ../client
docker build -t $ACR_NAME.azurecr.io/hotspotmatrix-frontend:latest .
docker push $ACR_NAME.azurecr.io/hotspotmatrix-frontend:latest
```

#### 2. Create Azure Database for PostgreSQL

```bash
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name hotspotmatrix-db \
  --location $LOCATION \
  --admin-user postgres \
  --admin-password "YourSecurePassword123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 15 \
  --storage-size 32

az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name hotspotmatrix-db \
  --database-name hotspotmatrix
```

#### 3. Create Azure Cache for Redis

```bash
az redis create \
  --resource-group $RESOURCE_GROUP \
  --name hotspotmatrix-redis \
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
  --name hotspotmatrix-backend \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_APP_ENV \
  --image $ACR_NAME.azurecr.io/hotspotmatrix-backend:latest \
  --target-port 8000 \
  --ingress external \
  --registry-server $ACR_NAME.azurecr.io \
  --env-vars \
    DATABASE_URL="postgresql://postgres:YourSecurePassword123!@hotspotmatrix-db.postgres.database.azure.com:5432/hotspotmatrix" \
    REDIS_URL="redis://hotspotmatrix-redis.redis.cache.windows.net:6380?ssl=true" \
    SECRET_KEY="your-secret-key-here" \
  --cpu 1.0 --memory 2.0Gi \
  --min-replicas 1 --max-replicas 10

# Deploy frontend
BACKEND_URL=$(az containerapp show --name hotspotmatrix-backend --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)

az containerapp create \
  --name hotspotmatrix-frontend \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_APP_ENV \
  --image $ACR_NAME.azurecr.io/hotspotmatrix-frontend:latest \
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
  --name hotspotmatrix-plan \
  --resource-group $RESOURCE_GROUP \
  --sku B1 --is-linux

# Create Web App
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan hotspotmatrix-plan \
  --name hotspotmatrix-backend \
  --deployment-container-image-name $ACR_NAME.azurecr.io/hotspotmatrix-backend:latest

# Enable WebSockets
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name hotspotmatrix-backend \
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
aws ecr create-repository --repository-name hotspotmatrix-backend --region $AWS_REGION
aws ecr create-repository --repository-name hotspotmatrix-frontend --region $AWS_REGION

# Login and push
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

docker tag hotspotmatrix-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hotspotmatrix-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hotspotmatrix-backend:latest
```

#### 2. Create RDS PostgreSQL

```bash
aws rds create-db-instance \
  --db-instance-identifier hotspotmatrix-db \
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
aws ecs create-cluster --cluster-name hotspotmatrix-cluster

# Create task definition (see full JSON in docs)
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service with Fargate
aws ecs create-service \
  --cluster hotspotmatrix-cluster \
  --service-name hotspotmatrix-backend \
  --task-definition hotspotmatrix-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Option 2: AWS Elastic Beanstalk

```bash
pip install awsebcli

cd server
eb init -p python-3.11 hotspotmatrix-backend --region us-east-1
eb create hotspotmatrix-backend-env
eb setenv DATABASE_URL="postgresql://..." REDIS_URL="redis://..."
eb deploy
```

### Option 3: AWS App Runner

```bash
aws apprunner create-service \
  --service-name hotspotmatrix-backend \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "'$AWS_ACCOUNT_ID'.dkr.ecr.'$AWS_REGION'.amazonaws.com/hotspotmatrix-backend:latest",
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
gcloud sql instances create hotspotmatrix-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --root-password=YourSecurePassword123!

gcloud sql databases create hotspotmatrix --instance=hotspotmatrix-db
```

#### 3. Create Memorystore Redis

```bash
gcloud redis instances create hotspotmatrix-redis \
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
gcloud builds submit --tag gcr.io/$PROJECT_ID/hotspotmatrix-backend:latest

# Deploy to Cloud Run
gcloud run deploy hotspotmatrix-backend \
  --image gcr.io/$PROJECT_ID/hotspotmatrix-backend:latest \
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
gcloud container clusters create hotspotmatrix-cluster \
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
name: hotspotmatrix
region: nyc
services:
  - name: backend
    github:
      repo: your-org/hotspotmatrix
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
doctl compute droplet create hotspotmatrix \
  --image docker-20-04 \
  --size s-2vcpu-4gb \
  --region nyc1 \
  --ssh-keys your-ssh-key-id

# SSH and deploy
ssh root@your-droplet-ip
git clone https://github.com/your-org/hotspotmatrix.git
cd hotspotmatrix
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔐 Security Best Practices

### Secrets Management

| Platform | Service | Configuration |
|----------|---------|---------------|
| Azure | Key Vault | `az keyvault secret set --vault-name mykeyvault --name SECRET_KEY --value "..."` |
| AWS | Secrets Manager | `aws secretsmanager create-secret --name hotspotmatrix/secrets --secret-string '{"SECRET_KEY":"..."}'` |
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
          docker build -t ${{ secrets.REGISTRY }}/hotspotmatrix-backend:${{ github.sha }} ./server
          docker push ${{ secrets.REGISTRY }}/hotspotmatrix-backend:${{ github.sha }}
          
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy hotspotmatrix-backend \
            --image ${{ secrets.REGISTRY }}/hotspotmatrix-backend:${{ github.sha }} \
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
