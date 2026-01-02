/**
 * Unit tests for timer edge cases
 * Tests timer cleanup on unmount, timer behavior with rapid navigation, and total assessment timeout
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QuestionView } from '../../components/QuestionView';
import { Question, AppMode } from '../../types';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock Groq SDK to avoid API calls in tests
vi.mock('groq-sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mock generated answer' } }]
        })
      }
    }
  }))
}));

describe('Timer Edge Cases Unit Tests', () => {
  const mockQuestion: Question = {
    id: 'test-question-1',
    question: 'What is React?',
    category: 'Frontend',
    difficulty: 'intermediate',
    type: 'technical-concepts',
    answer: 'React is a JavaScript library for building user interfaces.',
    explanation: 'React helps create interactive UIs.',
    links: ['https://reactjs.org']
  };

  const mockProps = {
    question: mockQuestion,
    mode: 'mock' as AppMode,
    currentIndex: 0,
    totalQuestions: 5,
    onAnswer: vi.fn(),
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    onSkip: vi.fn(),
    onFinish: vi.fn(),
    canNavigate: true,
    isInvitedCandidate: false,
    skippedQuestions: new Set<number>(),
    hasCompletedInitialPass: false,
    assessmentStartTime: Date.now(),
    questionStartTime: Date.now(),
    questionTimeLimit: 300
  };

  // Store original timer functions
  let originalSetInterval: typeof setInterval;
  let originalClearInterval: typeof clearInterval;
  let originalDateNow: typeof Date.now;

  // Mock timer tracking
  let mockTimers: Map<number, NodeJS.Timeout>;
  let nextTimerId: number;
  let currentTime: number;

  beforeEach(() => {
    // Store original functions
    originalSetInterval = global.setInterval;
    originalClearInterval = global.clearInterval;
    originalDateNow = Date.now;

    // Initialize mock timer state
    mockTimers = new Map();
    nextTimerId = 1;
    currentTime = Date.now();

    // Mock setInterval to track timers
    global.setInterval = vi.fn().mockImplementation((callback: () => void, interval: number) => {
      const id = nextTimerId++;
      const timer = originalSetInterval(callback, interval);
      mockTimers.set(id, timer);
      return id as any;
    });

    // Mock clearInterval to track cleanup
    global.clearInterval = vi.fn().mockImplementation((id: number) => {
      const timer = mockTimers.get(id);
      if (timer) {
        originalClearInterval(timer);
        mockTimers.delete(id);
      }
    });

    // Mock Date.now for controlled time progression
    Date.now = vi.fn().mockImplementation(() => currentTime);

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any remaining timers
    mockTimers.forEach((timer) => {
      originalClearInterval(timer);
    });
    mockTimers.clear();

    // Restore original functions
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    Date.now = originalDateNow;

    cleanup();
  });

  describe('Timer Cleanup on Unmount (Requirement 6.1)', () => {
    it('should clean up question timer when component unmounts', async () => {
      const { unmount } = render(
        <QuestionView
          {...mockProps}
          questionStartTime={currentTime}
          questionTimeLimit={60}
        />
      );

      // Verify timers were created
      expect(global.setInterval).toHaveBeenCalled();
      const initialTimerCount = mockTimers.size;
      expect(initialTimerCount).toBeGreaterThan(0);

      // Unmount the component
      unmount();

      // Verify timers were cleaned up
      await waitFor(() => {
        expect(global.clearInterval).toHaveBeenCalled();
      });

      // Check that clearInterval was called at least as many times as timers created
      // (may be more due to React's cleanup behavior)
      expect(vi.mocked(global.clearInterval).mock.calls.length).toBeGreaterThanOrEqual(initialTimerCount);
    });

    it('should clean up assessment timer when component unmounts', async () => {
      const { unmount } = render(
        <QuestionView
          {...mockProps}
          assessmentStartTime={currentTime}
          questionStartTime={currentTime}
        />
      );

      // Verify both question and assessment timers were created
      expect(global.setInterval).toHaveBeenCalledTimes(2);
      const initialTimerCount = mockTimers.size;
      expect(initialTimerCount).toBe(2);

      // Unmount the component
      unmount();

      // Verify all timers were cleaned up
      await waitFor(() => {
        expect(global.clearInterval).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle unmount when no assessment timer exists', async () => {
      const { unmount } = render(
        <QuestionView
          {...mockProps}
          assessmentStartTime={null}
          questionStartTime={currentTime}
        />
      );

      // Verify only question timer was created
      expect(global.setInterval).toHaveBeenCalledTimes(1);
      const initialTimerCount = mockTimers.size;
      expect(initialTimerCount).toBe(1);

      // Unmount the component
      unmount();

      // Verify timer was cleaned up
      await waitFor(() => {
        expect(global.clearInterval).toHaveBeenCalledTimes(1);
      });
    });

    it('should not cause errors when unmounting multiple times', async () => {
      const { unmount } = render(
        <QuestionView
          {...mockProps}
          questionStartTime={currentTime}
        />
      );

      // First unmount
      unmount();

      // Verify no errors occur and cleanup was called
      await waitFor(() => {
        expect(global.clearInterval).toHaveBeenCalled();
      });

      // Second unmount should not cause errors (component already unmounted)
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Timer Behavior with Rapid Navigation (Requirement 6.2)', () => {
    it('should handle rapid question changes without timer conflicts', async () => {
      const { rerender } = render(
        <QuestionView
          {...mockProps}
          currentIndex={0}
          questionStartTime={currentTime}
          questionTimeLimit={60}
        />
      );

      // Simulate rapid navigation by changing currentIndex quickly
      const navigationSequence = [1, 2, 3, 2, 1, 0, 4];
      
      for (const index of navigationSequence) {
        // Advance time slightly for each navigation
        currentTime += 100; // 100ms between navigations
        
        rerender(
          <QuestionView
            {...mockProps}
            currentIndex={index}
            questionStartTime={currentTime}
            questionTimeLimit={60}
          />
        );

        // Small delay to allow timer effects to process
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Verify that timers are still functioning correctly
      expect(global.setInterval).toHaveBeenCalled();
      expect(mockTimers.size).toBeGreaterThan(0);

      // Verify no errors occurred during rapid navigation
      expect(vi.mocked(mockProps.onSkip)).not.toHaveBeenCalled();
    });

    it('should reset question timer when navigating to different question', async () => {
      const { rerender } = render(
        <QuestionView
          {...mockProps}
          currentIndex={0}
          questionStartTime={currentTime}
          questionTimeLimit={60}
        />
      );

      const initialSetIntervalCalls = vi.mocked(global.setInterval).mock.calls.length;

      // Navigate to next question with new start time
      const newStartTime = currentTime + 5000; // 5 seconds later
      currentTime = newStartTime;

      rerender(
        <QuestionView
          {...mockProps}
          currentIndex={1}
          questionStartTime={newStartTime}
          questionTimeLimit={60}
        />
      );

      // Verify new timer was created for the new question
      await waitFor(() => {
        expect(global.setInterval).toHaveBeenCalledTimes(initialSetIntervalCalls + 2); // +2 for new question and assessment timers
      });
    });

    it('should handle navigation during timer countdown without skipping wrong question', async () => {
      let skipCallCount = 0;
      const onSkipMock = vi.fn(() => {
        skipCallCount++;
      });

      const { rerender } = render(
        <QuestionView
          {...mockProps}
          currentIndex={0}
          questionStartTime={currentTime}
          questionTimeLimit={2} // 2 second limit for quick test
          onSkip={onSkipMock}
        />
      );

      // Advance time to near the limit
      currentTime += 1500; // 1.5 seconds

      // Navigate to different question
      rerender(
        <QuestionView
          {...mockProps}
          currentIndex={1}
          questionStartTime={currentTime}
          questionTimeLimit={2}
          onSkip={onSkipMock}
        />
      );

      // Advance time past original question's limit
      currentTime += 1000; // Total 2.5 seconds from original start

      // Wait for any timer callbacks
      await new Promise(resolve => setTimeout(resolve, 50));

      // The skip should not be called for the wrong question
      // (This tests that timers are properly cleaned up during navigation)
      expect(skipCallCount).toBe(0);
    });

    it('should maintain separate timers for question and assessment during rapid navigation', async () => {
      const assessmentStart = currentTime;
      
      const { rerender } = render(
        <QuestionView
          {...mockProps}
          currentIndex={0}
          questionStartTime={currentTime}
          assessmentStartTime={assessmentStart}
          questionTimeLimit={60}
        />
      );

      // Perform rapid navigation
      for (let i = 1; i <= 5; i++) {
        currentTime += 200; // 200ms between navigations
        
        rerender(
          <QuestionView
            {...mockProps}
            currentIndex={i % 3}
            questionStartTime={currentTime}
            assessmentStartTime={assessmentStart} // Assessment start time stays the same
            questionTimeLimit={60}
          />
        );

        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Verify that both question and assessment timers are still active
      expect(mockTimers.size).toBeGreaterThan(0);
      
      // Assessment timer should persist through navigation
      expect(global.setInterval).toHaveBeenCalled();
    });
  });

  describe('Total Assessment Timeout (Requirements 6.3, 6.4)', () => {
    it('should auto-finish assessment when 1 hour limit is exceeded', async () => {
      const assessmentStart = currentTime;
      
      render(
        <QuestionView
          {...mockProps}
          assessmentStartTime={assessmentStart}
          questionStartTime={currentTime}
        />
      );

      // Advance time to exactly 1 hour (3600 seconds)
      currentTime = assessmentStart + (3600 * 1000);

      // Wait for timer callback to execute
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait longer than timer interval

      // Verify onFinish was called due to time limit
      await waitFor(() => {
        expect(mockProps.onFinish).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should not auto-finish assessment before 1 hour limit', async () => {
      const assessmentStart = currentTime;
      
      render(
        <QuestionView
          {...mockProps}
          assessmentStartTime={assessmentStart}
          questionStartTime={currentTime}
        />
      );

      // Advance time to just under 1 hour (59 minutes)
      currentTime = assessmentStart + (59 * 60 * 1000);

      // Wait for timer callback
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Verify onFinish was NOT called
      expect(mockProps.onFinish).not.toHaveBeenCalled();
    });

    it('should handle assessment timeout during rapid navigation', async () => {
      const assessmentStart = currentTime;
      
      const { rerender } = render(
        <QuestionView
          {...mockProps}
          assessmentStartTime={assessmentStart}
          questionStartTime={currentTime}
        />
      );

      // Perform navigation while approaching time limit
      for (let i = 0; i < 5; i++) {
        // Advance time by 12 minutes each iteration (total 60 minutes)
        currentTime = assessmentStart + ((i + 1) * 12 * 60 * 1000);
        
        rerender(
          <QuestionView
            {...mockProps}
            currentIndex={i}
            assessmentStartTime={assessmentStart}
            questionStartTime={currentTime}
          />
        );

        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Now exceed the 1 hour limit
      currentTime = assessmentStart + (3601 * 1000); // 1 hour + 1 second

      // Wait for timer callback
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Verify assessment was finished
      await waitFor(() => {
        expect(mockProps.onFinish).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should continue tracking total time across question changes', async () => {
      const assessmentStart = currentTime;
      
      const { rerender } = render(
        <QuestionView
          {...mockProps}
          assessmentStartTime={assessmentStart}
          questionStartTime={currentTime}
        />
      );

      // Navigate through multiple questions over time
      const questionTimes = [
        5 * 60 * 1000,  // 5 minutes
        15 * 60 * 1000, // 15 minutes total
        30 * 60 * 1000, // 30 minutes total
        45 * 60 * 1000, // 45 minutes total
      ];

      for (let i = 0; i < questionTimes.length; i++) {
        currentTime = assessmentStart + questionTimes[i];
        
        rerender(
          <QuestionView
            {...mockProps}
            currentIndex={i}
            assessmentStartTime={assessmentStart}
            questionStartTime={currentTime}
          />
        );

        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Verify assessment hasn't finished yet
        expect(mockProps.onFinish).not.toHaveBeenCalled();
      }

      // Now exceed 1 hour
      currentTime = assessmentStart + (3605 * 1000); // 1 hour + 5 seconds

      // Wait for timer callback
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Verify assessment finished
      await waitFor(() => {
        expect(mockProps.onFinish).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should not create assessment timer when assessmentStartTime is null', async () => {
      render(
        <QuestionView
          {...mockProps}
          assessmentStartTime={null}
          questionStartTime={currentTime}
        />
      );

      // Only question timer should be created (1 call to setInterval)
      expect(global.setInterval).toHaveBeenCalledTimes(1);

      // Advance time way past 1 hour
      currentTime += (2 * 3600 * 1000); // 2 hours

      // Wait for any potential callbacks
      await new Promise(resolve => setTimeout(resolve, 1100));

      // onFinish should not be called since no assessment timer exists
      expect(mockProps.onFinish).not.toHaveBeenCalled();
    });
  });

  describe('Timer Memory Leaks and Edge Cases', () => {
    it('should not accumulate timers during multiple re-renders', async () => {
      const { rerender, unmount } = render(
        <QuestionView
          {...mockProps}
          questionStartTime={currentTime}
        />
      );

      const initialTimerCount = mockTimers.size;

      // Perform multiple re-renders
      for (let i = 0; i < 10; i++) {
        rerender(
          <QuestionView
            {...mockProps}
            questionStartTime={currentTime + (i * 1000)}
            currentIndex={i % 3}
          />
        );
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      // Timer count should not grow excessively
      expect(mockTimers.size).toBeLessThanOrEqual(initialTimerCount + 2); // Allow for some timer recreation

      unmount();

      // All timers should be cleaned up
      await waitFor(() => {
        expect(global.clearInterval).toHaveBeenCalled();
      });
    });

    it('should handle timer cleanup when component unmounts during timer callback', async () => {
      const { unmount } = render(
        <QuestionView
          {...mockProps}
          questionStartTime={currentTime}
          questionTimeLimit={1} // Very short limit
        />
      );

      // Unmount immediately
      unmount();

      // Advance time to trigger what would have been a timer callback
      currentTime += 2000;

      // Wait to ensure no errors occur
      await new Promise(resolve => setTimeout(resolve, 100));

      // onSkip should not be called after unmount
      expect(mockProps.onSkip).not.toHaveBeenCalled();
    });

    it('should handle zero or negative time limits gracefully', async () => {
      render(
        <QuestionView
          {...mockProps}
          questionStartTime={currentTime}
          questionTimeLimit={0} // Zero time limit
        />
      );

      // Wait for timer callback
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should handle gracefully without errors
      expect(global.setInterval).toHaveBeenCalled();
    });
  });
});