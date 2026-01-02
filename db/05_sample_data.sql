-- HR Candidate Evaluation System - Sample Data Script
-- This script creates sample data for development and testing
-- Run this script after all other setup scripts

-- =============================================================================
-- SAMPLE USERS AND PROFILES
-- =============================================================================

-- Insert sample users (passwords are hashed version of 'password123')
-- Note: In production, use proper password hashing with bcrypt
INSERT INTO dbo.users (id, email, password_hash, email_verified, raw_user_meta_data) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'admin@hreval.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PmvlJO', -- password123
    true,
    '{"name": "System Administrator", "role": "admin"}'::jsonb
),
(
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'hr.manager@company.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PmvlJO', -- password123
    true,
    '{"name": "Sarah Johnson", "role": "hr_manager"}'::jsonb
),
(
    '550e8400-e29b-41d4-a716-446655440003'::uuid,
    'tech.lead@company.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PmvlJO', -- password123
    true,
    '{"name": "Michael Chen", "role": "tech_lead"}'::jsonb
),
(
    '550e8400-e29b-41d4-a716-446655440004'::uuid,
    'recruiter@company.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PmvlJO', -- password123
    true,
    '{"name": "Emily Rodriguez", "role": "recruiter"}'::jsonb
),
(
    '550e8400-e29b-41d4-a716-446655440005'::uuid,
    'candidate@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PmvlJO', -- password123
    true,
    '{"name": "John Smith", "role": "candidate"}'::jsonb
);

-- Note: Profiles are automatically created by the trigger, but we can update them
UPDATE dbo.profiles SET name = 'System Administrator' WHERE id = '550e8400-e29b-41d4-a716-446655440001'::uuid;
UPDATE dbo.profiles SET name = 'Sarah Johnson' WHERE id = '550e8400-e29b-41d4-a716-446655440002'::uuid;
UPDATE dbo.profiles SET name = 'Michael Chen' WHERE id = '550e8400-e29b-41d4-a716-446655440003'::uuid;
UPDATE dbo.profiles SET name = 'Emily Rodriguez' WHERE id = '550e8400-e29b-41d4-a716-446655440004'::uuid;
UPDATE dbo.profiles SET name = 'John Smith' WHERE id = '550e8400-e29b-41d4-a716-446655440005'::uuid;

-- =============================================================================
-- SAMPLE USER SESSIONS
-- =============================================================================

-- Create some active sessions for testing
INSERT INTO dbo.user_sessions (user_id, token, expires_at) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'admin_session_token_' || extract(epoch from now())::text,
    now() + interval '24 hours'
),
(
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'hr_manager_session_token_' || extract(epoch from now())::text,
    now() + interval '24 hours'
),
(
    '550e8400-e29b-41d4-a716-446655440003'::uuid,
    'tech_lead_session_token_' || extract(epoch from now())::text,
    now() + interval '24 hours'
);

-- Create some expired sessions for cleanup testing
INSERT INTO dbo.user_sessions (user_id, token, expires_at, created_at) VALUES
(
    '550e8400-e29b-41d4-a716-446655440004'::uuid,
    'expired_session_1',
    now() - interval '2 hours',
    now() - interval '26 hours'
),
(
    '550e8400-e29b-41d4-a716-446655440005'::uuid,
    'expired_session_2',
    now() - interval '1 hour',
    now() - interval '25 hours'
);

-- =============================================================================
-- SAMPLE INVITATIONS
-- =============================================================================

