@echo off
setlocal enabledelayedexpansion
REM Windows Batch script for AI Hotspot Matrix Developer Environment Setup

REM Load configuration from .env file
REM Note: Simple parsing - handles basic KEY=VALUE format
if exist ".env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do (
        if not "%%a"=="" (
            set "%%a=%%b"
        )
    )
)

REM Configuration with defaults (if not set in .env)
if not defined SERVER_PORT set SERVER_PORT=8000
if not defined CLIENT_PORT set CLIENT_PORT=5173
if not defined SERVER_HOST set SERVER_HOST=0.0.0.0
if not defined CLIENT_HOST set CLIENT_HOST=0.0.0.0

set BACKEND_PORT=%SERVER_PORT%
set FRONTEND_PORT=%CLIENT_PORT%
set BACKEND_HOST=%SERVER_HOST%
set FRONTEND_HOST=%CLIENT_HOST%
set REDIS_PORT=6379

echo ================================================
echo 🚀 AI Hotspot Matrix: Developer Environment Setup
echo ================================================

REM 1. Environment Verification
echo.
echo 🔍 Verifying environment...

if not exist ".env" (
    if exist ".env.example" (
        echo ⚠️  .env not found. Copying from .env.example...
        copy ".env.example" ".env" >nul
    ) else (
        echo ❌ .env.example not found. Please create a .env file.
    )
)

REM 2. Port Cleanup
echo 🧹 Cleaning up occupied ports...

REM Function to kill process on a port
call :kill_port %BACKEND_PORT%
call :kill_port %FRONTEND_PORT%

REM 3. Redis Check (basic check)
echo 📡 Checking for Redis...
netstat -an | findstr ":%REDIS_PORT%" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Redis port is in use (may be connected).
) else (
    echo ⚠️  Redis is not running on port %REDIS_PORT%. Real-time features may be limited.
)

REM 4. Backend Setup
echo.
echo 🐍 Setting up Backend (FastAPI)...
cd server

REM Virtual environment
if not exist ".venv" (
    echo 📦 Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo ❌ Failed to create virtual environment. Trying python3...
        python3 -m venv .venv
    )
)

REM Activate virtual environment
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo ❌ Failed to activate virtual environment!
    cd ..
    pause
    exit /b 1
)

REM Install/Update dependencies
echo 📦 Installing/Updating dependencies...
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt

REM Ensure critical monitoring deps are present
python -m pip install --quiet structlog python-json-logger prometheus-client "psycopg[binary]" python-dotenv 2>nul

REM Database Initialization
echo.
echo 🗄️  Database Setup & Migration...
echo    Checking database connection and schema...
python init_db.py
if errorlevel 1 (
    echo ❌ Database initialization failed!
    echo    Please check:
    echo    1. PostgreSQL is running
    echo    2. DATABASE_URL in .env is correct
    echo    3. Database 'hotspotmatrix' exists
    echo    Continuing anyway - app will retry on startup...
) else (
    echo ✅ Database initialized successfully
)

REM Start Backend
echo ✅ Backend starting on %BACKEND_HOST%:%BACKEND_PORT%...
start "Backend Server" /min cmd /c "python -m uvicorn app.main:app --reload --host %BACKEND_HOST% --port %BACKEND_PORT% > ..\server.log 2>&1"

cd ..

REM 5. Frontend Setup
echo.
echo ⚛️  Setting up Frontend (Vite)...
cd client

if not exist "node_modules" (
    echo 📦 node_modules not found. Installing...
    call npm install --quiet
)

REM Start Frontend
echo ✅ Frontend starting on %FRONTEND_HOST%:%FRONTEND_PORT%...
start "Frontend Server" /min cmd /c "set CLIENT_HOST=%FRONTEND_HOST% && set CLIENT_PORT=%FRONTEND_PORT% && npm run dev > ..\client.log 2>&1"

cd ..

REM 6. Final Status
echo.
echo ================================================
echo ✨ Environment is ready!

REM Get local IP address for network access
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set LOCAL_IP=%%a
    set LOCAL_IP=!LOCAL_IP: =!
    goto :ip_found
)
:ip_found

REM Display backend URLs
if "%BACKEND_HOST%"=="0.0.0.0" (
    echo Backend:  http://localhost:%BACKEND_PORT%/docs
    if defined LOCAL_IP (
        echo          http://%LOCAL_IP%:%BACKEND_PORT%/docs (network)
    )
) else (
    echo Backend:  http://%BACKEND_HOST%:%BACKEND_PORT%/docs
)

REM Display frontend URLs
if "%FRONTEND_HOST%"=="0.0.0.0" (
    echo Frontend: http://localhost:%FRONTEND_PORT%
    if defined LOCAL_IP (
        echo          http://%LOCAL_IP%:%FRONTEND_PORT% (network)
    )
) else (
    echo Frontend: http://%FRONTEND_HOST%:%FRONTEND_PORT%
)

echo ================================================
echo 📝 Logs are being written to server.log and client.log
echo    Press Ctrl+C to stop all services.
echo ================================================
echo.

REM Create log files if they don't exist
if not exist "server.log" type nul > server.log
if not exist "client.log" type nul > client.log

REM Display logs using PowerShell Get-Content -Wait (if available)
where powershell >nul 2>&1
if %errorlevel% equ 0 (
    echo Streaming logs from both services...
    echo.
    powershell -Command "Get-Content server.log, client.log -Wait -Tail 20"
) else (
    echo PowerShell not found. Logs are being written to server.log and client.log
    echo You can view them with: type server.log or type client.log
    echo.
    echo Press any key to exit...
    pause >nul
)

goto :eof

REM Function to kill process on a port
:kill_port
setlocal enabledelayedexpansion
set port=%1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%port% "') do (
    set pid=%%a
    if not "!pid!"=="" (
        echo    Stopping process on port %port% (PID: !pid!)...
        taskkill /F /PID !pid! >nul 2>&1
    )
)
endlocal
goto :eof
