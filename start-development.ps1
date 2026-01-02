# HR Candidate Evaluation System - Development Startup Script
# This script starts the application in development mode with PM2

Write-Host "🛠️  HR Candidate Evaluation System - Development Mode" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Check if PM2 is installed
try {
    $pm2Version = pm2 --version
    Write-Host "✅ PM2 is installed (version: $pm2Version)" -ForegroundColor Green
} catch {
    Write-Host "❌ PM2 is not installed. Installing PM2..." -ForegroundColor Red
    npm install -g pm2
    Write-Host "✅ PM2 installed successfully" -ForegroundColor Green
}

# Create logs directory
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs"
    Write-Host "📁 Created logs directory" -ForegroundColor Yellow
}

# Stop any existing processes
Write-Host "🛑 Stopping existing processes..." -ForegroundColor Yellow
pm2 stop all 2>$null
pm2 delete all 2>$null

# Start backend in development mode
Write-Host "🚀 Starting backend server..." -ForegroundColor Yellow
pm2 start server/index.js --name "hr-eval-backend-dev" --watch server/ --ignore-watch="node_modules" --env development

# Start frontend in development mode
Write-Host "🚀 Starting frontend server..." -ForegroundColor Yellow
pm2 start "npm run dev" --name "hr-eval-frontend-dev"

# Save PM2 configuration
pm2 save

Write-Host ""
Write-Host "🎉 Development servers started!" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Application Status:" -ForegroundColor Cyan
pm2 status

Write-Host ""
Write-Host "📱 Access URLs:" -ForegroundColor Cyan
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Ethernet*"} | Select-Object -First 1).IPAddress
Write-Host "   Local:   http://localhost:5173" -ForegroundColor White
Write-Host "   Network: http://${ipAddress}:5173" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Development Features:" -ForegroundColor Yellow
Write-Host "   ✅ Hot reload enabled for backend" -ForegroundColor White
Write-Host "   ✅ Vite dev server with HMR" -ForegroundColor White
Write-Host "   ✅ Auto-restart on file changes" -ForegroundColor White
Write-Host "   ✅ Detailed logging enabled" -ForegroundColor White
Write-Host ""
Write-Host "📋 Management Commands:" -ForegroundColor Yellow
Write-Host "   View logs:      pm2 logs" -ForegroundColor White
Write-Host "   Restart:        pm2 restart all" -ForegroundColor White
Write-Host "   Stop:           pm2 stop all" -ForegroundColor White
Write-Host "   Monitor:        pm2 monit" -ForegroundColor White