-- Create sample invitations with different statuses
INSERT INTO dbo.invitations (
    id, requestor_id, requestor_name, requestor_email, candidate_email, candidate_name,
    role, company, skills, proficiency_level, number_of_questions, question_types,
    expires_at, status, custom_message
) VALUES
(
    'inv_frontend_dev_001',
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'Sarah Johnson',
    'hr.manager@company.com',
    'frontend.candidate@example.com',
    'Alice Cooper',
    'Frontend Developer',
    'TechCorp Inc.',
    '["React", "JavaScript", "TypeScript", "CSS", "HTML"]'::jsonb,
    'intermediate',
    15,
    '["technical-coding", "technical-concepts", "behavioral"]'::jsonb,
    now() + interval '7 days',
    'pending',
    'Welcome! This assessment will evaluate your frontend development skills. Please complete within 7 days.'
),
(
    'inv_backend_dev_001',
    '550e8400-e29b-41d4-a716-446655440003'::uuid,
    'Michael Chen',
    'tech.lead@company.com',
    'backend.candidate@example.com',
    'Bob Wilson',
    'Backend Developer',
    'TechCorp Inc.',
    '["Node.js", "Python", "PostgreSQL", "API Design", "Docker"]'::jsonb,
    'advanced',
    20,
    '["technical-coding", "system-design", "technical-concepts", "problem-solving"]'::jsonb,
    now() + interval '5 days',
    'started',
    'This is a comprehensive backend assessment. Focus on system design and coding best practices.'
),
(
    'inv_fullstack_dev_001',
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'Sarah Johnson',
    'hr.manager@company.com',
    'fullstack.candidate@example.com',
    'Carol Davis',
    'Full Stack Developer',
    'TechCorp Inc.',
    '["React", "Node.js", "TypeScript", "PostgreSQL", "AWS"]'::jsonb,
    'expert',
    25,
    '["technical-coding", "system-design", "architecture", "behavioral", "problem-solving"]'::jsonb,
    now() + interval '10 days',
    'pending',
    'Senior full-stack position assessment. This will cover both frontend and backend technologies.'
),
(
    'inv_devops_eng_001',
    '550e8400-e29b-41d4-a716-446655440003'::uuid,
    'Michael Chen',
    'tech.lead@company.com',
    'devops.candidate@example.com',
    'David Brown',
    'DevOps Engineer',
    'TechCorp Inc.',
    '["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform"]'::jsonb,
    'advanced',
    18,
    '["technical-concepts", "system-design", "problem-solving", "case-study"]'::jsonb,
    now() + interval '3 days',
    'completed',
    'DevOps assessment focusing on infrastructure and deployment practices.'
),
(
    'inv_data_scientist_001',
    '550e8400-e29b-41d4-a716-446655440004'::uuid,
    'Emily Rodriguez',
    'recruiter@company.com',
    'data.scientist@example.com',
    'Eva Martinez',
    'Data Scientist',
    'DataCorp Analytics',
    '["Python", "Machine Learning", "SQL", "Statistics", "Pandas"]'::jsonb,
    'intermediate',
    12,
    '["technical-coding", "problem-solving", "case-study"]'::jsonb,
    now() - interval '1 day',
    'expired',
    'Data science assessment covering ML algorithms and data analysis.'
),
(
    'inv_mobile_dev_001',
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'Sarah Johnson',
    'hr.manager@company.com',
    'mobile.dev@example.com',
    'Frank Johnson',
    'Mobile Developer',
    'MobileTech Solutions',
    '["React Native", "iOS", "Android", "JavaScript", "Swift"]'::jsonb,
    'intermediate',
    16,
    '["technical-coding", "technical-concepts", "behavioral", "debugging"]'::jsonb,
    now() + interval '14 days',
    'pending',
    'Mobile development assessment for cross-platform development role.'
);

-- =============================================================================
-- SAMPLE SECURITY LOG ENTRIES
-- =============================================================================

-- Insert sample security log entries for testing monitoring
INSERT INTO dbo.security_log (event_type, user_id, ip_address, user_agent, details) VALUES
(
    'login',
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    '192.168.1.100'::inet,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    '{"success": true, "method": "email_password"}'::jsonb
),
(
    'login',
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    '192.168.1.101'::inet,
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    '{"success": true, "method": "email_password"}'::jsonb
),
(
    'failed_login',
    '550e8400-e29b-41d4-a716-446655440003'::uuid,
    '192.168.1.102'::inet,
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    '{"reason": "invalid_password", "email": "tech.lead@company.com"}'::jsonb
),
(
    'password_change',
    '550e8400-e29b-41d4-a716-446655440004'::uuid,
    '192.168.1.103'::inet,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    '{"success": true, "method": "user_initiated"}'::jsonb
);

