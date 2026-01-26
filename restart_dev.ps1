# PowerShell script for Windows
# AI Hotspot Matrix: Developer Environment Setup

# Load configuration from .env file
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*?)\s*=\s*(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove quotes if present
            $value = $value -replace '^["'']|["'']$', ''
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Configuration with defaults (if not set in .env)
$BACKEND_PORT = if ($env:SERVER_PORT) { [int]$env:SERVER_PORT } else { 8000 }
$FRONTEND_PORT = if ($env:CLIENT_PORT) { [int]$env:CLIENT_PORT } else { 5173 }
$BACKEND_HOST = if ($env:SERVER_HOST) { $env:SERVER_HOST } else { "0.0.0.0" }
$FRONTEND_HOST = if ($env:CLIENT_HOST) { $env:CLIENT_HOST } else { "0.0.0.0" }
$REDIS_PORT = 6379

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🚀 AI Hotspot Matrix: Developer Environment Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Function to handle script exit and kill child processes
$script:BackendProcess = $null
$script:FrontendProcess = $null
$script:LogWatcher = $null

function Cleanup {
    Write-Host "`n🛑 Stopping all services..." -ForegroundColor Red
    
    if ($script:LogWatcher) {
        $script:LogWatcher.Dispose()
    }
    
    if ($script:BackendProcess -and !$script:BackendProcess.HasExited) {
        Stop-Process -Id $script:BackendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    if ($script:FrontendProcess -and !$script:FrontendProcess.HasExited) {
        Stop-Process -Id $script:FrontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    exit
}

# Register cleanup on exit
Register-EngineEvent PowerShell.Exiting -Action { Cleanup } | Out-Null
$null = Register-ObjectEvent -InputObject ([System.Console]) -EventName CancelKeyPress -Action { Cleanup }

# 1. Environment Verification
Write-Host "`n🔍 Verifying environment..." -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Host "⚠️  .env not found. Copying from .env.example..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
    } else {
        Write-Host "❌ .env.example not found. Please create a .env file." -ForegroundColor Red
    }
}

# 2. Port Cleanup
Write-Host "🧹 Cleaning up occupied ports..." -ForegroundColor Cyan

function Kill-Port {
    param([int]$Port)
    
    $pidsToKill = @()
    
    # Try modern PowerShell method first
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        foreach ($conn in $connections) {
            if ($conn.OwningProcess -and $conn.OwningProcess -notin $pidsToKill) {
                $pidsToKill += $conn.OwningProcess
            }
        }
    } catch {
        # Fallback to netstat if Get-NetTCPConnection fails
    }
    
    # Fallback method using netstat (for older PowerShell versions or if above fails)
    if ($pidsToKill.Count -eq 0) {
        $netstatOutput = netstat -ano | Select-String ":$Port "
        foreach ($line in $netstatOutput) {
            $parts = $line -split '\s+'
            if ($parts.Count -gt 0) {
                $pid = $parts[-1]
                if ($pid -match '^\d+$' -and [int]$pid -notin $pidsToKill) {
                    $pidsToKill += [int]$pid
                }
            }
        }
    }
    
    # Kill all processes found
    foreach ($pid in $pidsToKill) {
        Write-Host "   Stopping process on port $Port (PID: $pid)..."
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}

Kill-Port -Port $BACKEND_PORT
Start-Sleep -Milliseconds 500
Kill-Port -Port $FRONTEND_PORT
Start-Sleep -Milliseconds 500

# 3. Redis Check
Write-Host "📡 Checking for Redis..." -ForegroundColor Cyan
try {
    $redisTest = Test-NetConnection -ComputerName localhost -Port $REDIS_PORT -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($redisTest.TcpTestSucceeded) {
        Write-Host "✅ Redis is connected." -ForegroundColor Green
    } else {
        Write-Host "⚠️  Redis is not running on port $REDIS_PORT. Real-time features may be limited." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not check Redis connection. Ensure Redis is accessible for production features." -ForegroundColor Yellow
}

# 4. Backend Setup
Write-Host "`n🐍 Setting up Backend (FastAPI)..." -ForegroundColor Cyan
Push-Location server

# Virtual environment
if (-not (Test-Path ".venv")) {
    Write-Host "📦 Creating virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create virtual environment. Trying python3..." -ForegroundColor Red
        python3 -m venv .venv
    }
}

# Activate virtual environment
$activateScript = Join-Path $PWD ".venv\Scripts\Activate.ps1"
if (Test-Path $activateScript) {
    & $activateScript
} else {
    Write-Host "❌ Virtual environment activation script not found!" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Install/Update dependencies
Write-Host "📦 Installing/Updating dependencies..."
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt

# Ensure critical monitoring deps are present (safety net)
python -m pip install --quiet structlog python-json-logger prometheus-client "psycopg[binary]" python-dotenv 2>$null

# Database Initialization, Table Creation & Migration
Write-Host "`n🗄️  Database Setup & Migration..." -ForegroundColor Cyan

# Check if PostgreSQL is accessible
function Check-Postgres {
    $envFile = if (Test-Path "..\.env") { "..\.env" } elseif (Test-Path ".env") { ".env" } else { $null }
    
    if ($envFile) {
        $dbUrl = (Get-Content $envFile | Select-String "^DATABASE_URL=").ToString() -replace "^DATABASE_URL=", "" -replace '"', "" -replace "'", ""
        
        if ($dbUrl) {
            # Extract connection info for display (hide password)
            if ($dbUrl -match '@([^:/]+)') {
                $dbHost = $matches[1]
            }
            if ($dbUrl -match '/([^?]+)') {
                $dbName = $matches[1]
            }
            Write-Host "   Database: $dbName @ $dbHost"
        }
    }
}

Check-Postgres

# Run database initialization
Write-Host "   Checking database connection and schema..." -ForegroundColor Cyan
$initResult = python init_db.py
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database initialized successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Database initialization failed!" -ForegroundColor Red
    Write-Host "   Please check:" -ForegroundColor Yellow
    Write-Host "   1. PostgreSQL is running" -ForegroundColor Yellow
    Write-Host "   2. DATABASE_URL in .env is correct" -ForegroundColor Yellow
    Write-Host "   3. Database 'hotspotmatrix' exists" -ForegroundColor Yellow
    Write-Host "   Continuing anyway - app will retry on startup..." -ForegroundColor Yellow
}

# Start Backend
Write-Host "✅ Backend starting on $BACKEND_HOST:$BACKEND_PORT..." -ForegroundColor Green
$backendDir = Get-Location
$backendLog = Join-Path $backendDir.Parent.FullName "server.log"
$venvActivate = Join-Path $backendDir ".venv\Scripts\activate.bat"
$backendCmd = "call `"$venvActivate`" && python -m uvicorn app.main:app --reload --host $BACKEND_HOST --port $BACKEND_PORT"
$script:BackendProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "$backendCmd >> `"$backendLog`" 2>&1" `
    -WorkingDirectory $backendDir `
    -NoNewWindow `
    -PassThru `
    -WindowStyle Hidden

Pop-Location

# 5. Frontend Setup
Write-Host "`n⚛️  Setting up Frontend (Vite)..." -ForegroundColor Cyan
Push-Location client

if (-not (Test-Path "node_modules")) {
    Write-Host "📦 node_modules not found. Installing..." -ForegroundColor Yellow
    npm install --quiet
}

# Start Frontend
Write-Host "✅ Frontend starting on $FRONTEND_HOST:$FRONTEND_PORT..." -ForegroundColor Green
$frontendDir = Get-Location
$frontendLog = Join-Path $frontendDir.Parent.FullName "client.log"
$frontendCmd = "set CLIENT_HOST=$FRONTEND_HOST && set CLIENT_PORT=$FRONTEND_PORT && npm run dev"
$script:FrontendProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "$frontendCmd >> `"$frontendLog`" 2>&1" `
    -WorkingDirectory $frontendDir `
    -NoNewWindow `
    -PassThru `
    -WindowStyle Hidden

Pop-Location

# 6. Final Status
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "✨ Environment is ready!" -ForegroundColor Green

# Get local IP address for network access display
function Get-LocalIP {
    $adapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" }
    if ($adapters) {
        return ($adapters | Select-Object -First 1).IPAddress
    }
    return $null
}

$LOCAL_IP = Get-LocalIP

# Display backend URLs
if ($BACKEND_HOST -eq "0.0.0.0") {
    Write-Host "Backend:  http://localhost:$BACKEND_PORT/docs" -ForegroundColor Cyan
    if ($LOCAL_IP) {
        Write-Host "          http://$LOCAL_IP`:$BACKEND_PORT/docs (network)" -ForegroundColor Cyan
    }
} else {
    Write-Host "Backend:  http://$BACKEND_HOST`:$BACKEND_PORT/docs" -ForegroundColor Cyan
}

