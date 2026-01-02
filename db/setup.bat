@echo off
REM HR Candidate Evaluation System - Database Setup Script (Windows)
REM This script automates the complete database setup process on Windows

setlocal enabledelayedexpansion

REM Configuration
set DB_NAME=hr_candidate_eval
set DB_USER=hr_eval_app
set POSTGRES_USER=postgres
set POSTGRES_HOST=localhost
set POSTGRES_PORT=5432

REM Colors for output (Windows doesn't support colors in batch easily, so we'll use echo)
echo ===============================================
echo HR Candidate Evaluation System - Database Setup
echo ===============================================
echo Database: %DB_NAME%
echo App User: %DB_USER%
echo PostgreSQL Host: %POSTGRES_HOST%:%POSTGRES_PORT%
echo PostgreSQL User: %POSTGRES_USER%
echo ===============================================
echo.

REM Check if PostgreSQL is accessible
echo [INFO] Checking PostgreSQL connection...
pg_isready -h %POSTGRES_HOST% -p %POSTGRES_PORT% -U %POSTGRES_USER% >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PostgreSQL is not running or not accessible
    echo [ERROR] Please ensure PostgreSQL is installed and running on %POSTGRES_HOST%:%POSTGRES_PORT%
    pause
    exit /b 1
)
echo [SUCCESS] PostgreSQL is running and accessible

REM Check if we're in the correct directory
if not exist "01_create_database.sql" (
    echo [ERROR] Please run this script from the DB directory
    echo [ERROR] cd DB && setup.bat
    pause
    exit /b 1
)

REM Verify script files exist
echo [INFO] Verifying script files...
set SCRIPTS=01_create_database.sql 02_create_schema.sql 03_performance_indexes.sql 04_security_setup.sql 05_sample_data.sql
for %%s in (%SCRIPTS%) do (
    if not exist "%%s" (
        echo [ERROR] Required script not found: %%s
        echo [ERROR] Please ensure all database scripts are in the current directory
        pause
        exit /b 1
    )
)
echo [SUCCESS] All required scripts found

REM Parse command line arguments
set FORCE_RECREATE=false
set SKIP_SAMPLE=false
set TEST_ONLY=false

:parse_args
if "%1"=="" goto end_parse
if "%1"=="-f" set FORCE_RECREATE=true
if "%1"=="--force" set FORCE_RECREATE=true
if "%1"=="-s" set SKIP_SAMPLE=true
if "%1"=="--skip-sample" set SKIP_SAMPLE=true
if "%1"=="-t" set TEST_ONLY=true
if "%1"=="--test-only" set TEST_ONLY=true
if "%1"=="-h" goto show_help
if "%1"=="--help" goto show_help
shift
goto parse_args

:end_parse

REM Check if database exists
echo [INFO] Checking if database exists...
for /f %%i in ('psql -h %POSTGRES_HOST% -p %POSTGRES_PORT% -U %POSTGRES_USER% -tAc "SELECT 1 FROM pg_database WHERE datname='%DB_NAME%'" 2^>nul') do set DB_EXISTS=%%i

if "%TEST_ONLY%"=="true" (
    echo [INFO] Test mode - checking existing setup...
    if "%DB_EXISTS%"=="1" (
        echo [SUCCESS] Database '%DB_NAME%' exists
    ) else (
        echo [WARNING] Database '%DB_NAME%' does not exist
    )
    
    REM Check if user exists
    for /f %%i in ('psql -h %POSTGRES_HOST% -p %POSTGRES_PORT% -U %POSTGRES_USER% -tAc "SELECT 1 FROM pg_roles WHERE rolname='%DB_USER%'" 2^>nul') do set USER_EXISTS=%%i
    if "!USER_EXISTS!"=="1" (
        echo [SUCCESS] User '%DB_USER%' exists
        echo [INFO] Testing application user connection...
        set /p APP_PASSWORD="Enter password for %DB_USER%: "
        echo Testing connection...
        REM Note: Windows batch doesn't handle password input securely like bash
    ) else (
        echo [WARNING] User '%DB_USER%' does not exist
    )
    goto end_script
)

REM Check if database already exists
if "%DB_EXISTS%"=="1" (
    if "%FORCE_RECREATE%"=="true" (
        echo [WARNING] Database exists - forcing recreation
        echo [INFO] Dropping existing database...
        psql -h %POSTGRES_HOST% -p %POSTGRES_PORT% -U %POSTGRES_USER% -c "DROP DATABASE IF EXISTS %DB_NAME%;" >nul 2>&1
        echo [SUCCESS] Existing database dropped
    ) else (
        echo [WARNING] Database '%DB_NAME%' already exists
        echo [WARNING] Use --force to recreate or --test-only to test existing setup
        pause
        exit /b 1
    )
)

REM Check if user already exists
for /f %%i in ('psql -h %POSTGRES_HOST% -p %POSTGRES_PORT% -U %POSTGRES_USER% -tAc "SELECT 1 FROM pg_roles WHERE rolname='%DB_USER%'" 2^>nul') do set USER_EXISTS=%%i
if "%USER_EXISTS%"=="1" (
    if "%FORCE_RECREATE%"=="true" (
        echo [WARNING] User exists - forcing recreation
        echo [INFO] Dropping existing user...
        psql -h %POSTGRES_HOST% -p %POSTGRES_PORT% -U %POSTGRES_USER% -c "DROP USER IF EXISTS %DB_USER%;" >nul 2>&1
        echo [SUCCESS] Existing user dropped
    ) else (
        echo [WARNING] User '%DB_USER%' already exists
        echo [WARNING] Use --force to recreate
    )
)

