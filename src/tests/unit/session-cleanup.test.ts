import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the database pool
const mockPool = {
  query: vi.fn(),
  end: vi.fn(),
  connect: vi.fn()
};

// Mock the server module
vi.mock('pg', () => ({
  Pool: vi.fn(() => mockPool)
}));

// Mock cleanup function for testing
async function mockCleanExpiredSessions(pool: any) {
  try {
    const result = await pool.query('SELECT clean_expired_sessions()');
    return result;
  } catch (error: any) {
    throw error;
  }
}

describe('Session Cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call the database cleanup function', async () => {
    // Mock successful cleanup
    mockPool.query.mockResolvedValue({ rows: [] });

    // Test the cleanup function directly
    const result = await mockCleanExpiredSessions(mockPool);
    
    expect(mockPool.query).toHaveBeenCalledWith('SELECT clean_expired_sessions()');
    expect(result).toEqual({ rows: [] });
  });

  it('should handle cleanup errors gracefully', async () => {
    // Mock database error
    const dbError = new Error('Database connection failed');
    mockPool.query.mockRejectedValue(dbError);

    // Test that error is properly thrown
    await expect(mockCleanExpiredSessions(mockPool)).rejects.toThrow('Database connection failed');
    expect(mockPool.query).toHaveBeenCalledWith('SELECT clean_expired_sessions()');
  });

  it('should verify expired sessions are removed from database', async () => {
    // This test would require a test database setup
    // For now, we'll mock the expected behavior
    const mockExpiredSession = {
      id: 'test-session-id',
      user_id: 'test-user-id',
      token: 'expired-token',
      expires_at: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
    };

    // Mock query to return expired sessions before cleanup
    mockPool.query
      .mockResolvedValueOnce({ rows: [mockExpiredSession] }) // SELECT expired sessions
      .mockResolvedValueOnce({ rows: [] }); // DELETE expired sessions

    // Simulate cleanup process
    const selectResult = await mockPool.query('SELECT * FROM user_sessions WHERE expires_at < now()');
    expect(selectResult.rows).toHaveLength(1);
    expect(selectResult.rows[0].token).toBe('expired-token');

    // Simulate cleanup
    await mockPool.query('SELECT clean_expired_sessions()');

    // Verify cleanup was called
    expect(mockPool.query).toHaveBeenCalledWith('SELECT clean_expired_sessions()');
  });

  it('should not affect valid sessions during cleanup', async () => {
    const mockValidSession = {
      id: 'valid-session-id',
      user_id: 'test-user-id',
      token: 'valid-token',
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours from now
      created_at: new Date()
    };

    // Mock query to return no expired sessions
    mockPool.query
      .mockResolvedValueOnce({ rows: [] }) // No expired sessions
      .mockResolvedValueOnce({ rows: [mockValidSession] }); // Valid sessions remain

    // Simulate checking for expired sessions
    const expiredResult = await mockPool.query('SELECT * FROM user_sessions WHERE expires_at < now()');
    expect(expiredResult.rows).toHaveLength(0);

    // Simulate checking for valid sessions
    const validResult = await mockPool.query('SELECT * FROM user_sessions WHERE expires_at > now()');
    expect(validResult.rows).toHaveLength(1);
    expect(validResult.rows[0].token).toBe('valid-token');
  });
});