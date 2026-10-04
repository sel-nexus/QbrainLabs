# start_https.ps1
$env:USE_HTTPS = "true"

Write-Host "Cleaning up ports 8000 and 5173..."
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object { 
    Write-Host "Killing process $($_.OwningProcess) on port 8000"
    Stop-Process -Id $_.OwningProcess -Force 
}
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | ForEach-Object { 
    Write-Host "Killing process $($_.OwningProcess) on port 5173"
    Stop-Process -Id $_.OwningProcess -Force 
}

Write-Host "Starting Backend..."
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-Command", "cd server; `$env:USE_HTTPS='true'; .venv\Scripts\python.exe -m app.run > ../server_https.log 2>&1" -WindowStyle Hidden

Write-Host "Waiting for backend to start..."
Start-Sleep -Seconds 5

Write-Host "Starting Frontend..."
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-Command", "cd client; `$env:USE_HTTPS='true'; npm run dev > ../client_https.log 2>&1" -WindowStyle Hidden

Write-Host "Services started. Use 'Get-Content server_https.log -Wait' or 'Get-Content client_https.log -Wait' to monitor."
