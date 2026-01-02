# HR Candidate Evaluation System - Production Startup Script
# This script builds and starts the application using PM2 for persistent operation

Write-Host "🚀 HR Candidate Evaluation System - Production Startup" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green

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

# Stop any existing PM2 processes
Write-Host "🛑 Stopping existing processes..." -ForegroundColor Yellow
pm2 stop ecosystem.config.js 2>$null
pm2 delete ecosystem.config.js 2>$null

# Build the frontend for production
Write-Host "🔨 Building frontend for production..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Frontend build completed" -ForegroundColor Green

# Install production dependencies for backend
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
cd server
npm install --production
cd ..

# Start applications with PM2
Write-Host "🚀 Starting applications with PM2..." -ForegroundColor Yellow
pm2 start ecosystem.config.js

# Save PM2 configuration
Write-Host "💾 Saving PM2 configuration..." -ForegroundColor Yellow
pm2 save

# Setup PM2 startup (Windows)
Write-Host "⚙️  Setting up PM2 startup..." -ForegroundColor Yellow
pm2 startup

Write-Host ""
Write-Host "🎉 Production deployment complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Application Status:" -ForegroundColor Cyan
pm2 status

Write-Host ""
Write-Host "📱 Access URLs:" -ForegroundColor Cyan
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Ethernet*"} | Select-Object -First 1).IPAddress
Write-Host "   Local:   http://localhost:5173" -ForegroundColor White
Write-Host "   Network: http://${ipAddress}:5173" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Management Commands:" -ForegroundColor Yellow
Write-Host "   View status:    pm2 status" -ForegroundColor White
Write-Host "   View logs:      pm2 logs" -ForegroundColor White
Write-Host "   Restart apps:   pm2 restart ecosystem.config.js" -ForegroundColor White
Write-Host "   Stop apps:      pm2 stop ecosystem.config.js" -ForegroundColor White
Write-Host "   Monitor:        pm2 monit" -ForegroundColor White
Write-Host ""
Write-Host "📋 The application will now:" -ForegroundColor Green
Write-Host "   ✅ Run continuously in the background" -ForegroundColor White
Write-Host "   ✅ Restart automatically if it crashes" -ForegroundColor White
Write-Host "   ✅ Start automatically when computer boots" -ForegroundColor White
Write-Host "   ✅ Continue running when you close terminals" -ForegroundColor White