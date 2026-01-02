-- HR Candidate Evaluation System - Correct PostgreSQL 18 Queries
-- This script provides the correct queries for checking permissions and objects in PostgreSQL 18

-- =============================================================================
-- CORRECT PERMISSION QUERIES FOR POSTGRESQL 18
-- =============================================================================

-- 1. Check table permissions (CORRECT)
SELECT 
    table_schema,
    table_name,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE grantee = 'hr_eval_app' 
AND table_schema = 'dbo'
ORDER BY table_name, privilege_type;

-- 2. Check schema permissions (CORRECT)
SELECT 
    nspname as schema_name,
    r.rolname as grantee,
    CASE 
        WHEN has_schema_privilege(r.oid, n.oid, 'USAGE') THEN 'USAGE'
        ELSE NULL
    END as privilege_type
FROM pg_namespace n
CROSS JOIN pg_roles r
WHERE n.nspname = 'dbo' 
AND r.rolname = 'hr_eval_app'
AND has_schema_privilege(r.oid, n.oid, 'USAGE');

-- 3. Check database permissions (CORRECT)
SELECT 
    datname as database_name,
    r.rolname as grantee,
    CASE 
        WHEN has_database_privilege(r.oid, d.oid, 'CONNECT') THEN 'CONNECT'
        ELSE NULL
    END as privilege_type
FROM pg_database d
CROSS JOIN pg_roles r
WHERE d.datname = current_database()
AND r.rolname = 'hr_eval_app'
AND has_database_privilege(r.oid, d.oid, 'CONNECT');

-- =============================================================================
-- CORRECT OBJECT LISTING QUERIES FOR POSTGRESQL 18
-- =============================================================================

-- 4. List tables in dbo schema (CORRECT)
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'dbo'
ORDER BY table_name;

-- 5. List sequences in dbo schema (CORRECT for PostgreSQL 18)
SELECT 
    sequence_schema,
    sequence_name,
    data_type,
    numeric_precision
FROM information_schema.sequences 
WHERE sequence_schema = 'dbo'
ORDER BY sequence_name;

-- 6. List functions in dbo schema (CORRECT)
SELECT 
    routine_schema,
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'dbo'
ORDER BY routine_name;

-- 7. List views in dbo schema (CORRECT)
SELECT 
    table_schema,
    table_name as view_name,
    view_definition
FROM information_schema.views 
WHERE table_schema = 'dbo'
ORDER BY table_name;

-- =============================================================================
-- CORRECT INDEX QUERIES FOR POSTGRESQL 18
-- =============================================================================

-- 8. List indexes in dbo schema (CORRECT)
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'dbo'
ORDER BY tablename, indexname;

-- 9. Index usage statistics (CORRECT)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) as index_size
FROM pg_stat_user_indexes 
WHERE schemaname = 'dbo'
ORDER BY idx_scan DESC;

-- =============================================================================
-- CORRECT STATISTICS QUERIES FOR POSTGRESQL 18
-- =============================================================================

-- 10. Table statistics (CORRECT)
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_live_tup,
    n_dead_tup,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables 
WHERE schemaname = 'dbo'
ORDER BY tablename;

-- 11. Table sizes (CORRECT)
SELECT 
    t.table_schema,
    t.table_name,
    pg_size_pretty(pg_total_relation_size(t.table_schema||'.'||t.table_name)) as total_size,
    pg_size_pretty(pg_relation_size(t.table_schema||'.'||t.table_name)) as table_size,
    pg_size_pretty(pg_indexes_size(t.table_schema||'.'||t.table_name)) as index_size
FROM information_schema.tables t
WHERE t.table_schema = 'dbo'
ORDER BY pg_total_relation_size(t.table_schema||'.'||t.table_name) DESC;

-- =============================================================================
-- CORRECT SECURITY QUERIES FOR POSTGRESQL 18
-- =============================================================================

-- 12. Row Level Security status (CORRECT)
SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'dbo' 
AND c.relkind = 'r'
ORDER BY c.relname;

-- 13. RLS policies (CORRECT)
SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    p.polname as policy_name,
    p.polcmd as command,
    p.polpermissive as permissive,
    pg_get_expr(p.polqual, p.polrelid) as policy_expression
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'dbo'
ORDER BY c.relname, p.polname;

