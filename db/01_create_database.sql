-- HR Candidate Evaluation System - Database Creation Script
-- This script creates the main database and user for the application
-- Run this script as a PostgreSQL superuser (e.g., postgres)

-- =============================================================================
-- DATABASE CREATION
-- =============================================================================

-- Create the main database
CREATE DATABASE hr_candidate_eval
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    TEMPLATE = template0;

-- Add comment to database
COMMENT ON DATABASE hr_candidate_eval IS 'HR Candidate Evaluation System - Main Database';

-- =============================================================================
-- USER CREATION (PRODUCTION SECURITY)
-- =============================================================================

-- Create dedicated application user with limited privileges
-- Replace 'your_secure_password' with a strong password
CREATE USER hr_eval_app WITH 
    PASSWORD 'your_secure_password'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOINHERIT
    LOGIN
    NOREPLICATION
    NOBYPASSRLS
    CONNECTION LIMIT 20;

-- Add comment to user
COMMENT ON ROLE hr_eval_app IS 'HR Candidate Evaluation System - Application User';

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant connection to the database
GRANT CONNECT ON DATABASE hr_candidate_eval TO hr_eval_app;

-- Connect to the database to grant schema permissions
\c hr_candidate_eval;

-- Create dbo schema
CREATE SCHEMA IF NOT EXISTS dbo;

-- Grant usage on dbo schema
GRANT USAGE ON SCHEMA dbo TO hr_eval_app;

-- Grant permissions on all current and future tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA dbo TO hr_eval_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA dbo GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hr_eval_app;

-- Grant permissions on all current and future sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA dbo TO hr_eval_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA dbo GRANT USAGE, SELECT ON SEQUENCES TO hr_eval_app;

-- Grant permissions on all current and future functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA dbo TO hr_eval_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA dbo GRANT EXECUTE ON FUNCTIONS TO hr_eval_app;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify database creation (compatible with all PostgreSQL versions)
SELECT 
    datname,
    pg_catalog.pg_get_userbyid(datdba) as owner,
    pg_encoding_to_char(encoding) as encoding,
    datcollate,
    datctype 
FROM pg_database 
WHERE datname = 'hr_candidate_eval';

-- Verify user creation
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolcanlogin, rolconnlimit
FROM pg_roles 
WHERE rolname = 'hr_eval_app';

-- Show granted permissions on schema
SELECT 
    nspname as schema_name,
    r.rolname as grantee,
    p.perm as privilege_type
FROM pg_namespace n
CROSS JOIN pg_roles r
CROSS JOIN (VALUES ('USAGE'), ('CREATE')) AS p(perm)
WHERE n.nspname = 'dbo' 
AND r.rolname = 'hr_eval_app'
AND has_schema_privilege(r.oid, n.oid, p.perm);

-- Show granted permissions on tables (if any exist)
SELECT 
    table_schema,
    table_name,
    grantee,
    privilege_type
FROM information_schema.role_table_grants 
WHERE grantee = 'hr_eval_app' 
AND table_schema = 'dbo';

-- Show default privileges for future objects
SELECT 
    defaclnamespace::regnamespace as schema,
    defaclrole::regrole as grantor,
    defaclobjtype as object_type,
    defaclacl as privileges
FROM pg_default_acl 
WHERE defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'dbo');

-- =============================================================================
-- USAGE INSTRUCTIONS
-- =============================================================================

/*
To use this script:

1. Connect to PostgreSQL as superuser:
   psql -U postgres -h localhost

2. Run this script:
   \i DB/01_create_database.sql

3. Update your environment variables:
   POSTGRES_DB=hr_candidate_eval
   POSTGRES_USER=hr_eval_app
   POSTGRES_PASSWORD=your_secure_password

4. Run the schema setup script:
   \c hr_candidate_eval
   \i DB/02_create_schema.sql

5. Run the performance optimization script:
   \i DB/03_performance_indexes.sql

6. Run the security setup script:
   \i DB/04_security_setup.sql
*/