-- HR Candidate Evaluation System - Schema Creation Script
-- This script creates all tables, functions, triggers, and initial data
-- Run this script after connecting to the hr_candidate_eval database

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

-- Enable UUID extension for generating unique identifiers
-- PostgreSQL 18 has built-in UUID support, but we'll ensure compatibility
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for additional cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable pg_stat_statements for query performance monitoring
-- Note: This requires superuser privileges and postgresql.conf configuration
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =============================================================================
-- TABLES
-- =============================================================================

-- Users table (replaces Supabase auth.users)
CREATE TABLE IF NOT EXISTS dbo.users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    email_verified boolean DEFAULT false,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_password_hash_check CHECK (length(password_hash) > 0)
);

-- Add comments to users table
COMMENT ON TABLE dbo.users IS 'User authentication and account information';
COMMENT ON COLUMN dbo.users.id IS 'Unique user identifier (UUID)';
COMMENT ON COLUMN dbo.users.email IS 'User email address (unique)';
COMMENT ON COLUMN dbo.users.password_hash IS 'bcrypt hashed password';
COMMENT ON COLUMN dbo.users.email_verified IS 'Email verification status';
COMMENT ON COLUMN dbo.users.raw_user_meta_data IS 'Additional user metadata (JSON)';

-- Profiles table for extended user information
CREATE TABLE IF NOT EXISTS dbo.profiles (
    id uuid REFERENCES dbo.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text UNIQUE NOT NULL,
    name text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Constraints
    CONSTRAINT profiles_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT profiles_name_check CHECK (length(trim(name)) > 0 OR name IS NULL)
);

-- Add comments to profiles table
COMMENT ON TABLE dbo.profiles IS 'Extended user profile information';
COMMENT ON COLUMN dbo.profiles.id IS 'References users.id';
COMMENT ON COLUMN dbo.profiles.email IS 'User email (synchronized with users table)';
COMMENT ON COLUMN dbo.profiles.name IS 'User display name';

-- User sessions table for authentication tokens
CREATE TABLE IF NOT EXISTS dbo.user_sessions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES dbo.users(id) ON DELETE CASCADE NOT NULL,
    token text UNIQUE NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now(),
    
    -- Constraints
    CONSTRAINT user_sessions_token_check CHECK (length(token) >= 32),
    CONSTRAINT user_sessions_expires_check CHECK (expires_at > created_at)
);

-- Add comments to user_sessions table
COMMENT ON TABLE dbo.user_sessions IS 'User authentication sessions and tokens';
COMMENT ON COLUMN dbo.user_sessions.user_id IS 'References users.id';
COMMENT ON COLUMN dbo.user_sessions.token IS 'Unique session token';
COMMENT ON COLUMN dbo.user_sessions.expires_at IS 'Session expiration timestamp';

