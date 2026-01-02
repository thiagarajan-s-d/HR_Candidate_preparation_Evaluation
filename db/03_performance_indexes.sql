-- HR Candidate Evaluation System - Performance Optimization Script (PostgreSQL 18)
-- This script adds additional indexes and optimizations for better performance
-- Run this script after the main schema creation

-- =============================================================================
-- POSTGRESQL 18 COMPATIBILITY CHECK
-- =============================================================================

DO $
DECLARE
    version_num integer;
    major_version integer;
BEGIN
    SELECT current_setting('server_version_num')::integer INTO version_num;
    major_version := version_num / 10000;
    
    IF major_version >= 18 THEN
        RAISE NOTICE 'PostgreSQL 18+ detected - using optimized features ✓';
    ELSE
        RAISE NOTICE 'PostgreSQL % detected - using compatible features', major_version;
    END IF;
END
$;

-- =============================================================================
-- IMMUTABLE HELPER FUNCTIONS FOR INDEXES
-- =============================================================================

-- Note: PostgreSQL requires IMMUTABLE functions for index predicates
-- Using now() in WHERE clauses of indexes is not allowed
-- Instead, we'll create indexes without time-based predicates and rely on query optimization

-- =============================================================================
-- ADDITIONAL PERFORMANCE INDEXES (PostgreSQL 18 Compatible)
-- =============================================================================

