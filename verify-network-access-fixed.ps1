# Verify Network Access - Frontend on 8080, Backend on 3001
Write-Host "Network Access Verification" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

$ip = "192.168.32.1"

Write-Host "`nNew Configuration:" -ForegroundColor Yellow
Write-Host "Frontend: Port 8080 (Changed to bypass firewall)" -ForegroundColor Green
Write-Host "Backend:  Port 3001 (Unchanged)" -ForegroundColor Green
Write-Host "IP:       $ip" -ForegroundColor Green

Write-Host "`nPort Status Check:" -ForegroundColor Yellow
$port3001 = netstat -an | findstr ":3001"
$port8080 = netstat -an | findstr ":8080"

if ($port3001) {
    Write-Host "Port 3001 (Backend) is active:" -ForegroundColor Green
    Write-Host "   $port3001" -ForegroundColor White
} else {
    Write-Host "Port 3001 (Backend) not listening" -ForegroundColor Red
    Write-Host "   Start with: cd server; npm run dev" -ForegroundColor Yellow
}

if ($port8080) {
    Write-Host "Port 8080 (Frontend) is active:" -ForegroundColor Green
    Write-Host "   $port8080" -ForegroundColor White
} else {
    Write-Host "Port 8080 (Frontend) not listening" -ForegroundColor Red
    Write-Host "   Start with: npm run dev" -ForegroundColor Yellow
}

Write-Host "`nNetwork Access URLs:" -ForegroundColor Cyan
Write-Host "Frontend:     http://$ip:8080" -ForegroundColor Green
Write-Host "Backend API:  http://$ip:3001/api" -ForegroundColor Green
Write-Host "Health Check: http://$ip:3001/api/health" -ForegroundColor Green

Write-Host "`nLocal Testing:" -ForegroundColor Yellow
Write-Host "Frontend:     http://localhost:8080" -ForegroundColor White
Write-Host "Backend:      http://localhost:3001/api/health" -ForegroundColor White

Write-Host "`nTroubleshooting Tips:" -ForegroundColor Cyan
Write-Host "- If 8080 doesn't work, F-Secure may still be blocking" -ForegroundColor White
Write-Host "- Try temporarily disabling F-Secure firewall" -ForegroundColor White
Write-Host "- Check if other devices can ping $ip" -ForegroundColor White
Write-Host "- Ensure all devices are on the same network" -ForegroundColor White

Write-Host "`nSuccess Indicators:" -ForegroundColor Green
Write-Host "- Both ports show LISTENING status" -ForegroundColor White
Write-Host "- Local URLs work in browser" -ForegroundColor White
Write-Host "- Network URLs accessible from other devices" -ForegroundColor White