-- Invitations table for assessment invitations
CREATE TABLE IF NOT EXISTS dbo.invitations (
    id text PRIMARY KEY,
    requestor_id uuid REFERENCES dbo.users(id) ON DELETE CASCADE,
    requestor_name text NOT NULL,
    requestor_email text NOT NULL,
    candidate_email text NOT NULL,
    candidate_name text,
    role text NOT NULL,
    company text NOT NULL,
    skills jsonb NOT NULL,
    proficiency_level text NOT NULL,
    number_of_questions integer NOT NULL,
    question_types jsonb NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now(),
    status text DEFAULT 'pending',
    custom_message text,
    
    -- Constraints
    CONSTRAINT invitations_id_check CHECK (length(id) > 0),
    CONSTRAINT invitations_requestor_email_check CHECK (requestor_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT invitations_candidate_email_check CHECK (candidate_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT invitations_role_check CHECK (length(trim(role)) > 0),
    CONSTRAINT invitations_company_check CHECK (length(trim(company)) > 0),
    CONSTRAINT invitations_proficiency_check CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    CONSTRAINT invitations_questions_check CHECK (number_of_questions BETWEEN 5 AND 30),
    CONSTRAINT invitations_status_check CHECK (status IN ('pending', 'started', 'completed', 'expired')),
    CONSTRAINT invitations_expires_check CHECK (expires_at > created_at),
    CONSTRAINT invitations_skills_check CHECK (jsonb_array_length(skills) > 0),
    CONSTRAINT invitations_question_types_check CHECK (jsonb_array_length(question_types) > 0)
);

-- Add comments to invitations table
COMMENT ON TABLE dbo.invitations IS 'Assessment invitations sent to candidates';
COMMENT ON COLUMN dbo.invitations.id IS 'Unique invitation identifier';
COMMENT ON COLUMN dbo.invitations.requestor_id IS 'User who created the invitation';
COMMENT ON COLUMN dbo.invitations.skills IS 'Required skills (JSON array)';
COMMENT ON COLUMN dbo.invitations.question_types IS 'Question types (JSON array)';
COMMENT ON COLUMN dbo.invitations.proficiency_level IS 'Required proficiency level';
COMMENT ON COLUMN dbo.invitations.status IS 'Invitation status (pending/started/completed/expired)';

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON dbo.users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON dbo.users(created_at DESC);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON dbo.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_name ON dbo.profiles(name) WHERE name IS NOT NULL;

-- User sessions table indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON dbo.user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON dbo.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON dbo.user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON dbo.user_sessions(user_id, token) WHERE expires_at > now();

-- Invitations table indexes
CREATE INDEX IF NOT EXISTS idx_invitations_id ON dbo.invitations(id);
CREATE INDEX IF NOT EXISTS idx_invitations_requestor_id ON dbo.invitations(requestor_id);
CREATE INDEX IF NOT EXISTS idx_invitations_candidate_email ON dbo.invitations(candidate_email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON dbo.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON dbo.invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_created_at ON dbo.invitations(created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_expires ON dbo.user_sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_status_expires ON dbo.invitations(status, expires_at);

-- Partial indexes for active records (PostgreSQL 18 compatible)
CREATE INDEX IF NOT EXISTS idx_active_sessions ON dbo.user_sessions(user_id, token, expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_invitations ON dbo.invitations(id, candidate_email) WHERE status = 'pending';

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates updated_at column on row modification';

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION dbo.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO dbo.profiles (id, email, name, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', ''),
        NOW(),
        NOW()
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the user creation
        RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION dbo.handle_new_user() IS 'Automatically creates user profile when new user is created';

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION dbo.clean_expired_sessions()
RETURNS TABLE(deleted_count bigint) AS $$
DECLARE
    deleted_rows bigint;
BEGIN
    -- Delete expired sessions in batches to avoid long locks
    DELETE FROM dbo.user_sessions 
    WHERE expires_at < now() - interval '1 hour'
    AND id IN (
        SELECT id FROM dbo.user_sessions 
        WHERE expires_at < now() - interval '1 hour'
        LIMIT 1000
    );
    
    GET DIAGNOSTICS deleted_rows = ROW_COUNT;
    
    -- Log cleanup activity if cleanup log table exists
    BEGIN
        INSERT INTO dbo.cleanup_log (table_name, deleted_count, cleanup_time)
        VALUES ('user_sessions', deleted_rows, now());
    EXCEPTION
        WHEN undefined_table THEN
            -- Cleanup log table doesn't exist, skip logging
            NULL;
    END;
    
    RETURN QUERY SELECT deleted_rows;
END;
$$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION dbo.clean_expired_sessions() IS 'Removes expired user sessions and logs cleanup activity';

-- Function to expire old invitations
CREATE OR REPLACE FUNCTION dbo.expire_old_invitations()
RETURNS TABLE(expired_count bigint) AS $$
DECLARE
    expired_rows bigint;
BEGIN
    -- Update expired invitations
    UPDATE dbo.invitations 
    SET status = 'expired', updated_at = now()
    WHERE expires_at < now() 
    AND status IN ('pending', 'started');
    
    GET DIAGNOSTICS expired_rows = ROW_COUNT;
    
    -- Log cleanup activity if cleanup log table exists
    BEGIN
        INSERT INTO dbo.cleanup_log (table_name, deleted_count, cleanup_time)
        VALUES ('invitations_expired', expired_rows, now());
    EXCEPTION
        WHEN undefined_table THEN
            -- Cleanup log table doesn't exist, skip logging
            NULL;
    END;
    
    RETURN QUERY SELECT expired_rows;
END;
$$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION dbo.expire_old_invitations() IS 'Marks expired invitations and logs activity';

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger to update updated_at on users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON dbo.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on profiles table
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON dbo.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to create profile when user is created
CREATE TRIGGER on_user_created
    AFTER INSERT ON dbo.users
    FOR EACH ROW EXECUTE FUNCTION dbo.handle_new_user();

-- =============================================================================
-- VIEWS FOR MONITORING
-- =============================================================================

-- View for session statistics
CREATE OR REPLACE VIEW dbo.session_stats AS
SELECT 
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE expires_at > now()) as active_sessions,
    COUNT(*) FILTER (WHERE expires_at <= now()) as expired_sessions,
    AVG(EXTRACT(EPOCH FROM (expires_at - created_at))) as avg_session_duration_seconds,
    MIN(created_at) as oldest_session,
    MAX(created_at) as newest_session
FROM dbo.user_sessions;

-- Add comment to view
COMMENT ON VIEW dbo.session_stats IS 'Statistics about user sessions';

-- View for invitation statistics
CREATE OR REPLACE VIEW dbo.invitation_stats AS
SELECT 
    status,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (expires_at - created_at))) as avg_validity_duration_seconds,
    MIN(created_at) as oldest_invitation,
    MAX(created_at) as newest_invitation
FROM dbo.invitations
GROUP BY status
ORDER BY status;

-- Add comment to view
COMMENT ON VIEW dbo.invitation_stats IS 'Statistics about invitations by status';

-- View for user activity
CREATE OR REPLACE VIEW dbo.user_activity AS
SELECT 
    u.id,
    u.email,
    p.name,
    u.created_at as user_created,
    COUNT(s.id) as active_sessions,
    COUNT(i.id) as invitations_sent,
    MAX(s.created_at) as last_login
FROM dbo.users u
LEFT JOIN dbo.profiles p ON u.id = p.id
LEFT JOIN dbo.user_sessions s ON u.id = s.user_id AND s.expires_at > now()
LEFT JOIN dbo.invitations i ON u.id = i.requestor_id
GROUP BY u.id, u.email, p.name, u.created_at
ORDER BY u.created_at DESC;

-- Add comment to view
COMMENT ON VIEW dbo.user_activity IS 'User activity summary with sessions and invitations';

-- =============================================================================
-- INITIAL DATA (OPTIONAL)
-- =============================================================================

-- Create cleanup log table for monitoring
CREATE TABLE IF NOT EXISTS dbo.cleanup_log (
    id SERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    deleted_count BIGINT NOT NULL,
    cleanup_time TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT cleanup_log_table_name_check CHECK (length(trim(table_name)) > 0),
    CONSTRAINT cleanup_log_deleted_count_check CHECK (deleted_count >= 0)
);

-- Add comment to cleanup log table
COMMENT ON TABLE dbo.cleanup_log IS 'Log of automated cleanup operations';

-- Index for cleanup log
CREATE INDEX IF NOT EXISTS idx_cleanup_log_time ON dbo.cleanup_log(cleanup_time DESC);
CREATE INDEX IF NOT EXISTS idx_cleanup_log_table ON dbo.cleanup_log(table_name, cleanup_time DESC);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify tables were created
SELECT schemaname, tablename, tableowner 
FROM pg_tables 
WHERE schemaname = 'dbo' 
ORDER BY tablename;

-- Verify indexes were created
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes 
WHERE schemaname = 'dbo' 
ORDER BY tablename, indexname;

-- Verify functions were created
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname IN ('update_updated_at_column', 'handle_new_user', 'clean_expired_sessions', 'expire_old_invitations');

-- Verify triggers were created
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'dbo';

-- Verify views were created
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE schemaname = 'dbo';

-- =============================================================================
-- USAGE EXAMPLES
-- =============================================================================

/*
-- Test user creation (will automatically create profile)
INSERT INTO dbo.users (email, password_hash, raw_user_meta_data) 
VALUES ('test@example.com', '$2b$12$hash...', '{"name": "Test User"}');

-- Test session creation
INSERT INTO dbo.user_sessions (user_id, token, expires_at) 
VALUES (
    (SELECT id FROM dbo.users WHERE email = 'test@example.com'),
    'secure_token_here',
    now() + interval '24 hours'
);

-- Test invitation creation
INSERT INTO dbo.invitations (
    id, requestor_id, requestor_name, requestor_email, candidate_email,
    role, company, skills, proficiency_level, number_of_questions,
    question_types, expires_at
) VALUES (
    'inv_' || generate_random_uuid(),
    (SELECT id FROM dbo.users WHERE email = 'test@example.com'),
    'Test User',
    'test@example.com',
    'candidate@example.com',
    'Software Engineer',
    'Test Company',
    '["JavaScript", "React"]',
    'intermediate',
    10,
    '["technical-coding", "behavioral"]',
    now() + interval '7 days'
);

-- Test cleanup functions
SELECT * FROM dbo.clean_expired_sessions();
SELECT * FROM dbo.expire_old_invitations();

-- View statistics
SELECT * FROM dbo.session_stats;
SELECT * FROM dbo.invitation_stats;
SELECT * FROM dbo.user_activity;
*/