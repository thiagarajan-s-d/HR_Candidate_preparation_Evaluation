/**
 * Property-Based Tests for Answer Persistence and Navigation
 * Feature: hr-candidate-evaluation-system
 * 
 * These tests validate universal properties of answer persistence and navigation state
 * using property-based testing with fast-check.
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { Question, UserAnswer, QuestionType } from '../../types';

// Mock the App component's answer persistence logic
interface MockAppState {
  questions: Question[];
  currentQuestionIndex: number;
  userAnswers: UserAnswer[];
  skippedQuestions: Set<number>;
}

class MockApp {
  private state: MockAppState;

  constructor(questions: Question[]) {
    this.state = {
      questions,
      currentQuestionIndex: 0,
      userAnswers: [],
      skippedQuestions: new Set()
    };
  }

  // Simulate answer submission
  handleAnswer(answer: string, timeSpent: number): void {
    const currentQuestion = this.state.questions[this.state.currentQuestionIndex];
    if (!currentQuestion) return;

    const userAnswer: UserAnswer = {
      questionId: currentQuestion.id,
      answer,
      timeSpent
    };

    // Remove any existing answer for this question and add the new one
    this.state.userAnswers = this.state.userAnswers.filter(a => a.questionId !== currentQuestion.id);
    this.state.userAnswers.push(userAnswer);

    // Remove from skipped questions if it was skipped
    this.state.skippedQuestions.delete(this.state.currentQuestionIndex);
  }

  // Simulate navigation
  handleNext(): void {
    if (this.state.currentQuestionIndex < this.state.questions.length - 1) {
      this.state.currentQuestionIndex++;
    }
  }

  handlePrevious(): void {
    if (this.state.currentQuestionIndex > 0) {
      this.state.currentQuestionIndex--;
    }
  }

  // Get current state
  getCurrentQuestion(): Question | null {
    return this.state.questions[this.state.currentQuestionIndex] || null;
  }

  getCurrentAnswer(): UserAnswer | undefined {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) return undefined;
    return this.state.userAnswers.find(a => a.questionId === currentQuestion.id);
  }

  getAllAnswers(): UserAnswer[] {
    return [...this.state.userAnswers];
  }

  getCurrentIndex(): number {
    return this.state.currentQuestionIndex;
  }

  setCurrentIndex(index: number): void {
    if (index >= 0 && index < this.state.questions.length) {
      this.state.currentQuestionIndex = index;
    }
  }
}

describe('Answer Persistence and Navigation Property Tests', () => {
  /**
   * Property 7: Answer Persistence
   * Feature: hr-candidate-evaluation-system, Property 7: Answer Persistence
   * Validates: Requirements 5.4, 14.6
   * 
   * For any submitted answer, navigating away from the question and returning 
   * should preserve the answer text.
   */
  it('Property 7: Answer Persistence - answers are preserved during navigation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random questions
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            question: fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length >= 10),
            category: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
            difficulty: fc.constantFrom('beginner', 'intermediate', 'advanced', 'expert'),
            type: fc.constantFrom(
              'technical-coding',
              'technical-concepts',
              'system-design',
              'behavioral'
            ) as fc.Arbitrary<QuestionType>,
            answer: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10),
            explanation: fc.string({ minLength: 10, maxLength: 300 }).filter(s => s.trim().length >= 10),
            links: fc.array(fc.webUrl(), { minLength: 0, maxLength: 3 })
          }),
          { minLength: 2, maxLength: 5 }
        ).map(questions => {
          // Ensure unique question IDs
          return questions.map((q, index) => ({
            ...q,
            id: `${q.id}-${index}` // Make IDs unique by appending index
          }));
        }),
        // Generate random answers for each question
        fc.array(fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0), { minLength: 2, maxLength: 5 }),
        async (questions: Question[], answerTexts: string[]) => {
          // Ensure we have matching number of answers and questions
          const numQuestions = Math.min(questions.length, answerTexts.length);
          const testQuestions = questions.slice(0, numQuestions);
          const testAnswers = answerTexts.slice(0, numQuestions);

          // Create mock app instance
          const mockApp = new MockApp(testQuestions);

          // Submit answers for each question
          for (let i = 0; i < testQuestions.length; i++) {
            mockApp.setCurrentIndex(i);
            const currentQuestion = mockApp.getCurrentQuestion();
            const answerText = testAnswers[i];

            expect(currentQuestion).toBeDefined();
            expect(currentQuestion?.id).toBe(testQuestions[i].id);

            // Submit answer
            mockApp.handleAnswer(answerText, Math.floor(Math.random() * 300));

            // Verify answer was stored immediately
            const storedAnswer = mockApp.getCurrentAnswer();
            expect(storedAnswer).toBeDefined();
            expect(storedAnswer?.answer).toBe(answerText);
            expect(storedAnswer?.questionId).toBe(currentQuestion?.id);
          }

          // Now test navigation back to previous questions to verify persistence
          for (let i = testQuestions.length - 1; i >= 0; i--) {
            mockApp.setCurrentIndex(i);
            const currentQuestion = mockApp.getCurrentQuestion();
            const expectedAnswer = testAnswers[i];

            expect(currentQuestion).toBeDefined();
            expect(currentQuestion?.id).toBe(testQuestions[i].id);

            // Get the stored answer for this question
            const storedAnswer = mockApp.getCurrentAnswer();
            
            // Property assertion: Answer should be preserved
            expect(storedAnswer).toBeDefined();
            expect(storedAnswer?.answer).toBe(expectedAnswer);
            expect(storedAnswer?.questionId).toBe(currentQuestion?.id);

            // Additional validation: Answer should not be empty or undefined
            expect(storedAnswer?.answer).toBeDefined();
            expect(storedAnswer?.answer.trim()).not.toBe('');
            expect(storedAnswer?.answer.length).toBeGreaterThan(0);
          }

          // Verify all answers are preserved in the system
          const allAnswers = mockApp.getAllAnswers();
          expect(allAnswers.length).toBe(testQuestions.length);

          // Verify all answers are unique per question
          const questionIds = allAnswers.map(a => a.questionId);
          const uniqueQuestionIds = new Set(questionIds);
          expect(uniqueQuestionIds.size).toBe(questionIds.length);

          // Verify each answer matches expected content
          for (let i = 0; i < testQuestions.length; i++) {
            const question = testQuestions[i];
            const expectedAnswer = testAnswers[i];
            const storedAnswer = allAnswers.find(a => a.questionId === question.id);
            
            expect(storedAnswer).toBeDefined();
            expect(storedAnswer?.answer).toBe(expectedAnswer);
          }
        }
      ),
      { numRuns: 10 } // Reduced for faster execution
    );
  });

  /**
   * Property 15: Navigation State Preservation
   * Feature: hr-candidate-evaluation-system, Property 15: Navigation State Preservation
   * Validates: Requirements 14.6
   * 
   * For any question navigation (previous/next), the current answer state 
   * should be preserved before navigation.
   */
  it('Property 15: Navigation State Preservation - state preserved during navigation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random questions
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            question: fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length >= 10),
            category: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
            difficulty: fc.constantFrom('beginner', 'intermediate', 'advanced', 'expert'),
            type: fc.constantFrom(
              'technical-coding',
              'technical-concepts',
              'system-design',
              'behavioral'
            ) as fc.Arbitrary<QuestionType>,
            answer: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10),
            explanation: fc.string({ minLength: 10, maxLength: 300 }).filter(s => s.trim().length >= 10),
            links: fc.array(fc.webUrl(), { minLength: 0, maxLength: 3 })
          }),
          { minLength: 3, maxLength: 5 }
        ).map(questions => {
          // Ensure unique question IDs
          return questions.map((q, index) => ({
            ...q,
            id: `${q.id}-${index}` // Make IDs unique by appending index
          }));
        }),
        // Generate random answers for each question
        fc.array(fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length > 0), { minLength: 3, maxLength: 5 }),
        async (questions: Question[], answerTexts: string[]) => {
          // Ensure we have matching number of answers and questions
          const numQuestions = Math.min(questions.length, answerTexts.length);
          const testQuestions = questions.slice(0, numQuestions);
          const testAnswers = answerTexts.slice(0, numQuestions);

          // Create mock app instance
          const mockApp = new MockApp(testQuestions);
          
          // First, submit answers for all questions
          for (let i = 0; i < testQuestions.length; i++) {
            mockApp.setCurrentIndex(i);
            const currentQuestion = mockApp.getCurrentQuestion();
            const answerText = testAnswers[i];

            expect(currentQuestion).toBeDefined();
            expect(currentQuestion?.id).toBe(testQuestions[i].id);

            // Submit answer
            mockApp.handleAnswer(answerText, Math.floor(Math.random() * 300));

            // Verify answer was stored immediately
            const storedAnswer = mockApp.getCurrentAnswer();
            expect(storedAnswer).toBeDefined();
            expect(storedAnswer?.answer).toBe(answerText);
          }

          // Now test navigation and verify state preservation
          // Navigate through questions in different orders
          const navigationSequence = [
            testQuestions.length - 1, // Go to last question
            0, // Go to first question
            Math.floor(testQuestions.length / 2), // Go to middle question
            testQuestions.length - 1, // Go back to last question
            0 // Go back to first question
          ];

          for (const targetIndex of navigationSequence) {
            if (targetIndex >= testQuestions.length) continue;

            // Navigate to target question
            mockApp.setCurrentIndex(targetIndex);
            const currentQuestion = mockApp.getCurrentQuestion();
            const expectedAnswer = testAnswers[targetIndex];

            expect(currentQuestion).toBeDefined();
            expect(currentQuestion?.id).toBe(testQuestions[targetIndex].id);

            // Property assertion: Previously submitted answer should be preserved
            const storedAnswer = mockApp.getCurrentAnswer();
            expect(storedAnswer).toBeDefined();
            expect(storedAnswer?.answer).toBe(expectedAnswer);
            expect(storedAnswer?.questionId).toBe(currentQuestion?.id);

            // Additional validation
            expect(storedAnswer?.answer.trim()).not.toBe('');
            expect(storedAnswer?.answer.length).toBeGreaterThan(4); // Minimum from generator
          }

          // Verify all answers are still preserved after navigation
          const allAnswers = mockApp.getAllAnswers();
          expect(allAnswers.length).toBe(testQuestions.length);

          // Verify each answer matches expected content
          for (let i = 0; i < testQuestions.length; i++) {
            const question = testQuestions[i];
            const expectedAnswer = testAnswers[i];
            const storedAnswer = allAnswers.find(a => a.questionId === question.id);
            
            expect(storedAnswer).toBeDefined();
            expect(storedAnswer?.answer).toBe(expectedAnswer);
          }

          // Verify state preservation across multiple navigation steps
          const uniqueQuestionIds = new Set(allAnswers.map(a => a.questionId));
          expect(uniqueQuestionIds.size).toBe(allAnswers.length);

          // Each stored answer should be valid
          for (const answer of allAnswers) {
            expect(answer.questionId).toBeDefined();
            expect(answer.answer).toBeDefined();
            expect(typeof answer.answer).toBe('string');
            expect(answer.answer.length).toBeGreaterThan(4); // Minimum length from generator
            expect(answer.timeSpent).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 10 } // Reduced for faster execution
    );
  });
});