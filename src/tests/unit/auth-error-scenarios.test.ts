import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../../hooks/useAuth';

// Mock the postgres module
vi.mock('../../lib/postgres', () => ({
  auth: {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn()
  },
  query: vi.fn()
}));

// Mock the API error handler
vi.mock('../../lib/apiErrorHandler', () => ({
  ApiErrorHandler: {
    createApiError: vi.fn((message, code, status, originalError) => {
      const error = new Error(message) as any;
      error.code = code;
      error.status = status;
      error.originalError = originalError;
      return error;
    }),
    categorizeError: vi.fn((error) => ({
      category: 'UNKNOWN_ERROR',
      userMessage: 'An unexpected error occurred. Please try again.',
      technicalMessage: `Unknown error: ${error.message}`,
      shouldRetry: false
    })),
    logError: vi.fn()
  },
  apiCall: vi.fn()
}));

import { auth, query } from '../../lib/postgres';
import { ApiErrorHandler, apiCall } from '../../lib/apiErrorHandler';

describe('useAuth - Error Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login errors', () => {
    it('should handle network errors during login', async () => {
      const networkError = new Error('Failed to fetch');
      (apiCall as any).mockRejectedValue(networkError);
      (ApiErrorHandler.categorizeError as any).mockReturnValue({
        category: 'NETWORK_ERROR',
        userMessage: 'Unable to connect to the server. Please check your internet connection.',
        technicalMessage: 'Network error: Failed to fetch',
        shouldRetry: true
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const loginResult = await result.current.login('test@example.com', 'password123');
        expect(loginResult.success).toBe(false);
        expect(loginResult.error).toBe('Unable to connect to the server. Please check your internet connection.');
      });

      expect(apiCall).toHaveBeenCalledWith(
        expect.any(Function),
        'user-login',
        { maxRetries: 2 }
      );
    });

    it('should handle authentication errors during login', async () => {
      const authError = ApiErrorHandler.createApiError('Invalid credentials', 'AUTH_ERROR', 401);
      (apiCall as any).mockRejectedValue(authError);
      (ApiErrorHandler.categorizeError as any).mockReturnValue({
        category: 'AUTH_ERROR',
        userMessage: 'Authentication failed. Please check your credentials.',
        technicalMessage: 'Authentication error: Invalid credentials',
        shouldRetry: false
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const loginResult = await result.current.login('test@example.com', 'wrongpassword');
        expect(loginResult.success).toBe(false);
        expect(loginResult.error).toBe('Authentication failed. Please check your credentials.');
      });
    });

    it('should handle timeout errors during login', async () => {
      const timeoutError = new Error('Request timeout');
      (apiCall as any).mockRejectedValue(timeoutError);
      (ApiErrorHandler.categorizeError as any).mockReturnValue({
        category: 'TIMEOUT_ERROR',
        userMessage: 'The request took too long to complete. Please try again.',
        technicalMessage: 'Timeout error: Request timeout',
        shouldRetry: true
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const loginResult = await result.current.login('test@example.com', 'password123');
        expect(loginResult.success).toBe(false);
        expect(loginResult.error).toBe('The request took too long to complete. Please try again.');
      });
    });

    it('should validate empty email and password', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const loginResult = await result.current.login('', '');
        expect(loginResult.success).toBe(false);
        expect(loginResult.error).toBe('Email and password are required.');
      });

      // Should not call API for validation errors
      expect(apiCall).not.toHaveBeenCalled();
    });

    it('should validate whitespace-only inputs', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const loginResult = await result.current.login('   ', '   ');
        expect(loginResult.success).toBe(false);
        expect(loginResult.error).toBe('Email and password are required.');
      });

      expect(apiCall).not.toHaveBeenCalled();
    });
  });

  describe('registration errors', () => {
    it('should handle network errors during registration', async () => {
      const networkError = new Error('Failed to fetch');
      (apiCall as any).mockRejectedValue(networkError);
      (ApiErrorHandler.categorizeError as any).mockReturnValue({
        category: 'NETWORK_ERROR',
        userMessage: 'Unable to connect to the server. Please check your internet connection.',
        technicalMessage: 'Network error: Failed to fetch',
        shouldRetry: true
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const registerResult = await result.current.register('test@example.com', 'password123', 'Test User');
        expect(registerResult.success).toBe(false);
        expect(registerResult.error).toBe('Unable to connect to the server. Please check your internet connection.');
      });
    });

    it('should handle duplicate email errors during registration', async () => {
      const duplicateError = ApiErrorHandler.createApiError('Email already exists', 'VALIDATION_ERROR', 400);
      (apiCall as any).mockRejectedValue(duplicateError);
      (ApiErrorHandler.categorizeError as any).mockReturnValue({
        category: 'VALIDATION_ERROR',
        userMessage: 'The request contains invalid data. Please check your input and try again.',
        technicalMessage: 'Validation error: Email already exists',
        shouldRetry: false
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const registerResult = await result.current.register('existing@example.com', 'password123', 'Test User');
        expect(registerResult.success).toBe(false);
        expect(registerResult.error).toBe('The request contains invalid data. Please check your input and try again.');
      });
    });

    it('should validate password length', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const registerResult = await result.current.register('test@example.com', '123', 'Test User');
        expect(registerResult.success).toBe(false);
        expect(registerResult.error).toBe('Password must be at least 6 characters long.');
      });

      expect(apiCall).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const registerResult = await result.current.register('', '', '');
        expect(registerResult.success).toBe(false);
        expect(registerResult.error).toBe('All fields are required.');
      });

      expect(apiCall).not.toHaveBeenCalled();
    });

    it('should handle server errors during registration', async () => {
      const serverError = ApiErrorHandler.createApiError('Internal server error', 'SERVER_ERROR', 500);
      (apiCall as any).mockRejectedValue(serverError);
      (ApiErrorHandler.categorizeError as any).mockReturnValue({
        category: 'SERVER_ERROR',
        userMessage: 'The server is experiencing issues. Please try again in a few moments.',
        technicalMessage: 'Server error (500): Internal server error',
        shouldRetry: true
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const registerResult = await result.current.register('test@example.com', 'password123', 'Test User');
        expect(registerResult.success).toBe(false);
        expect(registerResult.error).toBe('The server is experiencing issues. Please try again in a few moments.');
      });
    });
  });

  describe('profile loading errors', () => {
    it('should handle database connection errors when loading profile', async () => {
      const dbError = new Error('ECONNREFUSED database connection failed');
      
      // Mock the query function to reject instead of apiCall
      (query as any).mockRejectedValue(dbError);

      const { result } = renderHook(() => useAuth());

      // Simulate token exists but profile loading fails
      localStorage.setItem('auth_token', 'test-token');
      (auth.getUser as any).mockResolvedValue({ data: { user: { id: 'user-123' } } });

      await act(async () => {
        // Wait for useEffect to complete and for loadUserProfile to handle the error
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBe(null);
      // The error should be logged by apiCall internally, not by the catch block
      expect(ApiErrorHandler.logError).toHaveBeenCalledWith(
        dbError,
        'load-user-profile'
      );
    });

    it('should handle query errors when loading profile', async () => {
      const queryError = new Error('Query execution failed');
      (apiCall as any).mockRejectedValue(queryError);

      const { result } = renderHook(() => useAuth());

      localStorage.setItem('auth_token', 'test-token');
      (auth.getUser as any).mockResolvedValue({ data: { user: { id: 'user-123' } } });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBe(null);
    });
  });

  describe('profile update errors', () => {
    it('should handle database errors during profile update', async () => {
      const dbError = new Error('Database connection failed');
      
      // Mock the query function to reject instead of apiCall
      (query as any).mockRejectedValue(dbError);

      const { result } = renderHook(() => useAuth());

      // Set initial user state
      await act(async () => {
        result.current.user = {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        } as any;
      });

      await act(async () => {
        const updateResult = await result.current.updateProfile({ name: 'Updated Name' });
        expect(updateResult).toBe(false);
      });

      // The error should be logged by apiCall internally
      expect(ApiErrorHandler.logError).toHaveBeenCalledWith(
        dbError,
        'update-user-profile'
      );
    });

    it('should return false when no user is logged in', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const updateResult = await result.current.updateProfile({ name: 'Updated Name' });
        expect(updateResult).toBe(false);
      });

      expect(apiCall).not.toHaveBeenCalled();
    });
  });

  describe('getAllUsers errors', () => {
    it('should handle database errors when fetching all users', async () => {
      const dbError = new Error('Database query failed');
      (apiCall as any).mockRejectedValue(dbError);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const users = await result.current.getAllUsers();
        expect(users).toEqual([]);
      });

      expect(ApiErrorHandler.logError).toHaveBeenCalledWith(
        dbError,
        'get-all-users'
      );
    });

    it('should handle network errors when fetching all users', async () => {
      const networkError = new Error('Failed to fetch');
      (apiCall as any).mockRejectedValue(networkError);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const users = await result.current.getAllUsers();
        expect(users).toEqual([]);
      });
    });
  });
});