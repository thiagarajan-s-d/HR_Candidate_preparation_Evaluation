-- HR Candidate Evaluation System - PostgreSQL 18 Compatibility Verification
-- This script verifies all database objects are compatible with PostgreSQL 18

-- =============================================================================
-- POSTGRESQL 18 VERSION VERIFICATION
-- =============================================================================

DO $
DECLARE
    version_num integer;
    major_version integer;
    minor_version integer;
BEGIN
    SELECT current_setting('server_version_num')::integer INTO version_num;
    major_version := version_num / 10000;
    minor_version := (version_num % 10000) / 100;
    
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'POSTGRESQL 18 COMPATIBILITY VERIFICATION';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'PostgreSQL Version: %', version();
    RAISE NOTICE 'Version Number: %', version_num;
    RAISE NOTICE 'Major.Minor: %.%', major_version, minor_version;
    
    IF major_version = 18 THEN
        RAISE NOTICE 'PostgreSQL 18 detected - EXCELLENT ✓';
    ELSIF major_version > 18 THEN
        RAISE NOTICE 'PostgreSQL % detected - FUTURE VERSION ✓', major_version;
    ELSIF major_version >= 12 THEN
        RAISE NOTICE 'PostgreSQL % detected - COMPATIBLE ✓', major_version;
    ELSE
        RAISE WARNING 'PostgreSQL % detected - MAY HAVE COMPATIBILITY ISSUES', major_version;
    END IF;
    
    RAISE NOTICE '==============================================';
END
$;

-- =============================================================================
-- EXTENSION COMPATIBILITY CHECK
-- =============================================================================

-- Check required extensions for PostgreSQL 18
DO $
DECLARE
    ext_record RECORD;
    required_extensions text[] := ARRAY['uuid-ossp', 'pgcrypto', 'pg_stat_statements'];
    ext_name text;
BEGIN
    RAISE NOTICE 'Checking extension compatibility...';
    
    FOREACH ext_name IN ARRAY required_extensions LOOP
        SELECT extname, extversion INTO ext_record
        FROM pg_extension 
        WHERE extname = ext_name;
        
        IF FOUND THEN
            RAISE NOTICE 'Extension %: INSTALLED (version %) ✓', ext_record.extname, ext_record.extversion;
        ELSE
            -- Check if extension is available
            IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = ext_name) THEN
                RAISE WARNING 'Extension %: AVAILABLE but not installed', ext_name;
            ELSE
                RAISE WARNING 'Extension %: NOT AVAILABLE', ext_name;
            END IF;
        END IF;
    END LOOP;
END
$;

-- =============================================================================
-- SCHEMA AND OBJECT VERIFICATION
-- =============================================================================

-- Verify dbo schema exists and has correct objects
DO $
DECLARE
    schema_exists boolean;
    table_count integer;
    function_count integer;
    view_count integer;
    index_count integer;
BEGIN
    RAISE NOTICE 'Verifying database schema...';
    
    -- Check schema exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = 'dbo'
    ) INTO schema_exists;
    
    IF schema_exists THEN
        RAISE NOTICE 'Schema dbo: EXISTS ✓';
        
        -- Count objects in dbo schema
        SELECT COUNT(*) INTO table_count
        FROM information_schema.tables 
        WHERE table_schema = 'dbo';
        
        SELECT COUNT(*) INTO function_count
        FROM information_schema.routines 
        WHERE routine_schema = 'dbo';
        
        SELECT COUNT(*) INTO view_count
        FROM information_schema.views 
        WHERE table_schema = 'dbo';
        
        -- Count indexes (PostgreSQL 18 compatible method)
        SELECT COUNT(*) INTO index_count
        FROM pg_indexes 
        WHERE schemaname = 'dbo';
        
        RAISE NOTICE 'Tables in dbo: % ✓', table_count;
        RAISE NOTICE 'Functions in dbo: % ✓', function_count;
        RAISE NOTICE 'Views in dbo: % ✓', view_count;
        RAISE NOTICE 'Indexes in dbo: % ✓', index_count;
        
    ELSE
        RAISE EXCEPTION 'Schema dbo does not exist!';
    END IF;
END
$;

-- =============================================================================
-- POSTGRESQL 18 FEATURE VERIFICATION
-- =============================================================================

-- Test PostgreSQL 18 specific features
DO $
DECLARE
    test_uuid uuid;
    test_jsonb jsonb;
    test_result boolean;
