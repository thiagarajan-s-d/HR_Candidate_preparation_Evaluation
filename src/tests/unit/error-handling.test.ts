import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiErrorHandler, apiCall } from '../../lib/apiErrorHandler';

describe('ApiErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createApiError', () => {
    it('should create an API error with all properties', () => {
      const originalError = new Error('Original error');
      const apiError = ApiErrorHandler.createApiError(
        'Test error message',
        'NETWORK_ERROR',
        500,
        originalError
      );

      expect(apiError.message).toBe('Test error message');
      expect(apiError.name).toBe('ApiError');
      expect(apiError.code).toBe('NETWORK_ERROR');
      expect(apiError.status).toBe(500);
      expect(apiError.originalError).toBe(originalError);
      expect(apiError.isRetryable).toBe(true);
    });

    it('should determine retryability correctly', () => {
      const retryableError = ApiErrorHandler.createApiError('Test', 'SERVER_ERROR', 500);
      const nonRetryableError = ApiErrorHandler.createApiError('Test', 'VALIDATION_ERROR', 400);

      expect(retryableError.isRetryable).toBe(true);
      expect(nonRetryableError.isRetryable).toBe(false);
    });
  });

  describe('categorizeError', () => {
    it('should categorize network errors correctly', () => {
      const networkError = new Error('Failed to fetch');
      const result = ApiErrorHandler.categorizeError(networkError);

      expect(result.category).toBe('NETWORK_ERROR');
      expect(result.userMessage).toContain('Unable to connect to the server');
      expect(result.shouldRetry).toBe(true);
    });

    it('should categorize timeout errors correctly', () => {
      const timeoutError = new Error('Request timeout');
      const result = ApiErrorHandler.categorizeError(timeoutError);

      expect(result.category).toBe('TIMEOUT_ERROR');
      expect(result.userMessage).toContain('took too long to complete');
      expect(result.shouldRetry).toBe(true);
    });

    it('should categorize authentication errors correctly', () => {
      const authError = ApiErrorHandler.createApiError('Unauthorized', 'AUTH_ERROR', 401);
      const result = ApiErrorHandler.categorizeError(authError);

      expect(result.category).toBe('AUTH_ERROR');
      expect(result.userMessage).toContain('Authentication failed');
      expect(result.shouldRetry).toBe(false);
    });

    it('should categorize rate limit errors correctly', () => {
      const rateLimitError = ApiErrorHandler.createApiError('Rate limit exceeded', 'RATE_LIMIT', 429);
      const result = ApiErrorHandler.categorizeError(rateLimitError);

      expect(result.category).toBe('RATE_LIMIT_ERROR');
      expect(result.userMessage).toContain('Too many requests');
      expect(result.shouldRetry).toBe(true);
    });

    it('should categorize server errors correctly', () => {
      const serverError = ApiErrorHandler.createApiError('Internal server error', 'SERVER_ERROR', 500);
      const result = ApiErrorHandler.categorizeError(serverError);

      expect(result.category).toBe('SERVER_ERROR');
      expect(result.userMessage).toContain('server is experiencing issues');
      expect(result.shouldRetry).toBe(true);
    });

    it('should categorize validation errors correctly', () => {
      const validationError = ApiErrorHandler.createApiError('Invalid input', 'VALIDATION_ERROR', 400);
      const result = ApiErrorHandler.categorizeError(validationError);

      expect(result.category).toBe('VALIDATION_ERROR');
      expect(result.userMessage).toContain('invalid data');
      expect(result.shouldRetry).toBe(false);
    });

    it('should categorize database errors correctly', () => {
      const dbError = new Error('ECONNREFUSED database connection failed');
      const result = ApiErrorHandler.categorizeError(dbError);

      expect(result.category).toBe('DATABASE_ERROR');
      expect(result.userMessage).toContain('Database connection failed');
      expect(result.shouldRetry).toBe(true);
    });

    it('should categorize unknown errors correctly', () => {
      const unknownError = new Error('Some random error');
      const result = ApiErrorHandler.categorizeError(unknownError);

      expect(result.category).toBe('UNKNOWN_ERROR');
      expect(result.userMessage).toContain('unexpected error occurred');
      expect(result.shouldRetry).toBe(false);
    });
  });

  describe('calculateDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      const config = {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        retryableErrors: []
      };

      const delay1 = ApiErrorHandler.calculateDelay(0, config);
      const delay2 = ApiErrorHandler.calculateDelay(1, config);
      const delay3 = ApiErrorHandler.calculateDelay(2, config);

      // First attempt should be around base delay (with jitter)
      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(1100);

      // Second attempt should be around 2x base delay
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThanOrEqual(2200);

      // Third attempt should be around 4x base delay
      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThanOrEqual(4400);
    });

    it('should respect maximum delay', () => {
      const config = {
        maxRetries: 10,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
        retryableErrors: []
      };

      const delay = ApiErrorHandler.calculateDelay(10, config);
      expect(delay).toBeLessThanOrEqual(5000);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      
      const result = await ApiErrorHandler.withRetry(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('success');

      const result = await ApiErrorHandler.withRetry(mockFn, { maxRetries: 3 });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const mockFn = vi.fn().mockRejectedValue(
        ApiErrorHandler.createApiError('Validation error', 'VALIDATION_ERROR', 400)
      );

      await expect(ApiErrorHandler.withRetry(mockFn)).rejects.toThrow('The request contains invalid data');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

      await expect(
        ApiErrorHandler.withRetry(mockFn, { maxRetries: 2 })
      ).rejects.toThrow();
      
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should call onRetry callback', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValue('success');
      
      const onRetry = vi.fn();

      await ApiErrorHandler.withRetry(mockFn, { maxRetries: 2 }, onRetry);
      
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });
  });

  // Note: enhancedFetch tests are skipped due to AbortController mocking complexity in test environment
  // The functionality is tested through integration tests

  describe('logError', () => {
    it('should log errors with context', () => {
      // Mock NODE_ENV to development to ensure logging happens
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Test error');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      ApiErrorHandler.logError(error, 'test-context');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[test-context] UNKNOWN_ERROR:',
        expect.objectContaining({
          context: 'test-context',
          category: 'UNKNOWN_ERROR',
          message: 'Unknown error: Test error',
          timestamp: expect.any(String),
          stack: expect.any(String)
        })
      );
      
      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });
  });
});

describe('apiCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute function successfully', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');
    
    const result = await apiCall(mockFn, 'test-context');
    
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should log final error on failure', async () => {
    // Mock NODE_ENV to development to ensure logging happens
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const mockFn = vi.fn().mockRejectedValue(new Error('Persistent error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      apiCall(mockFn, 'test-context', { maxRetries: 1, baseDelay: 10 })
    ).rejects.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith(
      '[test-context] UNKNOWN_ERROR:',
      expect.objectContaining({
        context: 'test-context',
        category: 'UNKNOWN_ERROR'
      })
    );
    
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });
});