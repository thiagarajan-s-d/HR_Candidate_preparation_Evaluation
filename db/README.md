# HR Candidate Evaluation System - Database Setup

This folder contains all the necessary PostgreSQL database scripts for the HR Candidate Evaluation System.

## Overview

The database setup is organized into multiple scripts that should be executed in order:

1. **01_create_database.sql** - Creates the database and application user
2. **02_create_schema.sql** - Creates tables, indexes, functions, and triggers
3. **03_performance_indexes.sql** - Adds performance optimizations and monitoring
4. **04_security_setup.sql** - Implements security policies and audit logging
5. **05_sample_data.sql** - Inserts sample data for development and testing

## Quick Start

### Prerequisites

- PostgreSQL 12+ installed and running
- Superuser access (postgres user)
- psql command-line tool

### Setup Instructions

1. **Connect to PostgreSQL as superuser:**
   ```bash
   psql -U postgres -h localhost
   ```

2. **Run the database creation script:**
   ```sql
   \i DB/01_create_database.sql
   ```

3. **Connect to the new database:**
   ```sql
   \c hr_candidate_eval
   ```

4. **Run the schema creation script:**
   ```sql
   \i DB/02_create_schema.sql
   ```

5. **Add performance optimizations:**
   ```sql
   \i DB/03_performance_indexes.sql
   ```

6. **Set up security features:**
   ```sql
   \i DB/04_security_setup.sql
   ```

7. **Load sample data (optional, for development):**
   ```sql
   \i DB/05_sample_data.sql
   ```

### Alternative: Run All Scripts at Once

```bash
# From the project root directory
psql -U postgres -h localhost -f DB/01_create_database.sql
psql -U postgres -h localhost -d hr_candidate_eval -f DB/02_create_schema.sql
psql -U postgres -h localhost -d hr_candidate_eval -f DB/03_performance_indexes.sql
psql -U postgres -h localhost -d hr_candidate_eval -f DB/04_security_setup.sql
psql -U postgres -h localhost -d hr_candidate_eval -f DB/05_sample_data.sql
```

## Database Schema

### Core Tables

#### dbo.users
- **Purpose**: User authentication and account information
- **Key Fields**: id (UUID), email, password_hash, created_at
- **Security**: Row Level Security enabled, bcrypt password hashing

#### dbo.profiles
- **Purpose**: Extended user profile information
- **Key Fields**: id (references users), email, name
- **Relationship**: One-to-one with users table

#### dbo.user_sessions
- **Purpose**: Authentication session management
- **Key Fields**: user_id, token, expires_at
- **Features**: Automatic cleanup of expired sessions

#### dbo.invitations
- **Purpose**: Assessment invitations sent to candidates
- **Key Fields**: id, requestor_id, candidate_email, role, skills, status
- **Features**: JSON fields for skills and question types

### Security Tables

#### dbo.security_log
- **Purpose**: Audit trail for security events
- **Key Fields**: event_type, user_id, ip_address, details
- **Events**: login, logout, failed_login, password_change, etc.

#### dbo.failed_login_attempts
- **Purpose**: Rate limiting and brute force protection
- **Key Fields**: email, ip_address, attempt_time
- **Features**: Automatic cleanup of old attempts

#### dbo.cleanup_log
- **Purpose**: Tracking of automated maintenance operations
- **Key Fields**: table_name, deleted_count, cleanup_time

## Environment Configuration

Update your environment variables after database setup:

```bash
# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=hr_candidate_eval
POSTGRES_USER=hr_eval_app
POSTGRES_PASSWORD=your_secure_password

# SSL Configuration (recommended for production)
POSTGRES_SSL=true
POSTGRES_SSL_REJECT_UNAUTHORIZED=true
```

## Security Features

### Authentication Security
- bcrypt password hashing with 12 salt rounds
- Secure session token generation
- Automatic session cleanup
- Failed login attempt tracking

### Row Level Security (RLS)
- Users can only access their own data
- Invitations visible to requestor and candidate
- Security policies enforce data isolation

### Audit Logging
- All security events logged
- Failed login attempt tracking
- Suspicious activity detection
- Configurable log retention

### Database Security
- Dedicated application user with minimal privileges
- SSL/TLS encryption support
- Input validation and constraints
- Secure defaults and configuration

## Performance Features

### Indexes
- Primary key indexes on all tables
- Foreign key indexes for relationships
- Composite indexes for common query patterns
- Partial indexes for active records
- GIN indexes for JSON fields

### Monitoring
- Query performance analysis functions
- Table size and usage statistics
- Index usage monitoring
- Connection and lock statistics

### Maintenance
- Automated session cleanup
- Configurable log retention
- Table statistics updates
- Reindexing when needed

## Sample Data

The sample data includes:

### Users
- **admin@hreval.com** - System Administrator
- **hr.manager@company.com** - HR Manager
- **tech.lead@company.com** - Technical Lead
- **recruiter@company.com** - Recruiter
- **candidate@example.com** - Sample Candidate

All sample users have the password: `password123`

