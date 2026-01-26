#!/bin/bash

# Load configuration from .env file
if [ -f ".env" ]; then
    # Source .env file and export variables
    set -a
    source .env
    set +a
fi

# Configuration with defaults (if not set in .env)
BACKEND_PORT=${SERVER_PORT:-8000}
FRONTEND_PORT=${CLIENT_PORT:-5173}
BACKEND_HOST=${SERVER_HOST:-0.0.0.0}
FRONTEND_HOST=${CLIENT_HOST:-0.0.0.0}
REDIS_PORT=6379

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${BLUE}${BOLD}================================================${NC}"
echo -e "${BLUE}${BOLD}🚀 AI Hotspot Matrix: Developer Environment Setup${NC}"
echo -e "${BLUE}${BOLD}================================================${NC}"

# Function to handle script exit and kill child processes
cleanup() {
    echo -e "\n${RED}🛑 Stopping all services...${NC}"
    
    # Kill tail process
    if [ -n "$TAIL_PID" ]; then
        kill $TAIL_PID 2>/dev/null
    fi
    
    # Kill the specific background jobs started by this script
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    exit
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# 1. Environment Verification
echo -e "\n${BLUE}🔍 Verifying environment...${NC}"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}⚠️  .env not found. Copying from .env.example...${NC}"
        cp .env.example .env
    else
        echo -e "${RED}❌ .env.example not found. Please create a .env file.${NC}"
    fi
fi

# 2. Port Cleanup
echo -e "${BLUE}🧹 Cleaning up occupied ports...${NC}"

kill_port() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pids" ]; then
        for pid in $pids; do
            echo -e "   Stopping process on port $port (PID: $pid)..."
            kill -9 $pid 2>/dev/null || true
        done
    fi
}

kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

# 3. Redis Check
echo -e "${BLUE}📡 Checking for Redis...${NC}"
if command -v redis-cli >/dev/null 2>&1; then
    if ! redis-cli -p $REDIS_PORT ping >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Redis is not running on port $REDIS_PORT. Real-time features may be limited.${NC}"
        # Trying to start redis-server if it's available locally
        # redis-server --daemonize yes 2>/dev/null && echo -e "${GREEN}✅ Redis started locally.${NC}"
    else
        echo -e "${GREEN}✅ Redis is connected.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  redis-cli not found. Ensure Redis is accessible for production features.${NC}"
fi

# 4. Backend Setup
echo -e "\n${BLUE}🐍 Setting up Backend (FastAPI)...${NC}"
cd server

# Virtual environment
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}📦 Creating virtual environment...${NC}"
    python3 -m venv .venv
fi
source .venv/bin/activate

# Install/Update dependencies
echo -e "📦 Installing/Updating dependencies..."
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

# Ensure critical monitoring deps are present (safety net)
python -m pip install --quiet structlog python-json-logger prometheus-client "psycopg[binary]" python-dotenv 2>/dev/null

# Database Initialization, Table Creation & Migration
echo -e "\n${BLUE}🗄️  Database Setup & Migration...${NC}"

# Check if PostgreSQL is accessible
check_postgres() {
    if command -v psql >/dev/null 2>&1; then
        # Try to connect using DATABASE_URL from .env
        if [ -f "../.env" ]; then
            DB_URL=$(grep -E "^DATABASE_URL=" ../.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
        elif [ -f ".env" ]; then
            DB_URL=$(grep -E "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
        fi
        
        if [ -n "$DB_URL" ]; then
            # Extract connection info for display (hide password)
            DB_HOST=$(echo "$DB_URL" | sed -n 's/.*@\([^:\/]*\).*/\1/p')
            DB_NAME=$(echo "$DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
            echo -e "   Database: ${BOLD}$DB_NAME${NC} @ ${BOLD}$DB_HOST${NC}"
        fi
    fi
}

check_postgres

# Run database initialization (creates tables if not exist, runs migrations)
echo -e "${BLUE}   Checking database connection and schema...${NC}"
if python init_db.py; then
    echo -e "${GREEN}✅ Database initialized successfully${NC}"
else
    echo -e "${RED}❌ Database initialization failed!${NC}"
    echo -e "${YELLOW}   Please check:${NC}"
    echo -e "${YELLOW}   1. PostgreSQL is running${NC}"
    echo -e "${YELLOW}   2. DATABASE_URL in .env is correct${NC}"
    echo -e "${YELLOW}   3. Database 'hotspotmatrix' exists${NC}"
    echo -e "${YELLOW}   Continuing anyway - app will retry on startup...${NC}"
fi

# Start Backend
echo -e "${GREEN}✅ Backend starting on $BACKEND_HOST:$BACKEND_PORT...${NC}"
uvicorn app.main:app --reload --host $BACKEND_HOST --port $BACKEND_PORT > ../server.log 2>&1 &
BACKEND_PID=$!

cd ..

# 5. Frontend Setup
echo -e "\n${BLUE}⚛️  Setting up Frontend (Vite)...${NC}"
cd client

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 node_modules not found. Installing...${NC}"
    npm install --quiet
fi

# Start Frontend
echo -e "${GREEN}✅ Frontend starting on $FRONTEND_HOST:$FRONTEND_PORT...${NC}"
# Pass host configuration via environment variable
CLIENT_HOST=$FRONTEND_HOST CLIENT_PORT=$FRONTEND_PORT npm run dev > ../client.log 2>&1 &
FRONTEND_PID=$!

cd ..

# 6. Final Status
echo -e "\n${BLUE}${BOLD}================================================${NC}"
echo -e "${GREEN}${BOLD}✨ Environment is ready!${NC}"

# Get local IP addresses for network access display
get_local_ip() {
    # Try to get local IP (works on macOS and Linux)
    if command -v ip >/dev/null 2>&1; then
        # Linux
        ip route get 8.8.8.8 2>/dev/null | awk '{print $7; exit}' 2>/dev/null
    elif command -v ifconfig >/dev/null 2>&1; then
        # macOS/BSD
        ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1
    fi
}

LOCAL_IP=$(get_local_ip)

# Display backend URLs
if [ "$BACKEND_HOST" = "0.0.0.0" ]; then
    echo -e "${BLUE}Backend:  ${BOLD}http://localhost:$BACKEND_PORT/docs${NC}"
    if [ -n "$LOCAL_IP" ]; then
        echo -e "${BLUE}          ${BOLD}http://$LOCAL_IP:$BACKEND_PORT/docs${NC} (network)"
    fi
else
    echo -e "${BLUE}Backend:  ${BOLD}http://$BACKEND_HOST:$BACKEND_PORT/docs${NC}"
fi

# Display frontend URLs
if [ "$FRONTEND_HOST" = "0.0.0.0" ]; then
    echo -e "${BLUE}Frontend: ${BOLD}http://localhost:$FRONTEND_PORT${NC}"
    if [ -n "$LOCAL_IP" ]; then
        echo -e "${BLUE}          ${BOLD}http://$LOCAL_IP:$FRONTEND_PORT${NC} (network)"
    fi
else
    echo -e "${BLUE}Frontend: ${BOLD}http://$FRONTEND_HOST:$FRONTEND_PORT${NC}"
fi

echo -e "${BLUE}${BOLD}================================================${NC}"
echo -e "${YELLOW}📝 Streaming logs from both services below...${NC}"
echo -e "${YELLOW}   Press Ctrl+C to stop all services.${NC}"
echo -e "${BLUE}${BOLD}================================================${NC}\n"

# Create log files if they don't exist
touch server.log client.log

# Tail the logs in a combined view
tail -f server.log client.log &
TAIL_PID=$!

wait
