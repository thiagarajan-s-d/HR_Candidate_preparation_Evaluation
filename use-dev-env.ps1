# Use Development Environment Script
Write-Host "Setting up Development Environment" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Check if .env.development exists
if (Test-Path ".env.development") {
    Write-Host "Found .env.development file" -ForegroundColor Green
    
    # Copy to .env for use
    Copy-Item ".env.development" ".env" -Force
    Write-Host "Copied .env.development to .env" -ForegroundColor Green
    
    # Verify git ignore status
    $gitIgnoreCheck = git check-ignore .env.development 2>$null
    if ($gitIgnoreCheck) {
        Write-Host ".env.development is properly ignored by git" -ForegroundColor Green
    } else {
        Write-Host "WARNING: .env.development might not be ignored by git" -ForegroundColor Yellow
    }
    
    Write-Host "`nNext Steps:" -ForegroundColor Yellow
    Write-Host "1. Edit .env.development with your actual credentials:" -ForegroundColor White
    Write-Host "   - Add your Groq API key" -ForegroundColor White
    Write-Host "   - Update database password" -ForegroundColor White
    Write-Host "   - Verify network IP addresses" -ForegroundColor White
    Write-Host "`n2. Run this script again to apply changes" -ForegroundColor White
    Write-Host "`n3. Start your development servers:" -ForegroundColor White
    Write-Host "   cd server && npm run dev" -ForegroundColor Green
    Write-Host "   npm run dev" -ForegroundColor Green
    
} else {
    Write-Host ".env.development file not found" -ForegroundColor Red
    Write-Host "Please create .env.development first" -ForegroundColor Yellow
}

Write-Host "`nSecurity Notes:" -ForegroundColor Cyan
Write-Host "- .env.development contains real credentials" -ForegroundColor White
Write-Host "- This file is ignored by git (safe from commits)" -ForegroundColor White
Write-Host "- Never share this file or commit it to version control" -ForegroundColor White