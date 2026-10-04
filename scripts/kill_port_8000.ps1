$port = 8000
$tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($tcp) {
    foreach ($conn in $tcp) {
        $procId = $conn.OwningProcess
        if ($procId -ne 0) {
            Write-Host "Killing PID $procId on port $port"
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
    }
} else {
    Write-Host "No process on port $port"
}