-- Additional indexes for better query optimization (PostgreSQL 18 compatible)
-- Note: Removed now() from WHERE clauses as it's not IMMUTABLE
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON dbo.user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_candidate_email_status ON dbo.invitations(candidate_email, status);
CREATE INDEX IF NOT EXISTS idx_invitations_created_at_desc ON dbo.invitations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON dbo.user_sessions(expires_at);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_expires ON dbo.user_sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_requestor_status ON dbo.invitations(requestor_id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_email_name ON dbo.profiles(email, name);

-- Partial indexes for frequently accessed data (using IMMUTABLE conditions)
CREATE INDEX IF NOT EXISTS idx_active_user_sessions ON dbo.user_sessions(user_id, token, expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_full ON dbo.invitations(id, candidate_email, expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_completed_invitations ON dbo.invitations(requestor_id, created_at) WHERE status = 'completed';

-- Text search indexes for invitation content (PostgreSQL 18 optimized)
CREATE INDEX IF NOT EXISTS idx_invitations_role_gin ON dbo.invitations USING gin(to_tsvector('english', role));
CREATE INDEX IF NOT EXISTS idx_invitations_company_gin ON dbo.invitations USING gin(to_tsvector('english', company));

-- JSON indexes for skills and question types (PostgreSQL 18 optimized)
CREATE INDEX IF NOT EXISTS idx_invitations_skills_gin ON dbo.invitations USING gin(skills);
CREATE INDEX IF NOT EXISTS idx_invitations_question_types_gin ON dbo.invitations USING gin(question_types);

-- PostgreSQL 18 specific: Advanced JSONB indexes with path operations
CREATE INDEX IF NOT EXISTS idx_invitations_skills_path_ops ON dbo.invitations USING gin(skills jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_invitations_question_types_path_ops ON dbo.invitations USING gin(question_types jsonb_path_ops);

-- =============================================================================
-- PERFORMANCE MONITORING FUNCTIONS (PostgreSQL 18 Compatible)
-- =============================================================================

-- Function to analyze query performance (PostgreSQL 18 compatible)
CREATE OR REPLACE FUNCTION dbo.analyze_query_performance()
RETURNS TABLE(
    query_text text,
    calls bigint,
    total_time double precision,
    mean_time double precision,
    rows bigint,
    hit_percent double precision
) AS $
BEGIN
    -- Check if pg_stat_statements is available
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
        RAISE NOTICE 'pg_stat_statements extension is not installed. Install it for detailed query performance analysis.';
        RETURN;
    END IF;
    
    -- PostgreSQL 18 compatible query
    RETURN QUERY
    SELECT 
        pss.query,
        pss.calls,
        pss.total_exec_time,
        pss.mean_exec_time,
        pss.rows,
        CASE 
            WHEN (pss.shared_blks_hit + pss.shared_blks_read) = 0 THEN 0
            ELSE (pss.shared_blks_hit::double precision / 
                  (pss.shared_blks_hit + pss.shared_blks_read)) * 100
        END as hit_percent
    FROM pg_stat_statements pss
    WHERE pss.dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
    ORDER BY pss.mean_exec_time DESC
    LIMIT 20;
END;
$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION dbo.analyze_query_performance() IS 'Analyzes query performance using pg_stat_statements (PostgreSQL 18 compatible)';

-- Function to get table sizes and index usage (PostgreSQL 18 compatible)
CREATE OR REPLACE FUNCTION dbo.analyze_table_performance()
RETURNS TABLE(
    table_name text,
    table_size text,
    index_size text,
    total_size text,
    seq_scan bigint,
    seq_tup_read bigint,
    idx_scan bigint,
    idx_tup_fetch bigint,
    n_tup_ins bigint,
    n_tup_upd bigint,
    n_tup_del bigint
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        t.table_schema||'.'||t.table_name as table_name,
        pg_size_pretty(pg_total_relation_size(t.table_schema||'.'||t.table_name)) as table_size,
        pg_size_pretty(pg_indexes_size(t.table_schema||'.'||t.table_name)) as index_size,
        pg_size_pretty(pg_total_relation_size(t.table_schema||'.'||t.table_name) + 
                      pg_indexes_size(t.table_schema||'.'||t.table_name)) as total_size,
        COALESCE(s.seq_scan, 0),
        COALESCE(s.seq_tup_read, 0),
        COALESCE(s.idx_scan, 0),
        COALESCE(s.idx_tup_fetch, 0),
        COALESCE(s.n_tup_ins, 0),
        COALESCE(s.n_tup_upd, 0),
        COALESCE(s.n_tup_del, 0)
    FROM information_schema.tables t
    LEFT JOIN pg_stat_user_tables s ON t.table_name = s.relname AND t.table_schema = s.schemaname
    WHERE t.table_schema = 'dbo'
    ORDER BY pg_total_relation_size(t.table_schema||'.'||t.table_name) DESC;
END;
$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION dbo.analyze_table_performance() IS 'Analyzes table sizes and access patterns (PostgreSQL 18 compatible)';

-- Function to get index usage statistics (PostgreSQL 18 compatible)
CREATE OR REPLACE FUNCTION dbo.analyze_index_usage()
RETURNS TABLE(
    schemaname text,
    tablename text,
    indexname text,
    idx_scan bigint,
    idx_tup_read bigint,
    idx_tup_fetch bigint,
    index_size text,
    usage_ratio numeric
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        i.schemaname,
        i.tablename,
        i.indexname,
        i.idx_scan,
        i.idx_tup_read,
        i.idx_tup_fetch,
        pg_size_pretty(pg_relation_size(i.schemaname||'.'||i.indexname)) as index_size,
        CASE 
            WHEN t.seq_scan + i.idx_scan = 0 THEN 0
            ELSE ROUND((i.idx_scan::numeric / (t.seq_scan + i.idx_scan)) * 100, 2)
        END as usage_ratio
    FROM pg_stat_user_indexes i
    JOIN pg_stat_user_tables t ON i.relid = t.relid
    WHERE i.schemaname = 'dbo'
    ORDER BY i.idx_scan DESC;
END;
$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION dbo.analyze_index_usage() IS 'Analyzes index usage patterns and effectiveness (PostgreSQL 18 compatible)';

-- =============================================================================
-- OPTIMIZED SESSION CLEANUP FUNCTION (PostgreSQL 18)
-- =============================================================================

-- Enhanced session cleanup function with PostgreSQL 18 optimizations
CREATE OR REPLACE FUNCTION dbo.clean_expired_sessions_optimized()
RETURNS TABLE(deleted_count bigint, execution_time interval) AS $
DECLARE
    deleted_rows bigint := 0;
    batch_size integer := 1000;
    total_deleted bigint := 0;
    start_time timestamptz;
    end_time timestamptz;
BEGIN
    start_time := clock_timestamp();
    
    -- Delete expired sessions in batches to avoid long locks
    LOOP
        DELETE FROM dbo.user_sessions 
        WHERE id IN (
            SELECT id FROM dbo.user_sessions 
            WHERE expires_at < now() - interval '1 hour'
            LIMIT batch_size
        );
        
        GET DIAGNOSTICS deleted_rows = ROW_COUNT;
        total_deleted := total_deleted + deleted_rows;
        
        -- Exit if no more rows to delete
        EXIT WHEN deleted_rows = 0;
        
        -- Small delay between batches to reduce lock contention
        PERFORM pg_sleep(0.1);
    END LOOP;
    
    end_time := clock_timestamp();
    
    -- Log cleanup activity
    BEGIN
        INSERT INTO dbo.cleanup_log (table_name, deleted_count, cleanup_time)
        VALUES ('user_sessions_optimized', total_deleted, now());
    EXCEPTION
        WHEN OTHERS THEN
            -- Continue even if logging fails
            NULL;
    END;
    
    RETURN QUERY SELECT total_deleted, (end_time - start_time);
END;
$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION dbo.clean_expired_sessions_optimized() IS 'Optimized batch cleanup of expired sessions with performance tracking (PostgreSQL 18)';

-- =============================================================================
-- MAINTENANCE FUNCTIONS (PostgreSQL 18 Compatible)
-- =============================================================================

-- Function to update table statistics (PostgreSQL 18 compatible)
CREATE OR REPLACE FUNCTION dbo.update_table_statistics()
RETURNS TABLE(table_name text, analyze_time interval) AS $
DECLARE
    tbl record;
    start_time timestamptz;
    end_time timestamptz;
BEGIN
    FOR tbl IN 
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'dbo'
    LOOP
        start_time := clock_timestamp();
        
        EXECUTE format('ANALYZE %I.%I', tbl.table_schema, tbl.table_name);
        
        end_time := clock_timestamp();
        
        RETURN QUERY SELECT 
            tbl.table_schema||'.'||tbl.table_name,
            (end_time - start_time);
    END LOOP;
END;
$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION dbo.update_table_statistics() IS 'Updates statistics for all tables in dbo schema (PostgreSQL 18 compatible)';

-- Function to reindex tables if needed (PostgreSQL 18 compatible)
CREATE OR REPLACE FUNCTION dbo.reindex_if_needed(bloat_threshold numeric DEFAULT 20.0)
RETURNS TABLE(table_name text, action_taken text) AS $
DECLARE
    tbl record;
    bloat_ratio numeric;
BEGIN
    FOR tbl IN 
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'dbo'
    LOOP
        -- Simple bloat estimation using pg_stat_user_tables
        SELECT 
            CASE 
                WHEN pg_stat_user_tables.n_dead_tup > 0 THEN
                    (pg_stat_user_tables.n_dead_tup::numeric / 
                     GREATEST(pg_stat_user_tables.n_live_tup, 1)) * 100
                ELSE 0
            END INTO bloat_ratio
        FROM pg_stat_user_tables 
        WHERE relname = tbl.table_name AND schemaname = tbl.table_schema;
        
        IF bloat_ratio > bloat_threshold THEN
            EXECUTE format('REINDEX TABLE %I.%I', tbl.table_schema, tbl.table_name);
            RETURN QUERY SELECT 
                tbl.table_schema||'.'||tbl.table_name,
                format('REINDEXED (bloat: %s%%)', ROUND(bloat_ratio, 2));
        ELSE
            RETURN QUERY SELECT 
                tbl.table_schema||'.'||tbl.table_name,
                format('OK (bloat: %s%%)', ROUND(COALESCE(bloat_ratio, 0), 2));
        END IF;
    END LOOP;
END;
$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION dbo.reindex_if_needed(numeric) IS 'Reindexes tables if bloat exceeds threshold (PostgreSQL 18 compatible)';

-- =============================================================================
-- PERFORMANCE MONITORING VIEWS (PostgreSQL 18 Compatible)
-- =============================================================================

-- View for connection statistics
CREATE OR REPLACE VIEW dbo.connection_stats AS
SELECT 
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_connections,
    count(*) FILTER (WHERE state = 'idle') as idle_connections,
    count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
    count(*) FILTER (WHERE state = 'idle in transaction (aborted)') as idle_in_transaction_aborted,
    count(*) FILTER (WHERE backend_type = 'client backend') as client_backends,
    max(backend_start) as oldest_connection,
    avg(EXTRACT(EPOCH FROM (now() - backend_start))) as avg_connection_age_seconds
FROM pg_stat_activity
WHERE datname = current_database();

-- Add comment to view
COMMENT ON VIEW dbo.connection_stats IS 'Current database connection statistics (PostgreSQL 18 compatible)';

-- View for lock statistics
CREATE OR REPLACE VIEW dbo.lock_stats AS
SELECT 
    mode,
    locktype,
    count(*) as lock_count,
    count(*) FILTER (WHERE granted = false) as waiting_locks
FROM pg_locks 
WHERE database = (SELECT oid FROM pg_database WHERE datname = current_database())
GROUP BY mode, locktype
ORDER BY lock_count DESC;

-- Add comment to view
COMMENT ON VIEW dbo.lock_stats IS 'Current database lock statistics (PostgreSQL 18 compatible)';

-- View for slow queries (requires pg_stat_statements, PostgreSQL 18 compatible)
CREATE OR REPLACE VIEW dbo.slow_queries AS
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE pg_stat_statements.dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
AND mean_exec_time > 100  -- Only queries slower than 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Add comment to view
COMMENT ON VIEW dbo.slow_queries IS 'Slowest queries in the database (requires pg_stat_statements, PostgreSQL 18 compatible)';

-- =============================================================================
-- VACUUM AND ANALYZE OPTIMIZATION (PostgreSQL 18)
-- =============================================================================

-- Vacuum and analyze all tables with performance tracking (PostgreSQL 18 compatible)
CREATE OR REPLACE FUNCTION dbo.maintenance_vacuum_analyze()
RETURNS TABLE(
    table_name text, 
    vacuum_time interval, 
    analyze_time interval,
    pages_removed bigint,
    tuples_removed bigint
) AS $
DECLARE
    tbl record;
    start_time timestamptz;
    vacuum_end_time timestamptz;
    analyze_end_time timestamptz;
    vacuum_stats record;
BEGIN
    FOR tbl IN 
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'dbo'
        ORDER BY pg_total_relation_size(table_schema||'.'||table_name) DESC
    LOOP
        -- Get pre-vacuum stats
        SELECT n_dead_tup INTO vacuum_stats
        FROM pg_stat_user_tables 
        WHERE relname = tbl.table_name AND schemaname = tbl.table_schema;
        
        start_time := clock_timestamp();
        
        -- Vacuum with PostgreSQL 18 optimizations
        EXECUTE format('VACUUM (VERBOSE, ANALYZE) %I.%I', tbl.table_schema, tbl.table_name);
        vacuum_end_time := clock_timestamp();
        
        -- Analyze (included in VACUUM ANALYZE above, but timing separately)
        analyze_end_time := vacuum_end_time;
        
        RETURN QUERY SELECT 
            tbl.table_schema||'.'||tbl.table_name,
            (vacuum_end_time - start_time),
            (analyze_end_time - vacuum_end_time),
            0::bigint, -- pages_removed (would need to parse VACUUM output)
            COALESCE(vacuum_stats.n_dead_tup, 0)::bigint; -- approximate tuples cleaned
    END LOOP;
END;
$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION dbo.maintenance_vacuum_analyze() IS 'Performs VACUUM and ANALYZE on all tables with timing (PostgreSQL 18 compatible)';

-- =============================================================================
-- POSTGRESQL 18 SPECIFIC OPTIMIZATIONS
-- =============================================================================

-- Function to enable PostgreSQL 18 specific features
CREATE OR REPLACE FUNCTION dbo.enable_pg18_features()
RETURNS text AS $
DECLARE
    version_num integer;
    major_version integer;
    result_text text := '';
BEGIN
    SELECT current_setting('server_version_num')::integer INTO version_num;
    major_version := version_num / 10000;
    
    IF major_version >= 18 THEN
        result_text := result_text || 'PostgreSQL 18 features enabled:' || E'\n';
        
        -- Enable parallel workers for maintenance operations
        PERFORM set_config('max_parallel_maintenance_workers', '4', false);
        result_text := result_text || '- Parallel maintenance workers: 4' || E'\n';
        
        -- Enable parallel workers for queries
        PERFORM set_config('max_parallel_workers_per_gather', '2', false);
        result_text := result_text || '- Parallel workers per gather: 2' || E'\n';
        
        -- Optimize work memory for complex queries
        PERFORM set_config('work_mem', '8MB', false);
        result_text := result_text || '- Work memory optimized: 8MB' || E'\n';
        
        result_text := result_text || 'All PostgreSQL 18 optimizations applied ✓';
    ELSE
        result_text := 'PostgreSQL ' || major_version || ' detected. Some optimizations may not be available.';
    END IF;
    
    RETURN result_text;
END;
$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION dbo.enable_pg18_features() IS 'Enables PostgreSQL 18 specific performance features';

-- =============================================================================
-- USAGE EXAMPLES AND MONITORING QUERIES
-- =============================================================================

/*
-- PostgreSQL 18 Performance monitoring queries:

-- 1. Enable PostgreSQL 18 features
SELECT dbo.enable_pg18_features();

-- 2. Check query performance (requires pg_stat_statements)
SELECT * FROM dbo.analyze_query_performance();

-- 3. Check table sizes and access patterns
SELECT * FROM dbo.analyze_table_performance();

-- 4. Check index usage
SELECT * FROM dbo.analyze_index_usage();

-- 5. Check connection statistics
SELECT * FROM dbo.connection_stats;

-- 6. Check for locks
SELECT * FROM dbo.lock_stats;

-- 7. Check slow queries
SELECT * FROM dbo.slow_queries;

-- 8. Update table statistics
SELECT * FROM dbo.update_table_statistics();

-- 9. Clean expired sessions with performance tracking
SELECT * FROM dbo.clean_expired_sessions_optimized();

-- 10. Check if reindexing is needed
SELECT * FROM dbo.reindex_if_needed(20.0);

-- 11. Perform maintenance vacuum and analyze
SELECT * FROM dbo.maintenance_vacuum_analyze();

-- PostgreSQL 18 specific monitoring:

-- Check parallel query usage
SELECT 
    query,
    calls,
    mean_exec_time,
    parallel_workers_launched
FROM pg_stat_statements 
WHERE parallel_workers_launched > 0
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check JSONB performance with new indexes
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM dbo.invitations 
WHERE skills @> '["React"]'::jsonb;

-- Monitor index usage on JSONB fields
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) as size
FROM pg_stat_user_indexes 
WHERE schemaname = 'dbo' 
AND indexname LIKE '%gin%'
ORDER BY idx_scan DESC;
*/

RAISE NOTICE 'PostgreSQL 18 performance optimizations completed successfully ✓';