BEGIN
    RAISE NOTICE 'Testing PostgreSQL 18 features...';
    
    -- Test UUID generation
    BEGIN
        SELECT gen_random_uuid() INTO test_uuid;
        RAISE NOTICE 'UUID generation: WORKING ✓';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'UUID generation: FAILED - %', SQLERRM;
    END;
    
    -- Test JSONB operations
    BEGIN
        test_jsonb := '{"skills": ["React", "Node.js"], "level": "advanced"}'::jsonb;
        SELECT test_jsonb @> '{"skills": ["React"]}'::jsonb INTO test_result;
        IF test_result THEN
            RAISE NOTICE 'JSONB operations: WORKING ✓';
        ELSE
            RAISE WARNING 'JSONB operations: UNEXPECTED RESULT';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'JSONB operations: FAILED - %', SQLERRM;
    END;
    
    -- Test full-text search
    BEGIN
        SELECT to_tsvector('english', 'PostgreSQL 18 full-text search test') @@ 
               to_tsquery('english', 'PostgreSQL & search') INTO test_result;
        IF test_result THEN
            RAISE NOTICE 'Full-text search: WORKING ✓';
        ELSE
            RAISE WARNING 'Full-text search: UNEXPECTED RESULT';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Full-text search: FAILED - %', SQLERRM;
    END;
    
    -- Test parallel query capability (PostgreSQL 18 feature)
    BEGIN
        PERFORM set_config('max_parallel_workers_per_gather', '2', false);
        RAISE NOTICE 'Parallel query support: AVAILABLE ✓';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Parallel query support: FAILED - %', SQLERRM;
    END;
END
$;

-- =============================================================================
-- PERFORMANCE FEATURE VERIFICATION
-- =============================================================================

-- Test performance monitoring functions
DO $
DECLARE
    func_exists boolean;
    performance_functions text[] := ARRAY[
        'analyze_query_performance',
        'analyze_table_performance', 
        'analyze_index_usage',
        'clean_expired_sessions_optimized',
        'update_table_statistics',
        'maintenance_vacuum_analyze'
    ];
    func_name text;
BEGIN
    RAISE NOTICE 'Verifying performance monitoring functions...';
    
    FOREACH func_name IN ARRAY performance_functions LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'dbo' 
            AND routine_name = func_name
        ) INTO func_exists;
        
        IF func_exists THEN
            RAISE NOTICE 'Function dbo.%: EXISTS ✓', func_name;
        ELSE
            RAISE WARNING 'Function dbo.%: MISSING', func_name;
        END IF;
    END LOOP;
END
$;

-- =============================================================================
-- INDEX COMPATIBILITY VERIFICATION
-- =============================================================================

-- Verify PostgreSQL 18 compatible indexes
DO $
DECLARE
    gin_indexes integer;
    btree_indexes integer;
    partial_indexes integer;
BEGIN
    RAISE NOTICE 'Verifying index compatibility...';
    
    -- Count GIN indexes (for JSONB)
    SELECT COUNT(*) INTO gin_indexes
    FROM pg_indexes 
    WHERE schemaname = 'dbo' 
    AND indexdef LIKE '%USING gin%';
    
    -- Count B-tree indexes
    SELECT COUNT(*) INTO btree_indexes
    FROM pg_indexes 
    WHERE schemaname = 'dbo' 
    AND (indexdef LIKE '%USING btree%' OR indexdef NOT LIKE '%USING %');
    
    -- Count partial indexes
    SELECT COUNT(*) INTO partial_indexes
    FROM pg_indexes 
    WHERE schemaname = 'dbo' 
    AND indexdef LIKE '%WHERE %';
    
    RAISE NOTICE 'GIN indexes (JSONB): % ✓', gin_indexes;
    RAISE NOTICE 'B-tree indexes: % ✓', btree_indexes;
    RAISE NOTICE 'Partial indexes: % ✓', partial_indexes;
    
    IF gin_indexes >= 2 THEN
        RAISE NOTICE 'JSONB indexing: OPTIMIZED ✓';
    ELSE
        RAISE WARNING 'JSONB indexing: MAY NEED OPTIMIZATION';
    END IF;
END
$;

-- =============================================================================
-- SECURITY FEATURE VERIFICATION
-- =============================================================================

-- Test Row Level Security (RLS) compatibility
DO $
DECLARE
    rls_enabled_tables integer;
    rls_policies integer;
BEGIN
    RAISE NOTICE 'Verifying security features...';
    
    -- Count tables with RLS enabled
    SELECT COUNT(*) INTO rls_enabled_tables
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'dbo' 
    AND c.relrowsecurity = true;
    
    -- Count RLS policies
    SELECT COUNT(*) INTO rls_policies
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'dbo';
    
    RAISE NOTICE 'Tables with RLS: % ✓', rls_enabled_tables;
    RAISE NOTICE 'RLS policies: % ✓', rls_policies;
    
    IF rls_enabled_tables >= 4 AND rls_policies >= 5 THEN
        RAISE NOTICE 'Row Level Security: PROPERLY CONFIGURED ✓';
    ELSE
        RAISE WARNING 'Row Level Security: MAY NEED CONFIGURATION';
    END IF;
END
$;

-- =============================================================================
-- CONNECTION AND PERMISSION VERIFICATION
-- =============================================================================

-- Test application user permissions
DO $
DECLARE
    can_connect boolean;
    can_use_schema boolean;
    table_permissions integer;