-- =============================================================================
-- CORRECT EXTENSION QUERIES FOR POSTGRESQL 18
-- =============================================================================

-- 14. Installed extensions (CORRECT)
SELECT 
    extname as extension_name,
    extversion as version,
    n.nspname as schema_name
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
ORDER BY extname;

-- 15. Available extensions (CORRECT)
SELECT 
    name,
    default_version,
    installed_version,
    comment
FROM pg_available_extensions 
WHERE name IN ('uuid-ossp', 'pgcrypto', 'pg_stat_statements')
ORDER BY name;

-- =============================================================================
-- CORRECT PERFORMANCE QUERIES FOR POSTGRESQL 18
-- =============================================================================

-- 16. Query performance (requires pg_stat_statements) (CORRECT)
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    min_exec_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 17. Connection statistics (CORRECT)
SELECT 
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_connections,
    count(*) FILTER (WHERE state = 'idle') as idle_connections,
    count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
    max(backend_start) as oldest_connection,
    avg(EXTRACT(EPOCH FROM (now() - backend_start))) as avg_connection_age_seconds
FROM pg_stat_activity
WHERE datname = current_database();

-- =============================================================================
-- USAGE EXAMPLES
-- =============================================================================

/*
-- Example usage for checking permissions:

-- Check if hr_eval_app can connect to database
SELECT has_database_privilege('hr_eval_app', current_database(), 'CONNECT');

-- Check if hr_eval_app can use dbo schema
SELECT has_schema_privilege('hr_eval_app', 'dbo', 'USAGE');

-- Check specific table permissions
SELECT has_table_privilege('hr_eval_app', 'dbo.users', 'SELECT');
SELECT has_table_privilege('hr_eval_app', 'dbo.users', 'INSERT');
SELECT has_table_privilege('hr_eval_app', 'dbo.users', 'UPDATE');
SELECT has_table_privilege('hr_eval_app', 'dbo.users', 'DELETE');

-- Check sequence permissions
SELECT has_sequence_privilege('hr_eval_app', 'dbo.users_id_seq', 'USAGE');

-- Check function permissions
SELECT has_function_privilege('hr_eval_app', 'dbo.validate_password_strength(text)', 'EXECUTE');
*/

-- =============================================================================
-- VERIFICATION SUMMARY
-- =============================================================================

DO $
DECLARE
    table_grants integer;
    schema_usage boolean;
    db_connect boolean;
    table_count integer;
    function_count integer;
BEGIN
    -- Count table grants
    SELECT COUNT(*) INTO table_grants
    FROM information_schema.role_table_grants 
    WHERE grantee = 'hr_eval_app' AND table_schema = 'dbo';
    
    -- Check schema and database permissions
    schema_usage := has_schema_privilege('hr_eval_app', 'dbo', 'USAGE');
    db_connect := has_database_privilege('hr_eval_app', current_database(), 'CONNECT');
    
    -- Count objects
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'dbo';
    
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_schema = 'dbo';
    
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'POSTGRESQL 18 PERMISSION VERIFICATION';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Database CONNECT: %', CASE WHEN db_connect THEN 'GRANTED ✓' ELSE 'DENIED ✗' END;
    RAISE NOTICE 'Schema USAGE: %', CASE WHEN schema_usage THEN 'GRANTED ✓' ELSE 'DENIED ✗' END;
    RAISE NOTICE 'Table grants: %', table_grants;
    RAISE NOTICE 'Tables in dbo: %', table_count;
    RAISE NOTICE 'Functions in dbo: %', function_count;
    RAISE NOTICE '==============================================';
    
    IF db_connect AND schema_usage AND table_grants > 0 THEN
        RAISE NOTICE 'PERMISSION STATUS: CONFIGURED CORRECTLY ✓';
    ELSE
        RAISE WARNING 'PERMISSION STATUS: NEEDS ATTENTION ✗';
        RAISE WARNING 'Run: psql -U postgres -f DB/fix_permissions.sql';
    END IF;
    
    RAISE NOTICE '==============================================';
END
$;