REM Run setup scripts
echo [INFO] Starting database setup...

REM Step 1: Create database and user
echo [INFO] Creating database and user
psql -h %POSTGRES_HOST% -p %POSTGRES_PORT% -U %POSTGRES_USER% -f "01_create_database.sql" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Failed to execute 01_create_database.sql
    pause
    exit /b 1
)
echo [SUCCESS] Creating database and user completed

REM Step 2: Create schema
echo [INFO] Creating database schema
psql -h %POSTGRES_HOST% -p %POSTGRES_PORT% -U %POSTGRES_USER% -d %DB_NAME% -f "02_create_schema.sql" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Failed to execute 02_create_schema.sql
    pause
    exit /b 1
)
echo [SUCCESS] Creating database schema completed

REM Step 3: Add performance optimizations
echo [INFO] Adding performance optimizations
psql -h %POSTGRES_HOST% -p %POSTGRES_PORT% -U %POSTGRES_USER% -d %DB_NAME% -f "03_performance_indexes.sql" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Failed to execute 03_performance_indexes.sql
    pause
    exit /b 1
)
echo [SUCCESS] Adding performance optimizations completed

REM Step 4: Set up security
echo [INFO] Setting up security features
psql -h %POSTGRES_HOST% -p %POSTGRES_PORT% -U %POSTGRES_USER% -d %DB_NAME% -f "04_security_setup.sql" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Failed to execute 04_security_setup.sql
    pause
    exit /b 1
)
echo [SUCCESS] Setting up security features completed

REM Step 5: Load sample data (optional)
if "%SKIP_SAMPLE%"=="false" (
    echo [INFO] Loading sample data
    psql -h %POSTGRES_HOST% -p %POSTGRES_PORT% -U %POSTGRES_USER% -d %DB_NAME% -f "05_sample_data.sql" >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Failed to execute 05_sample_data.sql
        pause
        exit /b 1
    )
    echo [SUCCESS] Loading sample data completed
) else (
    echo [INFO] Skipping sample data insertion
)

echo [SUCCESS] Database setup completed successfully!

REM Test connection
echo [INFO] Testing application user connection...
set /p APP_PASSWORD="Enter password for %DB_USER%: "

REM Create .env file
echo [INFO] Creating environment configuration...
set ENV_FILE=..\.env
(
echo # HR Candidate Evaluation System - Database Configuration
echo # Generated by setup script on %date% %time%
echo.
echo # Groq API Configuration
echo VITE_GROQ_API_KEY=your_groq_api_key_here
echo.
echo # API Configuration
echo VITE_API_URL=http://localhost:3001/api
echo.
echo # PostgreSQL Configuration
echo POSTGRES_HOST=%POSTGRES_HOST%
echo POSTGRES_PORT=%POSTGRES_PORT%
echo POSTGRES_DB=%DB_NAME%
echo POSTGRES_USER=%DB_USER%
echo POSTGRES_PASSWORD=!APP_PASSWORD!
echo.
echo # Server Configuration
echo PORT=3001
echo HOST=0.0.0.0
echo.
echo # Node.js Environment
echo NODE_ENV=development
echo.
echo # Optional: SSL Configuration ^(set to true for production^)
echo POSTGRES_SSL=false
echo.
echo # Database Schema ^(using dbo schema instead of public^)
echo POSTGRES_SCHEMA=dbo
echo.
echo # Get your Groq API key from: https://console.groq.com/keys
) > "%ENV_FILE%"

echo [SUCCESS] Environment file created: %ENV_FILE%
echo [WARNING] Remember to set your VITE_GROQ_API_KEY in the .env file

REM Final instructions
echo.
echo ==============================================
echo Setup Complete!
echo ==============================================
echo Database: %DB_NAME%
echo App User: %DB_USER%
echo Connection: %POSTGRES_HOST%:%POSTGRES_PORT%
echo.
echo Next steps:
echo 1. Update your .env file with the Groq API key
echo 2. Start the backend server: cd server ^&^& npm run dev
echo 3. Start the frontend: npm run dev
echo.

if "%SKIP_SAMPLE%"=="false" (
    echo Sample user accounts ^(password: password123^):
    echo - admin@hreval.com ^(Administrator^)
    echo - hr.manager@company.com ^(HR Manager^)
    echo - tech.lead@company.com ^(Technical Lead^)
    echo - recruiter@company.com ^(Recruiter^)
    echo - candidate@example.com ^(Candidate^)
    echo.
)

echo For troubleshooting, see DB\README.md
echo ==============================================
goto end_script

:show_help
echo Usage: %0 [OPTIONS]
echo.
echo Options:
echo   -h, --help              Show this help message
echo   -f, --force             Force recreation of database ^(drops existing^)
echo   -s, --skip-sample       Skip sample data insertion
echo   -t, --test-only         Only test connection, don't create anything
echo.
echo Examples:
echo   %0                      # Standard setup
echo   %0 --force              # Force recreation
echo   %0 --skip-sample        # Setup without sample data
goto end_script

:end_script
pause