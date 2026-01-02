import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLLM } from '../../hooks/useLLM';
import { InterviewConfig, Question, UserAnswer } from '../../types';

// Mock Groq SDK
vi.mock('groq-sdk', () => {
  class MockGroq {
    chat = {
      completions: {
        create: vi.fn()
      }
    };
  }
  
  return {
    default: MockGroq,
    __esModule: true
  };
});

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

import Groq from 'groq-sdk';
import { ApiErrorHandler, apiCall } from '../../lib/apiErrorHandler';

describe('useLLM - Error Scenarios', () => {
  const mockConfig: InterviewConfig = {
    role: 'Frontend Developer',
    company: 'Test Company',
    skills: ['React', 'JavaScript'],
    proficiencyLevel: 'intermediate',
    numberOfQuestions: 5,
    questionTypes: ['technical-coding', 'behavioral']
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock environment variable
    vi.stubEnv('VITE_GROQ_API_KEY', 'test-api-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('generateQuestions errors', () => {
    it('should handle missing API key error', async () => {
      vi.stubEnv('VITE_GROQ_API_KEY', '');
      
      const authError = ApiErrorHandler.createApiError(
        'Groq API key not configured. Please check your .env file.',
        'AUTH_ERROR'
      );
      (apiCall as any).mockRejectedValue(authError);

      const { result } = renderHook(() => useLLM());

      await act(async () => {
        const questions = await result.current.generateQuestions(mockConfig);
        // Should fallback to mock questions
        expect(questions).toHaveLength(5);
        expect(questions[0]).toHaveProperty('question');
        expect(questions[0]).toHaveProperty('type');
      });

      expect(apiCall).toHaveBeenCalledWith(
        expect.any(Function),
        'groq-question-generation',
        expect.objectContaining({
          maxRetries: 2,
          retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'SERVER_ERROR', 'RATE_LIMIT_ERROR']
        })
      );
    });

    it('should handle network errors during question generation', async () => {
      const networkError = new Error('Failed to fetch');
      (apiCall as any).mockRejectedValue(networkError);
      (ApiErrorHandler.categorizeError as any).mockReturnValue({
        category: 'NETWORK_ERROR',
        userMessage: 'Unable to connect to the server. Please check your internet connection.',
        technicalMessage: 'Network error: Failed to fetch',
        shouldRetry: true
      });

      const { result } = renderHook(() => useLLM());

      await act(async () => {
        const questions = await result.current.generateQuestions(mockConfig);
        // Should fallback to mock questions
        expect(questions).toHaveLength(5);
        expect(questions[0].question).toContain('implement');
      });
    });

    it('should handle rate limit errors during question generation', async () => {
      const rateLimitError = ApiErrorHandler.createApiError('Rate limit exceeded', 'RATE_LIMIT_ERROR', 429);
      (apiCall as any).mockRejectedValue(rateLimitError);
      (ApiErrorHandler.categorizeError as any).mockReturnValue({
        category: 'RATE_LIMIT_ERROR',
        userMessage: 'Too many requests. Please wait a moment and try again.',
        technicalMessage: 'Rate limit error: Rate limit exceeded',
        shouldRetry: true
      });

      const { result } = renderHook(() => useLLM());

      await act(async () => {
        const questions = await result.current.generateQuestions(mockConfig);
        expect(questions).toHaveLength(5);
      });
    });

    it('should handle server errors during question generation', async () => {
      const serverError = ApiErrorHandler.createApiError('Internal server error', 'SERVER_ERROR', 500);
      (apiCall as any).mockRejectedValue(serverError);
      (ApiErrorHandler.categorizeError as any).mockReturnValue({
        category: 'SERVER_ERROR',
        userMessage: 'The server is experiencing issues. Please try again in a few moments.',
        technicalMessage: 'Server error (500): Internal server error',
        shouldRetry: true
      });

      const { result } = renderHook(() => useLLM());

      await act(async () => {
        const questions = await result.current.generateQuestions(mockConfig);
        expect(questions).toHaveLength(5);
      });
    });

    it('should handle timeout errors during question generation', async () => {
      const timeoutError = new Error('Request timeout');
      (apiCall as any).mockRejectedValue(timeoutError);
      (ApiErrorHandler.categorizeError as any).mockReturnValue({
        category: 'TIMEOUT_ERROR',
        userMessage: 'The request took too long to complete. Please try again.',
        technicalMessage: 'Timeout error: Request timeout',
        shouldRetry: true
      });

      const { result } = renderHook(() => useLLM());

      await act(async () => {
        const questions = await result.current.generateQuestions(mockConfig);
        expect(questions).toHaveLength(5);
      });
    });

    it('should handle invalid JSON response from API', async () => {
      const invalidJsonError = ApiErrorHandler.createApiError(
        'Invalid JSON response from API',
        'VALIDATION_ERROR'
      );
      (apiCall as any).mockRejectedValue(invalidJsonError);

      const { result } = renderHook(() => useLLM());

      await act(async () => {
        const questions = await result.current.generateQuestions(mockConfig);
        expect(questions).toHaveLength(5);
      });
    });

    it('should handle empty response from API', async () => {
      const emptyResponseError = ApiErrorHandler.createApiError(
        'No questions received from API',
        'SERVER_ERROR'
      );
      (apiCall as any).mockRejectedValue(emptyResponseError);

      const { result } = renderHook(() => useLLM());

      await act(async () => {
        const questions = await result.current.generateQuestions(mockConfig);
        expect(questions).toHaveLength(5);
      });
    });
  });

  describe('evaluateAnswers errors', () => {
    const mockQuestions: Question[] = [
      {
        id: 'q1',
        question: 'What is React?',
        type: 'technical-concepts',
        category: 'React',
        difficulty: 'intermediate',
        answer: 'React is a JavaScript library for building user interfaces.',
        explanation: 'Tests React knowledge',
        links: []
      }
    ];

    const mockAnswers: UserAnswer[] = [
      {
        questionId: 'q1',
        answer: 'React is a library for building UIs',
        timeSpent: 120
      }
    ];

    it('should handle missing API key error during evaluation', async () => {
      vi.stubEnv('VITE_GROQ_API_KEY', '');
      
      const authError = ApiErrorHandler.createApiError(
        'Groq API key not configured for evaluation',
        'AUTH_ERROR'
      );
      (apiCall as any).mockRejectedValue(authError);

      const { result } = renderHook(() => useLLM());

      await act(async () => {
        const evaluation = await result.current.evaluateAnswers(mockQuestions, mockAnswers, mockConfig);
        // Should fallback to mock evaluation
        expect(evaluation).toHaveProperty('score');
        expect(evaluation).toHaveProperty('totalQuestions', 1);
        expect(evaluation).toHaveProperty('assessedProficiency');
      });
    });

    it('should handle network errors during evaluation', async () => {
      const networkError = new Error('Failed to fetch');
      (apiCall as any).mockRejectedValue(networkError);

      const { result } = renderHook(() => useLLM());

      await act(async () => {
        const evaluation = await result.current.evaluateAnswers(mockQuestions, mockAnswers, mockConfig);
        expect(evaluation.score).toBeGreaterThanOrEqual(0);
        expect(evaluation.score).toBeLessThanOrEqual(100);
      });
    });

    it('should handle server errors during evaluation', async () => {
      const serverError = ApiErrorHandler.createApiError('Internal server error', 'SERVER_ERROR', 500);
      (apiCall as any).mockRejectedValue(serverError);

      const { result } = renderHook(() => useLLM());

      await act(async () => {
        const evaluation = await result.current.evaluateAnswers(mockQuestions, mockAnswers, mockConfig);
        expect(evaluation).toHaveProperty('feedback');
        expect(evaluation).toHaveProperty('recommendations');
        expect(Array.isArray(evaluation.recommendations)).toBe(true);
      });
    });

    it('should handle timeout errors during evaluation', async () => {
      const timeoutError = new Error('Request timeout');
      (apiCall as any).mockRejectedValue(timeoutError);

      const { result } = renderHook(() => useLLM());

      await act(async () => {
        const evaluation = await result.current.evaluateAnswers(mockQuestions, mockAnswers, mockConfig);
        expect(evaluation.totalQuestions).toBe(1);
        expect(evaluation).toHaveProperty('categoryScores');
        expect(evaluation).toHaveProperty('typeScores');
      });
    });

    it('should handle invalid JSON response during evaluation', async () => {
      const invalidJsonError = ApiErrorHandler.createApiError(
        'Invalid JSON response from API',
        'VALIDATION_ERROR'
      );
      (apiCall as any).mockRejectedValue(invalidJsonError);

      const { result } = renderHook(() => useLLM());

      await act(async () => {
        const evaluation = await result.current.evaluateAnswers(mockQuestions, mockAnswers, mockConfig);
        expect(evaluation).toHaveProperty('questionBreakdown');
        expect(evaluation.questionBreakdown).toHaveProperty('correct');
        expect(evaluation.questionBreakdown).toHaveProperty('incorrect');
        expect(evaluation.questionBreakdown).toHaveProperty('partiallyCorrect');
        expect(evaluation.questionBreakdown).toHaveProperty('unanswered');
      });
    });

    it('should handle rate limit errors during evaluation', async () => {
      const rateLimitError = ApiErrorHandler.createApiError('Rate limit exceeded', 'RATE_LIMIT_ERROR', 429);
      (apiCall as any).mockRejectedValue(rateLimitError);

      const { result } = renderHook(() => useLLM());

      await act(async () => {
        const evaluation = await result.current.evaluateAnswers(mockQuestions, mockAnswers, mockConfig);
        expect(evaluation.score).toBeTypeOf('number');
        expect(evaluation.assessedProficiency).toMatch(/^(beginner|intermediate|advanced|expert)$/);
      });
    });
  });

  describe('loading state management', () => {
    it('should set loading to false after successful question generation', async () => {
      (apiCall as any).mockResolvedValue([
        {
          id: 'q1',
          question: 'Test question',
          type: 'technical-coding',
          category: 'React',
          difficulty: 'intermediate',
          answer: 'Test answer',
          explanation: 'Test explanation',
          links: []
        }
      ]);

      const { result } = renderHook(() => useLLM());

      expect(result.current.loading).toBe(false);

      await act(async () => {
        await result.current.generateQuestions(mockConfig);
      });

      expect(result.current.loading).toBe(false);
    });

    it('should set loading to false after failed question generation', async () => {
      (apiCall as any).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useLLM());

      expect(result.current.loading).toBe(false);

      await act(async () => {
        await result.current.generateQuestions(mockConfig);
      });

      expect(result.current.loading).toBe(false);
    });

    it('should set loading to false after successful evaluation', async () => {
      (apiCall as any).mockResolvedValue({
        score: 85,
        totalQuestions: 1,
        assessedProficiency: 'advanced',
        categoryScores: { React: 85 },
        typeScores: { 'technical-concepts': 85 },
        feedback: 'Good job',
        recommendations: ['Keep practicing']
      });

      const { result } = renderHook(() => useLLM());

      await act(async () => {
        await result.current.evaluateAnswers([], [], mockConfig);
      });

      expect(result.current.loading).toBe(false);
    });

    it('should set loading to false after failed evaluation', async () => {
      (apiCall as any).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useLLM());

      await act(async () => {
        await result.current.evaluateAnswers([], [], mockConfig);
      });

      expect(result.current.loading).toBe(false);
    });
  });
});