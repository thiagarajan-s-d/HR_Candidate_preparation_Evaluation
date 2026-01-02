/**
 * Enhanced API error handling utilities with retry logic and specific error messages
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface ApiError extends Error {
  code?: string;
  status?: number;
  isRetryable?: boolean;
  originalError?: Error;
}

export class ApiErrorHandler {
  private static defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'SERVER_ERROR',
      'RATE_LIMIT_ERROR',
      'TEMPORARY_FAILURE'
    ]
  };

  /**
   * Creates a specific API error with enhanced information
   */
  static createApiError(
    message: string,
    code?: string,
    status?: number,
    originalError?: Error
  ): ApiError {
    const error = new Error(message) as ApiError;
    error.name = 'ApiError';
    error.code = code;
    error.status = status;
    error.originalError = originalError;
    error.isRetryable = this.isRetryableError(code, status);
    
    return error;
  }

  /**
   * Determines if an error is retryable based on code and status
   */
  static isRetryableError(code?: string, status?: number): boolean {
    if (code && this.defaultRetryConfig.retryableErrors.includes(code)) {
      return true;
    }
    
    if (status) {
      // Retry on server errors (5xx) and some client errors
      return status >= 500 || status === 408 || status === 429;
    }
    
    return false;
  }

  /**
   * Categorizes errors and provides user-friendly messages
   */
  static categorizeError(error: Error | ApiError): {
    category: string;
    userMessage: string;
    technicalMessage: string;
    shouldRetry: boolean;
  } {
    const apiError = error as ApiError;
    
    // Network/Connection errors
    if (error.message.includes('fetch') || error.message.includes('network') || 
        error.message.includes('Failed to fetch')) {
      return {
        category: 'NETWORK_ERROR',
        userMessage: 'Unable to connect to the server. Please check your internet connection and try again.',
        technicalMessage: `Network error: ${error.message}`,
        shouldRetry: true
      };
    }
    
    // Timeout errors
    if (error.message.includes('timeout') || error.message.includes('aborted')) {
      return {
        category: 'TIMEOUT_ERROR',
        userMessage: 'The request took too long to complete. Please try again.',
        technicalMessage: `Timeout error: ${error.message}`,
        shouldRetry: true
      };
    }
    
    // API key errors
    if (error.message.includes('API key') || error.message.includes('authentication') ||
        error.message.includes('unauthorized') || apiError.status === 401) {
      return {
        category: 'AUTH_ERROR',
        userMessage: 'Authentication failed. Please check your API configuration.',
        technicalMessage: `Authentication error: ${error.message}`,
        shouldRetry: false
      };
    }
    
    // Rate limiting
    if (error.message.includes('rate limit') || apiError.status === 429) {
      return {
        category: 'RATE_LIMIT_ERROR',
        userMessage: 'Too many requests. Please wait a moment and try again.',
        technicalMessage: `Rate limit error: ${error.message}`,
        shouldRetry: true
      };
    }
    
    // Server errors
    if (apiError.status && apiError.status >= 500) {
      return {
        category: 'SERVER_ERROR',
        userMessage: 'The server is experiencing issues. Please try again in a few moments.',
        technicalMessage: `Server error (${apiError.status}): ${error.message}`,
        shouldRetry: true
      };
    }
    
    // Validation errors
    if (apiError.status === 400 || error.message.includes('validation') || 
        error.message.includes('invalid')) {
      return {
        category: 'VALIDATION_ERROR',
        userMessage: 'The request contains invalid data. Please check your input and try again.',
        technicalMessage: `Validation error: ${error.message}`,
        shouldRetry: false
      };
    }
    
    // Database connection errors
    if (error.message.includes('database') || error.message.includes('connection') ||
        error.message.includes('ECONNREFUSED')) {
      return {
        category: 'DATABASE_ERROR',
        userMessage: 'Database connection failed. Please try again later.',
        technicalMessage: `Database error: ${error.message}`,
        shouldRetry: true
      };
    }
    
    // Generic errors
    return {
      category: 'UNKNOWN_ERROR',
      userMessage: 'An unexpected error occurred. Please try again.',
      technicalMessage: `Unknown error: ${error.message}`,
      shouldRetry: false
    };
  }

  /**
   * Implements exponential backoff with jitter
   */
  static calculateDelay(attempt: number, config: RetryConfig = this.defaultRetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    const delay = Math.min(exponentialDelay + jitter, config.maxDelay);
    
    return Math.floor(delay);
  }

  /**
   * Executes a function with retry logic
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: Error;
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        const errorInfo = this.categorizeError(lastError);
        
        // Don't retry if it's the last attempt or error is not retryable
        if (attempt === retryConfig.maxRetries || !errorInfo.shouldRetry) {
          console.error(`Final attempt failed (${attempt + 1}/${retryConfig.maxRetries + 1}):`, errorInfo.technicalMessage);
          throw this.createApiError(
            errorInfo.userMessage,
            errorInfo.category,
            (lastError as ApiError).status,
            lastError
          );
        }
        
        const delay = this.calculateDelay(attempt, retryConfig);
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, errorInfo.technicalMessage);
        
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }
        
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Sleep utility for delays
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enhanced fetch wrapper with timeout and error handling
   */
  static async enhancedFetch(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw this.createApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status >= 500 ? 'SERVER_ERROR' : 'CLIENT_ERROR',
          response.status
        );
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw this.createApiError(
          'Request timeout',
          'TIMEOUT_ERROR'
        );
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw this.createApiError(
          'Network connection failed',
          'NETWORK_ERROR',
          undefined,
          error
        );
      }
      
      throw error;
    }
  }

  /**
   * Logs errors with appropriate level and context
   */
  static logError(error: Error | ApiError, context: string): void {
    const errorInfo = this.categorizeError(error);
    const logData = {
      context,
      category: errorInfo.category,
      message: errorInfo.technicalMessage,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };
    
    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${context}] ${errorInfo.category}:`, logData);
    }
    
    // In production, you would send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, { extra: logData });
    }
  }
}

/**
 * Convenience function for API calls with retry
 */
export async function apiCall<T>(
  fn: () => Promise<T>,
  context: string,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  try {
    return await ApiErrorHandler.withRetry(
      fn,
      retryConfig,
      (attempt, error) => {
        console.log(`[${context}] Retry attempt ${attempt} after error:`, error.message);
      }
    );
  } catch (error) {
    ApiErrorHandler.logError(error as Error, context);
    throw error;
  }
}