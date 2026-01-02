# HR Candidate Evaluation System - Complete Network Troubleshooting
# Run as Administrator

Write-Host "🔍 HR Candidate Evaluation - Network Troubleshooting" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# Get machine IP
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi" -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress
if (-not $ipAddress) {
    $ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" -or $_.IPAddress -like "172.*" } | Select-Object -First 1).IPAddress
}

Write-Host "🌐 Your IP Address: $ipAddress" -ForegroundColor Green

# Issue 1: Check .env configuration
Write-Host "`n🔧 Issue 1: Checking .env Configuration..." -ForegroundColor Yellow
$envPath = ".env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    
    Write-Host "✅ Current VITE_API_URL:" -ForegroundColor Green
    if ($envContent -match "VITE_API_URL=(.*)") {
        Write-Host "   $($matches[1])" -ForegroundColor White
        if ($matches[1] -like "*localhost*") {
            Write-Host "❌ PROBLEM: Using localhost - other machines can't access" -ForegroundColor Red
        } else {
            Write-Host "✅ OK: Using network IP" -ForegroundColor Green
        }
    }
    
    Write-Host "✅ Current ALLOWED_ORIGINS:" -ForegroundColor Green
    if ($envContent -match "ALLOWED_ORIGINS=(.*)") {
        Write-Host "   $($matches[1])" -ForegroundColor White
        if ($matches[1] -like "*$ipAddress*") {
            Write-Host "✅ OK: Your IP is in allowed origins" -ForegroundColor Green
        } else {
            Write-Host "❌ PROBLEM: Your IP ($ipAddress) not in allowed origins" -ForegroundColor Red
        }
    }
} else {
    Write-Host "❌ PROBLEM: .env file not found!" -ForegroundColor Red
}

# Issue 2: Check Windows Firewall
Write-Host "`n🔧 Issue 2: Checking Windows Firewall..." -ForegroundColor Yellow
$firewallRules = Get-NetFirewallRule -DisplayName "*HR Eval*" -ErrorAction SilentlyContinue
if ($firewallRules) {
    Write-Host "✅ Firewall rules exist:" -ForegroundColor Green
    $firewallRules | ForEach-Object {
        Write-Host "   $($_.DisplayName) - $($_.Enabled) - $($_.Direction)" -ForegroundColor White
    }
} else {
    Write-Host "❌ PROBLEM: No firewall rules found for HR Eval" -ForegroundColor Red
}

# Issue 3: Check if ports are listening
Write-Host "`n🔧 Issue 3: Checking Port Status..." -ForegroundColor Yellow
$frontendPort = netstat -an | findstr ":5173"
$backendPort = netstat -an | findstr ":3001"

if ($frontendPort) {
    Write-Host "✅ Frontend port 5173 is listening" -ForegroundColor Green
    Write-Host "   $frontendPort" -ForegroundColor White
} else {
    Write-Host "❌ PROBLEM: Frontend port 5173 not listening" -ForegroundColor Red
}

if ($backendPort) {
    Write-Host "✅ Backend port 3001 is listening" -ForegroundColor Green
    Write-Host "   $backendPort" -ForegroundColor White
} else {
    Write-Host "❌ PROBLEM: Backend port 3001 not listening" -ForegroundColor Red
}

# Issue 4: Test local connectivity
Write-Host "`n🔧 Issue 4: Testing Local Connectivity..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Backend health check: OK" -ForegroundColor Green
} catch {
    Write-Host "❌ PROBLEM: Backend not responding locally" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Frontend health check: OK" -ForegroundColor Green
} catch {
    Write-Host "❌ PROBLEM: Frontend not responding locally" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Issue 5: Check antivirus/security software
Write-Host "`n🔧 Issue 5: Checking Security Software..." -ForegroundColor Yellow
$antivirusProducts = Get-CimInstance -Namespace "Root\SecurityCenter2" -ClassName "AntiVirusProduct" -ErrorAction SilentlyContinue
if ($antivirusProducts) {
    Write-Host "⚠️  Antivirus software detected:" -ForegroundColor Yellow
    $antivirusProducts | ForEach-Object {
        Write-Host "   $($_.displayName)" -ForegroundColor White
    }
    Write-Host "   These may block network access - check their firewall settings" -ForegroundColor Yellow
} else {
    Write-Host "✅ No third-party antivirus detected" -ForegroundColor Green
}

# Solutions
Write-Host "`n🛠️  SOLUTIONS:" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan

Write-Host "`n1. Fix .env Configuration:" -ForegroundColor Yellow
Write-Host "   Update your .env file with:" -ForegroundColor White
Write-Host "   VITE_API_URL=http://${ipAddress}:3001/api" -ForegroundColor Green
Write-Host "   FRONTEND_URL=http://${ipAddress}:5173" -ForegroundColor Green
Write-Host "   ALLOWED_ORIGINS=http://localhost:5173,http://${ipAddress}:5173,http://127.0.0.1:5173" -ForegroundColor Green

Write-Host "`n2. Add Firewall Rules (Run as Administrator):" -ForegroundColor Yellow
Write-Host "   New-NetFirewallRule -DisplayName 'HR Eval Frontend' -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow" -ForegroundColor Green
Write-Host "   New-NetFirewallRule -DisplayName 'HR Eval Backend' -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow" -ForegroundColor Green

Write-Host "`n3. Restart Servers:" -ForegroundColor Yellow
Write-Host "   Stop both servers (Ctrl+C)" -ForegroundColor White
Write-Host "   cd server && npm run dev" -ForegroundColor Green
Write-Host "   npm run dev (in new terminal)" -ForegroundColor Green

Write-Host "`n4. Test Network Access:" -ForegroundColor Yellow
Write-Host "   From another machine, try:" -ForegroundColor White
Write-Host "   http://${ipAddress}:5173" -ForegroundColor Green
Write-Host "   http://${ipAddress}:3001/api/health" -ForegroundColor Green

Write-Host "`n5. If Still Not Working:" -ForegroundColor Yellow
Write-Host "   - Check router AP isolation settings" -ForegroundColor White
Write-Host "   - Temporarily disable antivirus firewall" -ForegroundColor White
Write-Host "   - Ensure all devices are on same network" -ForegroundColor White

Write-Host "`n🎯 Quick Fix Command:" -ForegroundColor Cyan
Write-Host ".\setup-network-access.ps1" -ForegroundColor Green

Write-Host "`nTroubleshooting complete!" -ForegroundColor Green