/**
 * Unit tests for question navigation functionality
 * Tests previous/next navigation, skip functionality, navigation to skipped questions, and finish button enablement
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('Question Navigation Unit Tests', () => {
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
    mode: 'learn' as AppMode,
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Previous/Next Navigation (Requirements 14.1, 14.2)', () => {
    it('should enable previous button when not on first question', () => {
      render(
        <QuestionView
          {...mockProps}
          currentIndex={2}
        />
      );

      const previousButton = screen.getByRole('button', { name: /previous/i });
      expect(previousButton).toBeEnabled();
    });

    it('should disable previous button when on first question', () => {
      render(
        <QuestionView
          {...mockProps}
          currentIndex={0}
        />
      );

      const previousButton = screen.getByRole('button', { name: /previous/i });
      expect(previousButton).toBeDisabled();
    });

    it('should call onPrevious when previous button is clicked', () => {
      render(
        <QuestionView
          {...mockProps}
          currentIndex={2}
        />
      );

      const previousButton = screen.getByRole('button', { name: /previous/i });
      fireEvent.click(previousButton);

      expect(mockProps.onPrevious).toHaveBeenCalledTimes(1);
    });

    it('should show "Next" button when not on last question', () => {
      render(
        <QuestionView
          {...mockProps}
          currentIndex={2}
          totalQuestions={5}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeInTheDocument();
    });

    it('should show "Complete" button when on last question without completed initial pass', () => {
      render(
        <QuestionView
          {...mockProps}
          currentIndex={4}
          totalQuestions={5}
          hasCompletedInitialPass={false}
        />
      );

      const completeButton = screen.getByRole('button', { name: /complete/i });
      expect(completeButton).toBeInTheDocument();
    });

    it('should call onNext when next button is clicked', () => {
      render(
        <QuestionView
          {...mockProps}
          currentIndex={2}
          canNavigate={true}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      expect(mockProps.onNext).toHaveBeenCalledTimes(1);
    });

    it('should disable next button when canNavigate is false', () => {
      render(
        <QuestionView
          {...mockProps}
          currentIndex={2}
          canNavigate={false}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Skip Functionality (Requirements 14.3)', () => {
    it('should show skip button in mock and evaluate modes', () => {
      render(
        <QuestionView
          {...mockProps}
          mode="mock"
        />
      );

      const skipButton = screen.getByRole('button', { name: /skip question/i });
      expect(skipButton).toBeInTheDocument();
    });

    it('should call onSkip when skip button is clicked', () => {
      render(
        <QuestionView
          {...mockProps}
          mode="mock"
        />
      );

      const skipButton = screen.getByRole('button', { name: /skip question/i });
      fireEvent.click(skipButton);

      expect(mockProps.onSkip).toHaveBeenCalledTimes(1);
    });

    it('should remove skip button after answer is submitted', async () => {
      render(
        <QuestionView
          {...mockProps}
          mode="mock"
        />
      );

      // Type an answer
      const textarea = screen.getByPlaceholderText(/type your answer here/i);
      fireEvent.change(textarea, { target: { value: 'Test answer' } });

      // Submit the answer
      const submitButton = screen.getByRole('button', { name: /submit answer/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const skipButton = screen.queryByRole('button', { name: /skip question/i });
        expect(skipButton).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Navigation to Skipped Questions (Requirements 14.4)', () => {
    it('should show "Review Skipped" button when there are skipped questions and initial pass is complete', () => {
      const skippedQuestions = new Set([1, 3]);
      
      render(
        <QuestionView
          {...mockProps}
          currentIndex={4}
          totalQuestions={5}
          skippedQuestions={skippedQuestions}
          hasCompletedInitialPass={true}
        />
      );

      const reviewSkippedButton = screen.getByRole('button', { name: /review skipped \(2\)/i });
      expect(reviewSkippedButton).toBeInTheDocument();
    });

    it('should call onNext when "Review Skipped" button is clicked', () => {
      const skippedQuestions = new Set([1, 3]);
      
      render(
        <QuestionView
          {...mockProps}
          currentIndex={4}
          totalQuestions={5}
          skippedQuestions={skippedQuestions}
          hasCompletedInitialPass={true}
        />
      );

      const reviewSkippedButton = screen.getByRole('button', { name: /review skipped \(2\)/i });
      fireEvent.click(reviewSkippedButton);

      expect(mockProps.onNext).toHaveBeenCalledTimes(1);
    });

    it('should not show "Review Skipped" button when no questions are skipped', () => {
      render(
        <QuestionView
          {...mockProps}
          currentIndex={4}
          totalQuestions={5}
          skippedQuestions={new Set()}
          hasCompletedInitialPass={true}
        />
      );

      const reviewSkippedButton = screen.queryByRole('button', { name: /review skipped/i });
      expect(reviewSkippedButton).not.toBeInTheDocument();
    });

    it('should show correct number of skipped questions in button text', () => {
      const skippedQuestions = new Set([0, 2, 4]);
      
      render(
        <QuestionView
          {...mockProps}
          currentIndex={4}
          totalQuestions={5}
          skippedQuestions={skippedQuestions}
          hasCompletedInitialPass={true}
        />
      );

      const reviewSkippedButton = screen.getByRole('button', { name: /review skipped \(3\)/i });
      expect(reviewSkippedButton).toBeInTheDocument();
    });
  });

  describe('Finish Button Enablement (Requirements 14.5)', () => {
    it('should show "Finish Assessment" button when initial pass is completed', () => {
      render(
        <QuestionView
          {...mockProps}
          currentIndex={4}
          totalQuestions={5}
          hasCompletedInitialPass={true}
        />
      );

      const finishButton = screen.getByRole('button', { name: /finish assessment/i });
      expect(finishButton).toBeInTheDocument();
    });

    it('should call onFinish when "Finish Assessment" button is clicked', () => {
      render(
        <QuestionView
          {...mockProps}
          currentIndex={4}
          totalQuestions={5}
          hasCompletedInitialPass={true}
        />
      );

      const finishButton = screen.getByRole('button', { name: /finish assessment/i });
      fireEvent.click(finishButton);

      expect(mockProps.onFinish).toHaveBeenCalledTimes(1);
    });

    it('should not show "Finish Assessment" button when initial pass is not completed', () => {
      render(
        <QuestionView
          {...mockProps}
          currentIndex={2}
          totalQuestions={5}
          hasCompletedInitialPass={false}
        />
      );

      const finishButton = screen.queryByRole('button', { name: /finish assessment/i });
      expect(finishButton).not.toBeInTheDocument();
    });

    it('should call onFinish with current answer when finishing with unsaved answer', async () => {
      render(
        <QuestionView
          {...mockProps}
          mode="mock"
          currentIndex={4}
          totalQuestions={5}
          hasCompletedInitialPass={true}
        />
      );

      // Type an answer but don't submit
      const textarea = screen.getByPlaceholderText(/type your answer here/i);
      fireEvent.change(textarea, { target: { value: 'Final answer' } });

      const finishButton = screen.getByRole('button', { name: /finish assessment/i });
      fireEvent.click(finishButton);

      expect(mockProps.onFinish).toHaveBeenCalledWith('Final answer', expect.any(Number));
    });
  });

  describe('Progress Indicators', () => {
    it('should show correct progress dots for current, completed, and skipped questions', () => {
      const skippedQuestions = new Set([1, 3]);
      
      render(
        <QuestionView
          {...mockProps}
          currentIndex={2}
          totalQuestions={5}
          skippedQuestions={skippedQuestions}
        />
      );

      // Check that we have 5 progress dots
      const progressDots = screen.getAllByRole('generic').filter(el => 
        el.className.includes('w-3 h-3 rounded-full')
      );
      expect(progressDots).toHaveLength(5);
    });

    it('should apply correct styling to current question dot', () => {
      render(
        <QuestionView
          {...mockProps}
          currentIndex={2}
          totalQuestions={5}
        />
      );

      // Find the progress dots container by looking for the specific container with progress dots
      const progressDots = screen.getAllByTitle(/current|completed|pending|skipped/i);
      expect(progressDots).toHaveLength(5);

      // Check that the current question dot (index 2) has the correct styling
      const currentDot = screen.getByTitle('Current');
      expect(currentDot).toHaveClass('bg-blue-600');
    });

    it('should apply correct styling to skipped question dots', () => {
      const skippedQuestions = new Set([1]);
      
      render(
        <QuestionView
          {...mockProps}
          currentIndex={2}
          totalQuestions={5}
          skippedQuestions={skippedQuestions}
        />
      );

      // Check that skipped questions have yellow background
      const skippedDot = screen.getByTitle('Skipped');
      expect(skippedDot).toHaveClass('bg-yellow-500');
    });
  });

  describe('Navigation State Preservation', () => {
    it('should preserve navigation state when moving between questions', () => {
      const { rerender } = render(
        <QuestionView
          {...mockProps}
          currentIndex={0}
        />
      );

      // Verify initial state
      const previousButton = screen.getByRole('button', { name: /previous/i });
      expect(previousButton).toBeDisabled();

      // Move to next question
      rerender(
        <QuestionView
          {...mockProps}
          currentIndex={1}
        />
      );

      // Previous button should now be enabled
      const updatedPreviousButton = screen.getByRole('button', { name: /previous/i });
      expect(updatedPreviousButton).toBeEnabled();
    });

    it('should maintain skip state across navigation', () => {
      const skippedQuestions = new Set([0, 2]);
      
      render(
        <QuestionView
          {...mockProps}
          currentIndex={1}
          skippedQuestions={skippedQuestions}
        />
      );

      // Check that skipped questions are reflected in progress indicators
      const skippedDots = screen.getAllByTitle('Skipped');
      expect(skippedDots).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle navigation when totalQuestions is 1', () => {
      render(
        <QuestionView
          {...mockProps}
          currentIndex={0}
          totalQuestions={1}
        />
      );

      const previousButton = screen.getByRole('button', { name: /previous/i });
      expect(previousButton).toBeDisabled();

      const nextButton = screen.getByRole('button', { name: /complete/i });
      expect(nextButton).toBeInTheDocument();
    });

    it('should handle empty skipped questions set', () => {
      render(
        <QuestionView
          {...mockProps}
          currentIndex={4}
          totalQuestions={5}
          skippedQuestions={new Set()}
          hasCompletedInitialPass={true}
        />
      );

      const reviewSkippedButton = screen.queryByRole('button', { name: /review skipped/i });
      expect(reviewSkippedButton).not.toBeInTheDocument();

      const finishButton = screen.getByRole('button', { name: /finish assessment/i });
      expect(finishButton).toBeInTheDocument();
    });

    it('should handle navigation when canNavigate changes dynamically', () => {
      const { rerender } = render(
        <QuestionView
          {...mockProps}
          currentIndex={2}
          canNavigate={false}
        />
      );

      let nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();

      rerender(
        <QuestionView
          {...mockProps}
          currentIndex={2}
          canNavigate={true}
        />
      );

      nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeEnabled();
    });
  });
});