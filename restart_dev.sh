#!/bin/bash

# Function to handle script exit and kill child processes
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
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

echo "================================================"
echo "🚀 Hotspot Matrix: Restarting Dev Environment"
echo "================================================"

# 1. Kill existing processes on ports 8000 and 5173
echo "🧹 Cleaning up occupied ports..."
lsof -ti :8000 | xargs kill -9 2>/dev/null
lsof -ti :5173 | xargs kill -9 2>/dev/null

# 2. Start Backend
echo "🐍 Starting Backend (FastAPI)..."
cd server

# Verify venv exists
if [ ! -d ".venv" ]; then
    echo "⚠️  Virtual environment not found. Creating..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
else
    source .venv/bin/activate
fi

# Ensure critical dependencies are installed (for Supabase/PostgreSQL support)
echo "📦 Checking dependencies..."
python -m pip install --quiet structlog python-json-logger prometheus-client "psycopg[binary]" python-dotenv 2>/dev/null

# Initialize database tables if needed
echo "🗄️  Initializing database..."
python init_db.py 2>/dev/null || echo "⚠️  Database init skipped (may already exist)"

# Start Uvicorn in the background
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait briefly for backend
sleep 2

# 3. Start Frontend
echo "⚛️  Starting Frontend (Vite)..."
cd client

# Verify node_modules
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Installing..."
    npm install
fi

npm run dev &
FRONTEND_PID=$!
cd ..

echo "================================================"
echo "✅ Services are up and running!"
echo "   Backend:  http://localhost:8000/docs"
echo "   Frontend: http://localhost:5173"
echo ""
echo "📝 Logs from both services will appear below."
echo "   Press Ctrl+C to stop."
echo "================================================"

# Wait for both processes to keep script running
wait
