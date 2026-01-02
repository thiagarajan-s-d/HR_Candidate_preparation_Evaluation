# Test Port 8080 Network Access
Write-Host "🧪 Testing Port 8080 for Network Access" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Get IP address
$ipAddress = "192.168.32.1"
Write-Host "🌐 Your IP: $ipAddress" -ForegroundColor Green

# Check if port 8080 is commonly allowed
Write-Host "`n🔍 Port 8080 Advantages:" -ForegroundColor Yellow
Write-Host "✅ Common HTTP alternative port" -ForegroundColor Green
Write-Host "✅ Often pre-approved in firewalls" -ForegroundColor Green
Write-Host "✅ Less likely to be blocked by antivirus" -ForegroundColor Green
Write-Host "✅ Standard development port" -ForegroundColor Green

# Check current port usage
Write-Host "`n🔍 Checking Port Availability:" -ForegroundColor Yellow
$port8080 = netstat -an | findstr ":8080"
if ($port8080) {
    Write-Host "⚠️  Port 8080 is in use:" -ForegroundColor Yellow
    Write-Host "$port8080" -ForegroundColor White
} else {
    Write-Host "✅ Port 8080 is available" -ForegroundColor Green
}

# Test if Windows allows 8080 by default
Write-Host "`n🔍 Testing Windows Firewall for 8080:" -ForegroundColor Yellow
try {
    $testResult = Test-NetConnection -ComputerName "localhost" -Port 8080 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($testResult) {
        Write-Host "✅ Port 8080 is accessible" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Port 8080 may need firewall rule" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not test port 8080" -ForegroundColor Yellow
}

Write-Host "`n🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Restart your backend server - it will now use port 8080" -ForegroundColor White
Write-Host "2. Frontend will connect to http://$ipAddress:8080/api" -ForegroundColor White
Write-Host "3. Test from another machine: http://$ipAddress:5173" -ForegroundColor White
Write-Host "4. Backend health check: http://$ipAddress:8080/api/health" -ForegroundColor White

Write-Host "`n💡 If 8080 doesn't work, try these common ports:" -ForegroundColor Yellow
Write-Host "   - 8000 (Python/Django default)" -ForegroundColor White
Write-Host "   - 8888 (Jupyter/development)" -ForegroundColor White
Write-Host "   - 9000 (SonarQube/development)" -ForegroundColor White
Write-Host "   - 3000 (React/Node default)" -ForegroundColor White

Write-Host "`n🔧 Commands to restart servers:" -ForegroundColor Cyan
Write-Host "Backend:  cd server && npm run dev" -ForegroundColor Green
Write-Host "Frontend: npm run dev" -ForegroundColor Green