-- Insert some failed login attempts for rate limiting testing
INSERT INTO dbo.failed_login_attempts (email, ip_address, user_agent) VALUES
('nonexistent@example.com', '10.0.0.1'::inet, 'curl/7.68.0'),
('nonexistent@example.com', '10.0.0.1'::inet, 'curl/7.68.0'),
('nonexistent@example.com', '10.0.0.1'::inet, 'curl/7.68.0'),
('admin@hreval.com', '10.0.0.2'::inet, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
('admin@hreval.com', '10.0.0.2'::inet, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');

-- =============================================================================
-- SAMPLE CLEANUP LOG ENTRIES
-- =============================================================================

-- Insert sample cleanup log entries
INSERT INTO dbo.cleanup_log (table_name, deleted_count, cleanup_time) VALUES
('user_sessions', 5, now() - interval '1 hour'),
('user_sessions', 3, now() - interval '25 hours'),
('invitations_expired', 2, now() - interval '2 hours'),
('security_log', 150, now() - interval '7 days');

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify sample data was inserted correctly
DO $$
DECLARE
    user_count integer;
    profile_count integer;
    session_count integer;
    invitation_count integer;
    security_log_count integer;
BEGIN
    SELECT COUNT(*) INTO user_count FROM dbo.users;
    SELECT COUNT(*) INTO profile_count FROM dbo.profiles;
    SELECT COUNT(*) INTO session_count FROM dbo.user_sessions;
    SELECT COUNT(*) INTO invitation_count FROM dbo.invitations;
    SELECT COUNT(*) INTO security_log_count FROM dbo.security_log;
    
    RAISE NOTICE 'Sample data inserted successfully:';
    RAISE NOTICE '  Users: %', user_count;
    RAISE NOTICE '  Profiles: %', profile_count;
    RAISE NOTICE '  Sessions: %', session_count;
    RAISE NOTICE '  Invitations: %', invitation_count;
    RAISE NOTICE '  Security log entries: %', security_log_count;
    
    IF user_count < 5 THEN
        RAISE EXCEPTION 'Expected at least 5 users, found %', user_count;
    END IF;
    
    IF invitation_count < 6 THEN
        RAISE EXCEPTION 'Expected at least 6 invitations, found %', invitation_count;
    END IF;
END
$$;

-- =============================================================================
-- SAMPLE QUERIES FOR TESTING
-- =============================================================================

/*
-- Test queries to verify the sample data:

-- 1. View all users and their profiles
SELECT 
    u.id,
    u.email,
    p.name,
    u.email_verified,
    u.created_at
FROM dbo.users u
JOIN dbo.profiles p ON u.id = p.id
ORDER BY u.created_at;

-- 2. View active sessions
SELECT 
    s.id,
    u.email,
    p.name,
    s.token,
    s.expires_at,
    s.created_at
FROM dbo.user_sessions s
JOIN dbo.users u ON s.user_id = u.id
JOIN dbo.profiles p ON u.id = p.id
WHERE s.expires_at > now()
ORDER BY s.created_at DESC;

-- 3. View invitations by status
SELECT 
    status,
    COUNT(*) as count,
    array_agg(role) as roles
FROM dbo.invitations
GROUP BY status
ORDER BY count DESC;

-- 4. View invitation details
SELECT 
    i.id,
    i.requestor_name,
    i.candidate_name,
    i.role,
    i.company,
    i.proficiency_level,
    i.number_of_questions,
    i.status,
    i.expires_at
FROM dbo.invitations i
ORDER BY i.created_at DESC;

-- 5. View security events
SELECT 
    sl.event_type,
    u.email,
    sl.ip_address,
    sl.created_at,
    sl.details
FROM dbo.security_log sl
LEFT JOIN dbo.users u ON sl.user_id = u.id
ORDER BY sl.created_at DESC;

-- 6. Test monitoring views
SELECT * FROM dbo.session_stats;
SELECT * FROM dbo.invitation_stats;
SELECT * FROM dbo.security_event_summary;
SELECT * FROM dbo.user_activity_monitor;

-- 7. Test security functions
SELECT dbo.validate_password_strength('weak');
SELECT dbo.validate_password_strength('Strong123!');

SELECT * FROM dbo.check_account_lockout('nonexistent@example.com', '10.0.0.1'::inet);

-- 8. Test cleanup functions
SELECT * FROM dbo.clean_expired_sessions();
SELECT * FROM dbo.expire_old_invitations();
SELECT * FROM dbo.clean_old_security_logs(30);
SELECT * FROM dbo.clean_old_failed_attempts(24);

-- 9. Test performance monitoring
SELECT * FROM dbo.analyze_table_performance();
SELECT * FROM dbo.analyze_index_usage();

-- 10. Test RLS (Row Level Security)
-- Note: This requires setting user context first
SELECT dbo.set_current_user_context('550e8400-e29b-41d4-a716-446655440001'::uuid, 'admin@hreval.com');
-- Then query tables to see RLS in action
*/

-- =============================================================================
-- DEVELOPMENT HELPERS
-- =============================================================================

-- Function to reset sample data (useful for development)
CREATE OR REPLACE FUNCTION reset_sample_data()
RETURNS void AS $$
BEGIN
    -- Delete in reverse order of dependencies
    DELETE FROM security_log;
    DELETE FROM failed_login_attempts;
    DELETE FROM cleanup_log;
    DELETE FROM user_sessions;
    DELETE FROM invitations;
    DELETE FROM profiles;
    DELETE FROM users;
    
    RAISE NOTICE 'Sample data cleared. Run this script again to recreate.';
END;
$$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION reset_sample_data() IS 'Clears all sample data for development reset';

-- Function to generate additional test invitations
CREATE OR REPLACE FUNCTION generate_test_invitations(count integer DEFAULT 10)
RETURNS void AS $$
DECLARE
    i integer;
    roles text[] := ARRAY['Software Engineer', 'Data Scientist', 'DevOps Engineer', 'Product Manager', 'UX Designer'];
    companies text[] := ARRAY['TechCorp', 'DataCorp', 'CloudCorp', 'StartupCorp', 'BigCorp'];
    levels text[] := ARRAY['beginner', 'intermediate', 'advanced', 'expert'];
    requestor_id uuid := '550e8400-e29b-41d4-a716-446655440002'::uuid;
BEGIN
    FOR i IN 1..count LOOP
        INSERT INTO invitations (
            id,
            requestor_id,
            requestor_name,
            requestor_email,
            candidate_email,
            candidate_name,
            role,
            company,
            skills,
            proficiency_level,
            number_of_questions,
            question_types,
            expires_at,
            status
        ) VALUES (
            'test_inv_' || i || '_' || extract(epoch from now())::text,
            requestor_id,
            'Test Requestor',
            'test.requestor@company.com',
            'test.candidate.' || i || '@example.com',
            'Test Candidate ' || i,
            roles[1 + (i % array_length(roles, 1))],
            companies[1 + (i % array_length(companies, 1))],
            '["JavaScript", "React", "Node.js"]'::jsonb,
            levels[1 + (i % array_length(levels, 1))],
            10 + (i % 15),
            '["technical-coding", "behavioral"]'::jsonb,
            now() + interval '7 days',
            CASE 
                WHEN i % 4 = 0 THEN 'completed'
                WHEN i % 4 = 1 THEN 'started'
                WHEN i % 4 = 2 THEN 'expired'
                ELSE 'pending'
            END
        );
    END LOOP;
    
    RAISE NOTICE 'Generated % test invitations', count;
END;
$$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION generate_test_invitations(integer) IS 'Generates additional test invitations for development';

RAISE NOTICE 'Sample data script completed successfully!';
RAISE NOTICE 'Use the following credentials for testing:';
RAISE NOTICE '  Admin: admin@hreval.com / password123';
RAISE NOTICE '  HR Manager: hr.manager@company.com / password123';
RAISE NOTICE '  Tech Lead: tech.lead@company.com / password123';
RAISE NOTICE '  Recruiter: recruiter@company.com / password123';
RAISE NOTICE '  Candidate: candidate@example.com / password123';