# HR Candidate Evaluation System - Network Access Setup Script
# Run this script as Administrator to configure network access

Write-Host "🚀 HR Candidate Evaluation System - Network Setup" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Get the machine's IP address
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Ethernet*"} | Select-Object -First 1).IPAddress

if (-not $ipAddress) {
    Write-Host "❌ Could not detect IP address. Please run manually:" -ForegroundColor Red
    Write-Host "   ipconfig | findstr IPv4" -ForegroundColor Yellow
    exit 1
}

Write-Host "📍 Detected IP Address: $ipAddress" -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "⚠️  This script should be run as Administrator for firewall configuration" -ForegroundColor Yellow
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
}

# Update .env file
Write-Host "📝 Updating .env file..." -ForegroundColor Yellow

$envPath = ".env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    
    # Update or add VITE_API_URL
    $envContent = $envContent -replace "VITE_API_URL=.*", "VITE_API_URL=http://${ipAddress}:3001/api"
    
    # Update or add FRONTEND_URL
    if ($envContent -match "FRONTEND_URL=") {
        $envContent = $envContent -replace "FRONTEND_URL=.*", "FRONTEND_URL=http://${ipAddress}:5173"
    } else {
        $envContent += "`nFRONTEND_URL=http://${ipAddress}:5173"
    }
    
    # Update or add ALLOWED_ORIGINS
    if ($envContent -match "ALLOWED_ORIGINS=") {
        $envContent = $envContent -replace "ALLOWED_ORIGINS=.*", "ALLOWED_ORIGINS=http://localhost:5173,http://${ipAddress}:5173,http://127.0.0.1:5173"
    } else {
        $envContent += "`nALLOWED_ORIGINS=http://localhost:5173,http://${ipAddress}:5173,http://127.0.0.1:5173"
    }
    
    # Ensure HOST is set to 0.0.0.0
    if ($envContent -match "HOST=") {
        $envContent = $envContent -replace "HOST=.*", "HOST=0.0.0.0"
    } else {
        $envContent += "`nHOST=0.0.0.0"
    }
    
    $envContent | Set-Content $envPath
    Write-Host "✅ Updated .env file with IP: $ipAddress" -ForegroundColor Green
} else {
    Write-Host "❌ .env file not found. Please create it first." -ForegroundColor Red
    exit 1
}

# Configure Windows Firewall (if running as admin)
if ($isAdmin) {
    Write-Host "🔥 Configuring Windows Firewall..." -ForegroundColor Yellow
    
    try {
        # Remove existing rules if they exist
        Remove-NetFirewallRule -DisplayName "HR Eval Frontend" -ErrorAction SilentlyContinue
        Remove-NetFirewallRule -DisplayName "HR Eval Backend" -ErrorAction SilentlyContinue
        
        # Add new firewall rules
        New-NetFirewallRule -DisplayName "HR Eval Frontend" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -Profile Any
        New-NetFirewallRule -DisplayName "HR Eval Backend" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow -Profile Any
        
        Write-Host "✅ Firewall rules configured successfully" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Could not configure firewall automatically. Please configure manually:" -ForegroundColor Yellow
        Write-Host "   - Allow ports 5173 and 3001 through Windows Firewall" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Skipping firewall configuration (not running as Administrator)" -ForegroundColor Yellow
    Write-Host "   Please run the following commands as Administrator:" -ForegroundColor Yellow
    Write-Host "   New-NetFirewallRule -DisplayName 'HR Eval Frontend' -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow" -ForegroundColor Cyan
    Write-Host "   New-NetFirewallRule -DisplayName 'HR Eval Backend' -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🎉 Network Setup Complete!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Access URLs:" -ForegroundColor Cyan
Write-Host "   Local:   http://localhost:5173" -ForegroundColor White
Write-Host "   Network: http://${ipAddress}:5173" -ForegroundColor White
Write-Host ""
Write-Host "🔧 API Endpoints:" -ForegroundColor Cyan
Write-Host "   Local:   http://localhost:3001/api" -ForegroundColor White
Write-Host "   Network: http://${ipAddress}:3001/api" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Start the backend:  cd server && npm run dev" -ForegroundColor White
Write-Host "   2. Start the frontend: npm run dev" -ForegroundColor White
Write-Host "   3. Test network access from another machine" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Test Commands (from another machine):" -ForegroundColor Cyan
Write-Host "   curl http://${ipAddress}:3001/api/health" -ForegroundColor White
Write-Host "   Open browser: http://${ipAddress}:5173" -ForegroundColor White
Write-Host ""

# Test local connectivity
Write-Host "🔍 Testing local connectivity..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Backend is running and accessible" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend not running. Start with: cd server && npm run dev" -ForegroundColor Yellow
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Frontend is running and accessible" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Frontend not running. Start with: npm run dev" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Share these URLs with other users on your network:" -ForegroundColor Green
Write-Host "   Application: http://${ipAddress}:5173" -ForegroundColor White
Write-Host "   API Health:  http://${ipAddress}:3001/api/health" -ForegroundColor White