### Invitations
- Various roles: Frontend, Backend, Full Stack, DevOps, Data Scientist
- Different statuses: pending, started, completed, expired
- Multiple proficiency levels and question types

### Security Events
- Sample login/logout events
- Failed login attempts
- Password change events
- Cleanup operations

## Monitoring and Maintenance

### Health Checks

```sql
-- Check database connection
SELECT NOW() as current_time;

-- Check table sizes
SELECT * FROM analyze_table_performance();

-- Check active sessions
SELECT * FROM session_stats;

-- Check invitation statistics
SELECT * FROM invitation_stats;
```

### Performance Monitoring

```sql
-- Analyze query performance (requires pg_stat_statements)
SELECT * FROM analyze_query_performance();

-- Check index usage
SELECT * FROM analyze_index_usage();

-- Monitor connections
SELECT * FROM connection_stats;
```

### Security Monitoring

```sql
-- Check recent security events
SELECT * FROM security_event_summary;

-- Monitor failed login attempts
SELECT * FROM failed_login_analysis;

-- Check user activity
SELECT * FROM user_activity_monitor;
```

### Maintenance Operations

```sql
-- Clean expired sessions
SELECT * FROM dbo.clean_expired_sessions_optimized();

-- Expire old invitations
SELECT * FROM dbo.expire_old_invitations();

-- Clean old security logs (keep 90 days)
SELECT * FROM dbo.clean_old_security_logs(90);

-- Update table statistics
SELECT * FROM dbo.update_table_statistics();

-- Vacuum and analyze tables
SELECT * FROM dbo.maintenance_vacuum_analyze();
```

## Backup and Recovery

### Backup Commands

```bash
# Full database backup
pg_dump -U postgres -h localhost hr_candidate_eval > backup_$(date +%Y%m%d_%H%M%S).sql

# Schema-only backup
pg_dump -U postgres -h localhost --schema-only hr_candidate_eval > schema_backup.sql

# Data-only backup
pg_dump -U postgres -h localhost --data-only hr_candidate_eval > data_backup.sql

# Compressed backup
pg_dump -U postgres -h localhost -Fc hr_candidate_eval > backup_$(date +%Y%m%d_%H%M%S).dump
```

### Recovery Commands

```bash
# Restore from SQL backup
psql -U postgres -h localhost -d hr_candidate_eval < backup_file.sql

# Restore from compressed backup
pg_restore -U postgres -h localhost -d hr_candidate_eval backup_file.dump
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check PostgreSQL service is running
   - Verify host and port settings
   - Check firewall configuration

2. **Authentication Failed**
   - Verify database credentials
   - Check user exists and has proper permissions
   - Ensure database exists

3. **Permission Denied**
   - Check user has necessary privileges
   - Verify RLS policies if applicable
   - Ensure proper role membership

4. **Table Does Not Exist**
   - Run schema creation scripts
   - Check database name
   - Verify script execution order

### Diagnostic Queries

```sql
-- Check database exists
SELECT datname FROM pg_database WHERE datname = 'hr_candidate_eval';

-- Check user exists
SELECT rolname FROM pg_roles WHERE rolname = 'hr_eval_app';

-- Check tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'dbo';

-- Check permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE grantee = 'hr_eval_app' AND table_schema = 'dbo';
```

## Development Helpers

### Reset Sample Data

```sql
-- Clear all sample data
SELECT dbo.reset_sample_data();

-- Regenerate sample data
\i DB/05_sample_data.sql
```

### Generate Test Data

```sql
-- Generate additional test invitations
SELECT dbo.generate_test_invitations(50);
```

### Performance Testing

```sql
-- Test query performance
EXPLAIN ANALYZE SELECT * FROM dbo.users WHERE email = 'test@example.com';

-- Test index usage
SELECT * FROM pg_stat_user_indexes WHERE relname = 'users' AND schemaname = 'dbo';
```

## Production Considerations

### Security Checklist
- [ ] Change default passwords
- [ ] Enable SSL/TLS connections
- [ ] Configure firewall rules
- [ ] Set up regular backups
- [ ] Enable audit logging
- [ ] Configure log rotation
- [ ] Set up monitoring alerts

### Performance Checklist
- [ ] Configure connection pooling
- [ ] Set appropriate shared_buffers
- [ ] Configure work_mem and maintenance_work_mem
- [ ] Enable pg_stat_statements
- [ ] Set up regular VACUUM and ANALYZE
- [ ] Monitor query performance
- [ ] Configure log_min_duration_statement

### Maintenance Checklist
- [ ] Schedule regular backups
- [ ] Set up log rotation
- [ ] Configure automated cleanup jobs
- [ ] Monitor disk space usage
- [ ] Set up performance monitoring
- [ ] Plan for capacity growth

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review PostgreSQL logs for error details
3. Verify environment configuration
4. Check database permissions and connectivity
5. Consult the main project documentation

## Version History

- **v1.0** - Initial database schema with core tables
- **v1.1** - Added performance indexes and monitoring
- **v1.2** - Implemented security features and RLS
- **v1.3** - Added sample data and development helpers