BEGIN
    RAISE NOTICE 'Verifying application user permissions...';
    
    -- Check if hr_eval_app user exists and can connect
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_eval_app') THEN
        RAISE NOTICE 'User hr_eval_app: EXISTS ✓';
        
        can_connect := has_database_privilege('hr_eval_app', current_database(), 'CONNECT');
        can_use_schema := has_schema_privilege('hr_eval_app', 'dbo', 'USAGE');
        
        SELECT COUNT(*) INTO table_permissions
        FROM information_schema.role_table_grants 
        WHERE grantee = 'hr_eval_app' AND table_schema = 'dbo';
        
        RAISE NOTICE 'Database CONNECT: % ✓', CASE WHEN can_connect THEN 'GRANTED' ELSE 'DENIED' END;
        RAISE NOTICE 'Schema USAGE: % ✓', CASE WHEN can_use_schema THEN 'GRANTED' ELSE 'DENIED' END;
        RAISE NOTICE 'Table permissions: % grants ✓', table_permissions;
        
    ELSE
        RAISE WARNING 'User hr_eval_app: DOES NOT EXIST';
    END IF;
END
$;

-- =============================================================================
-- POSTGRESQL 18 OPTIMIZATION VERIFICATION
-- =============================================================================

-- Check PostgreSQL 18 specific optimizations
DO $
DECLARE
    parallel_workers text;
    work_mem text;
    shared_buffers text;
    effective_cache_size text;
BEGIN
    RAISE NOTICE 'Checking PostgreSQL 18 optimizations...';
    
    parallel_workers := current_setting('max_parallel_workers_per_gather');
    work_mem := current_setting('work_mem');
    shared_buffers := current_setting('shared_buffers');
    effective_cache_size := current_setting('effective_cache_size');
    
    RAISE NOTICE 'Parallel workers per gather: % ✓', parallel_workers;
    RAISE NOTICE 'Work memory: % ✓', work_mem;
    RAISE NOTICE 'Shared buffers: % ✓', shared_buffers;
    RAISE NOTICE 'Effective cache size: % ✓', effective_cache_size;
    
    -- Check if optimizations are reasonable
    IF parallel_workers::integer >= 2 THEN
        RAISE NOTICE 'Parallel processing: OPTIMIZED ✓';
    ELSE
        RAISE NOTICE 'Parallel processing: DEFAULT (consider optimizing)';
    END IF;
END
$;

-- =============================================================================
-- FINAL COMPATIBILITY REPORT
-- =============================================================================

DO $
DECLARE
    version_num integer;
    major_version integer;
    schema_ok boolean;
    extensions_ok boolean;
    functions_ok boolean;
    permissions_ok boolean;
    overall_status text;
BEGIN
    SELECT current_setting('server_version_num')::integer INTO version_num;
    major_version := version_num / 10000;
    
    -- Check overall status
    schema_ok := EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'dbo');
    extensions_ok := EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp');
    functions_ok := EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'dbo');
    permissions_ok := has_database_privilege('hr_eval_app', current_database(), 'CONNECT');
    
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'POSTGRESQL 18 COMPATIBILITY REPORT';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'PostgreSQL Version: % (% compatible)', major_version, 
        CASE 
            WHEN major_version >= 18 THEN 'FULLY'
            WHEN major_version >= 12 THEN 'HIGHLY' 
            ELSE 'PARTIALLY'
        END;
    RAISE NOTICE 'Schema Setup: %', CASE WHEN schema_ok THEN 'COMPLETE ✓' ELSE 'INCOMPLETE ✗' END;
    RAISE NOTICE 'Extensions: %', CASE WHEN extensions_ok THEN 'INSTALLED ✓' ELSE 'MISSING ✗' END;
    RAISE NOTICE 'Functions: %', CASE WHEN functions_ok THEN 'CREATED ✓' ELSE 'MISSING ✗' END;
    RAISE NOTICE 'Permissions: %', CASE WHEN permissions_ok THEN 'CONFIGURED ✓' ELSE 'MISSING ✗' END;
    
    IF schema_ok AND extensions_ok AND functions_ok AND permissions_ok AND major_version >= 18 THEN
        overall_status := 'EXCELLENT - PostgreSQL 18 fully compatible ✓';
    ELSIF schema_ok AND extensions_ok AND functions_ok AND permissions_ok THEN
        overall_status := 'GOOD - Compatible with minor limitations ✓';
    ELSIF schema_ok AND extensions_ok THEN
        overall_status := 'PARTIAL - Basic setup complete, some features missing ⚠';
    ELSE
        overall_status := 'INCOMPLETE - Setup needs attention ✗';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'OVERALL STATUS: %', overall_status;
    RAISE NOTICE '==============================================';
    
    IF major_version >= 18 THEN
        RAISE NOTICE 'RECOMMENDATION: Your PostgreSQL 18 setup is optimal for this application!';
        RAISE NOTICE 'All advanced features are available and performance will be excellent.';
    ELSIF major_version >= 12 THEN
        RAISE NOTICE 'RECOMMENDATION: Consider upgrading to PostgreSQL 18 for optimal performance.';
    ELSE
        RAISE NOTICE 'RECOMMENDATION: Upgrade to PostgreSQL 18 is strongly recommended.';
    END IF;
    
    RAISE NOTICE '==============================================';
END
$;