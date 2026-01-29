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

REM Detect Python command (py, python, or python3)
set PYTHON_CMD=
where py >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
) else (
    where python >nul 2>&1
    if %errorlevel% equ 0 (
        set PYTHON_CMD=python
    ) else (
        where python3 >nul 2>&1
        if %errorlevel% equ 0 (
            set PYTHON_CMD=python3
        ) else (
            echo [ERROR] Python not found! Please install Python 3.11+
            pause
            exit /b 1
        )
    )
)

REM Detect Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found! Please install Node.js 18+
    pause
    exit /b 1
)

echo ================================================
echo AI Hotspot Matrix: Developer Environment Setup
echo ================================================

REM 1. Environment Verification
echo.
echo [1/6] Verifying environment...

if not exist ".env" (
    if exist ".env.example" (
        echo [WARNING] .env not found. Copying from .env.example...
        copy ".env.example" ".env" >nul
    ) else (
        echo [ERROR] .env.example not found. Please create a .env file.
    )
)

REM 2. Port Cleanup
echo [2/6] Cleaning up occupied ports...

REM Kill processes on backend port using PowerShell
powershell -Command "$connections = Get-NetTCPConnection -LocalPort %BACKEND_PORT% -ErrorAction SilentlyContinue; foreach ($conn in $connections) { if ($conn.OwningProcess) { Write-Host '    Stopping process on port %BACKEND_PORT% - PID' $conn.OwningProcess; Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue } }" 2>nul

REM Kill processes on frontend port using PowerShell
powershell -Command "$connections = Get-NetTCPConnection -LocalPort %FRONTEND_PORT% -ErrorAction SilentlyContinue; foreach ($conn in $connections) { if ($conn.OwningProcess) { Write-Host '    Stopping process on port %FRONTEND_PORT% - PID' $conn.OwningProcess; Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue } }" 2>nul

REM 3. Redis Check (basic check)
echo [3/6] Checking for Redis...
netstat -an | findstr ":%REDIS_PORT%" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Redis port is in use (may be connected).
) else (
    echo [WARNING] Redis is not running on port %REDIS_PORT%. Real-time features may be limited.
)

REM 4. Backend Setup
echo.
echo [4/6] Setting up Backend (FastAPI)...
cd server

REM Virtual environment
if not exist ".venv" (
    echo Creating virtual environment...
    %PYTHON_CMD% -m venv .venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment!
        cd ..
        pause
        exit /b 1
    )
)

REM Detect virtual environment activation script (Windows Scripts or Linux/WSL bin)
set VENV_PYTHON=
set VENV_ACTIVATE=

if exist ".venv\Scripts\activate.bat" (
    REM Windows-native virtual environment
    set VENV_ACTIVATE=.venv\Scripts\activate.bat
    set VENV_PYTHON=.venv\Scripts\python.exe
) else if exist ".venv\bin\python" (
    REM Cross-platform/WSL/Linux-style virtual environment detected
    echo [WARNING] Linux/WSL-style virtual environment detected (.venv\bin\python)
    echo    This venv was created on Linux/WSL/macOS and may not work directly on Windows CMD.
    echo    Consider recreating it with: %PYTHON_CMD% -m venv .venv
    echo    Continuing with attempt to use it...
    set VENV_ACTIVATE=.venv\bin\activate
    set VENV_PYTHON=.venv\bin\python
) else (
    echo [ERROR] Virtual environment not found or incomplete!
    echo    Expected .venv\Scripts\activate.bat (Windows) or .venv\bin\python (WSL/Linux)
    cd ..
    pause
    exit /b 1
)

REM Activate virtual environment (if Windows Scripts)
if exist ".venv\Scripts\activate.bat" (
    call %VENV_ACTIVATE%
    if errorlevel 1 (
        echo [ERROR] Failed to activate virtual environment!
        cd ..
        pause
        exit /b 1
    )
)

REM Install/Update dependencies
echo Installing/Updating dependencies...
%VENV_PYTHON% -m pip install --quiet --upgrade pip
if errorlevel 1 (
    echo [WARNING] pip upgrade failed, continuing anyway...
)
%VENV_PYTHON% -m pip install --quiet -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies!
    cd ..
    pause
    exit /b 1
)

REM Ensure critical monitoring deps are present
%VENV_PYTHON% -m pip install --quiet structlog python-json-logger prometheus-client "psycopg[binary]" python-dotenv 2>nul

REM Database Initialization
echo.
echo Database Setup & Migration...
echo    Checking database connection and schema...
%VENV_PYTHON% init_db.py
if errorlevel 1 (
    echo [ERROR] Database initialization failed!
    echo    Please check:
    echo    1. PostgreSQL is running
    echo    2. DATABASE_URL in .env is correct
    echo    3. Database exists and is accessible
    echo    Continuing anyway - app will retry on startup...
) else (
    echo [OK] Database initialized successfully
)

REM Start Backend
echo [OK] Backend starting on %BACKEND_HOST%:%BACKEND_PORT%...
REM Use the venv Python executable directly for better compatibility
if exist ".venv\Scripts\python.exe" (
    REM Windows-native venv
    start "Backend Server" /min cmd /c "cd /d %CD% && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --host %BACKEND_HOST% --port %BACKEND_PORT% > ..\server.log 2>&1"
) else if exist ".venv\bin\python" (
    REM Cross-platform/WSL venv detected - bin\python won't work in Windows CMD
    echo    [WARNING] Linux/WSL-style venv detected. Using system Python.
    echo       For best results, recreate venv: %PYTHON_CMD% -m venv .venv
    REM Try to use system Python (packages should be installed globally or in venv)
    start "Backend Server" /min cmd /c "cd /d %CD% && %PYTHON_CMD% -m uvicorn app.main:app --reload --host %BACKEND_HOST% --port %BACKEND_PORT% > ..\server.log 2>&1"
) else (
    REM Fallback to system Python
    start "Backend Server" /min cmd /c "cd /d %CD% && %PYTHON_CMD% -m uvicorn app.main:app --reload --host %BACKEND_HOST% --port %BACKEND_PORT% > ..\server.log 2>&1"
)

cd ..

REM 5. Frontend Setup
echo.
echo [5/6] Setting up Frontend (Vite)...
cd client

if not exist "node_modules" (
    echo node_modules not found. Installing...
    call npm install --quiet
    if errorlevel 1 (
        echo [ERROR] Failed to install npm dependencies!
        cd ..
        pause
        exit /b 1
    )
)

REM Start Frontend
echo [OK] Frontend starting on %FRONTEND_HOST%:%FRONTEND_PORT%...
start "Frontend Server" /min cmd /c "cd /d %CD% && set CLIENT_HOST=%FRONTEND_HOST% && set CLIENT_PORT=%FRONTEND_PORT% && npm run dev > ..\client.log 2>&1"

cd ..

REM 6. Final Status
echo.
echo ================================================
echo [OK] Environment is ready!

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
echo Logs are being written to server.log and client.log
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