# Display frontend URLs
if ($FRONTEND_HOST -eq "0.0.0.0") {
    Write-Host "Frontend: http://localhost:$FRONTEND_PORT" -ForegroundColor Cyan
    if ($LOCAL_IP) {
        Write-Host "          http://$LOCAL_IP`:$FRONTEND_PORT (network)" -ForegroundColor Cyan
    }
} else {
    Write-Host "Frontend: http://$FRONTEND_HOST`:$FRONTEND_PORT" -ForegroundColor Cyan
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📝 Streaming logs from both services below..." -ForegroundColor Yellow
Write-Host "   Press Ctrl+C to stop all services." -ForegroundColor Yellow
Write-Host "================================================`n" -ForegroundColor Cyan

# Create log files if they don't exist
$serverLog = Join-Path $PSScriptRoot "server.log"
$clientLog = Join-Path $PSScriptRoot "client.log"
if (-not (Test-Path $serverLog)) { New-Item -ItemType File -Path $serverLog | Out-Null }
if (-not (Test-Path $clientLog)) { New-Item -ItemType File -Path $clientLog | Out-Null }

# Tail the logs in a combined view
$serverLog = Join-Path $PSScriptRoot "server.log"
$clientLog = Join-Path $PSScriptRoot "client.log"

# Display initial log content
Write-Host "`n[Initial logs]`n" -ForegroundColor Gray
Get-Content $serverLog -Tail 10 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "[BACKEND] $_" -ForegroundColor Cyan }
Get-Content $clientLog -Tail 10 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "[FRONTEND] $_" -ForegroundColor Magenta }

