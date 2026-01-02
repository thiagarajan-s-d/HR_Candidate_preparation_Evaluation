# HR Candidate Evaluation System - Windows PowerShell Database Setup
# This script sets up the PostgreSQL database on Windows

param(
    [string]$PostgresPath = "C:\Program Files\PostgreSQL\18\bin",
    [string]$DbHost = "localhost",
    [string]$Port = "5432",
    [string]$SuperUser = "postgres",
    [string]$DbName = "hr_candidate_eval",
    [string]$AppUser = "hr_eval_app"
)

Write-Host "===============================================" -ForegroundColor Green
Write-Host "HR Candidate Evaluation System - Database Setup" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host "PostgreSQL Path: $PostgresPath"
Write-Host "Database: $DbName"
Write-Host "App User: $AppUser"
Write-Host "Host: ${DbHost}:${Port}"
Write-Host "===============================================" -ForegroundColor Green

# Set PostgreSQL tools path
$psql = "$PostgresPath\psql.exe"
$pgIsReady = "$PostgresPath\pg_isready.exe"

# Check if PostgreSQL tools exist
if (-not (Test-Path $psql)) {
    Write-Error "psql.exe not found at $psql"
    Write-Host "Please install PostgreSQL or update the PostgresPath parameter"
    exit 1
}

# Check PostgreSQL connection
Write-Host "[INFO] Checking PostgreSQL connection..." -ForegroundColor Yellow
try {
    & $pgIsReady -h $DbHost -p $Port -U $SuperUser | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] PostgreSQL is running and accessible" -ForegroundColor Green
    } else {
        Write-Error "PostgreSQL is not accessible"
        exit 1
    }
} catch {
    Write-Error "Failed to check PostgreSQL connection: $_"
    exit 1
}

# Check if we're in the correct directory
if (-not (Test-Path "01_create_database.sql")) {
    Write-Error "Please run this script from the DB directory"
    Write-Host "Example: cd DB; .\setup-windows.ps1"
    exit 1
}

# Verify script files exist
$scripts = @(
    "01_create_database.sql",
    "02_create_schema.sql", 
    "03_performance_indexes.sql",
    "04_security_setup.sql",
    "05_sample_data.sql"
)

Write-Host "[INFO] Verifying script files..." -ForegroundColor Yellow
foreach ($script in $scripts) {
    if (-not (Test-Path $script)) {
        Write-Error "Required script not found: $script"
        exit 1
    }
}
Write-Host "[SUCCESS] All required scripts found" -ForegroundColor Green

# Prompt for postgres password
$postgresPassword = Read-Host "Enter password for PostgreSQL user '$SuperUser'" -AsSecureString
$postgresPasswordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($postgresPassword))

# Set environment variable for password
$env:PGPASSWORD = $postgresPasswordText

try {
    # Step 1: Create database and user
    Write-Host "[INFO] Creating database and user..." -ForegroundColor Yellow
    & $psql -h $DbHost -p $Port -U $SuperUser -f "01_create_database.sql"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to execute 01_create_database.sql"
        exit 1
    }
    Write-Host "[SUCCESS] Database and user created" -ForegroundColor Green

    # Step 2: Create schema
    Write-Host "[INFO] Creating database schema..." -ForegroundColor Yellow
    & $psql -h $DbHost -p $Port -U $SuperUser -d $DbName -f "02_create_schema.sql"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to execute 02_create_schema.sql"
        exit 1
    }
    Write-Host "[SUCCESS] Database schema created" -ForegroundColor Green

    # Step 3: Add performance optimizations
    Write-Host "[INFO] Adding performance optimizations..." -ForegroundColor Yellow
    & $psql -h $DbHost -p $Port -U $SuperUser -d $DbName -f "03_performance_indexes.sql"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to execute 03_performance_indexes.sql"
        exit 1
    }
    Write-Host "[SUCCESS] Performance optimizations added" -ForegroundColor Green

    # Step 4: Set up security
    Write-Host "[INFO] Setting up security features..." -ForegroundColor Yellow
    & $psql -h $DbHost -p $Port -U $SuperUser -d $DbName -f "04_security_setup.sql"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to execute 04_security_setup.sql"
        exit 1
    }
    Write-Host "[SUCCESS] Security features configured" -ForegroundColor Green

    # Step 5: Load sample data (optional)
    $loadSample = Read-Host "Load sample data for development? (y/N)"
    if ($loadSample -eq "y" -or $loadSample -eq "Y") {
        Write-Host "[INFO] Loading sample data..." -ForegroundColor Yellow
        & $psql -h $DbHost -p $Port -U $SuperUser -d $DbName -f "05_sample_data.sql"
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to execute 05_sample_data.sql"
            exit 1
        }
        Write-Host "[SUCCESS] Sample data loaded" -ForegroundColor Green
    } else {
        Write-Host "[INFO] Skipping sample data" -ForegroundColor Yellow
    }

    # Verify setup
    Write-Host "[INFO] Verifying database setup..." -ForegroundColor Yellow
    & $psql -h $DbHost -p $Port -U $SuperUser -d $DbName -f "verify_pg18_compatibility.sql"
    
    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "Database Setup Complete!" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "Database: $DbName"
    Write-Host "App User: $AppUser"
    Write-Host "Connection: ${DbHost}:${Port}"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Update your .env file with database credentials"
    Write-Host "2. Start the backend server: cd server && npm run dev"
    Write-Host "3. Start the frontend: npm run dev"
    Write-Host ""
    Write-Host "Environment variables to set:"
    Write-Host "POSTGRES_HOST=$DbHost"
    Write-Host "POSTGRES_PORT=$Port"
    Write-Host "POSTGRES_DB=$DbName"
    Write-Host "POSTGRES_USER=$AppUser"
    Write-Host "POSTGRES_PASSWORD=<app_user_password>"
    Write-Host "=============================================" -ForegroundColor Green

} finally {
    # Clear password from environment
    $env:PGPASSWORD = $null
}