# Start background jobs to watch both log files
$serverLogJob = Start-Job -ScriptBlock {
    param($logPath)
    Get-Content $logPath -Wait -Tail 0 -ErrorAction SilentlyContinue
} -ArgumentList $serverLog

$clientLogJob = Start-Job -ScriptBlock {
    param($logPath)
    Get-Content $logPath -Wait -Tail 0 -ErrorAction SilentlyContinue
} -ArgumentList $clientLog

# Monitor both jobs and display output
try {
    while ($true) {
        $serverOutput = Receive-Job $serverLogJob -ErrorAction SilentlyContinue
        $clientOutput = Receive-Job $clientLogJob -ErrorAction SilentlyContinue
        
        if ($serverOutput) {
            foreach ($line in $serverOutput) {
                Write-Host "[BACKEND] $line" -ForegroundColor Cyan
            }
        }
        
        if ($clientOutput) {
            foreach ($line in $clientOutput) {
                Write-Host "[FRONTEND] $line" -ForegroundColor Magenta
            }
        }
        
        Start-Sleep -Milliseconds 200
    }
} catch {
    Write-Host "`nError watching logs: $_" -ForegroundColor Red
    Write-Host "Services are running. Check server.log and client.log files manually." -ForegroundColor Yellow
} finally {
    if ($serverLogJob) { Stop-Job $serverLogJob -ErrorAction SilentlyContinue; Remove-Job $serverLogJob -ErrorAction SilentlyContinue }
    if ($clientLogJob) { Stop-Job $clientLogJob -ErrorAction SilentlyContinue; Remove-Job $clientLogJob -ErrorAction SilentlyContinue }
}
