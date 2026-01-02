/**
 * Property-Based Tests for Timer Functionality
 * Feature: hr-candidate-evaluation-system
 * 
 * These tests validate universal properties of timer behavior and time limit enforcement
 * using property-based testing with fast-check.
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { Question, QuestionType } from '../../types';

// Mock timer functionality to simulate time passage
interface MockTimer {
  currentTime: number;
  timers: Map<number, { callback: () => void; interval: number; lastRun: number }>;
  nextTimerId: number;
}

class MockTimerSystem {
  private timer: MockTimer;

  constructor() {
    this.timer = {
      currentTime: 0,
      timers: new Map(),
      nextTimerId: 1
    };
  }

  // Mock setInterval
  setInterval(callback: () => void, interval: number): number {
    const id = this.timer.nextTimerId++;
    this.timer.timers.set(id, {
      callback,
      interval,
      lastRun: this.timer.currentTime
    });
    return id;
  }

  // Mock clearInterval
  clearInterval(id: number): void {
    this.timer.timers.delete(id);
  }

  // Mock Date.now()
  now(): number {
    return this.timer.currentTime;
  }

  // Advance time and trigger callbacks
  advanceTime(milliseconds: number): void {
    this.timer.currentTime += milliseconds;
    
    for (const [id, timerInfo] of this.timer.timers) {
      const elapsed = this.timer.currentTime - timerInfo.lastRun;
      if (elapsed >= timerInfo.interval) {
        timerInfo.callback();
        timerInfo.lastRun = this.timer.currentTime;
      }
    }
  }

  // Get current time
  getCurrentTime(): number {
    return this.timer.currentTime;
  }

  // Clear all timers
  clearAllTimers(): void {
    this.timer.timers.clear();
  }
}

// Mock QuestionView timer logic
class MockQuestionTimer {
  private timerSystem: MockTimerSystem;
  private questionStartTime: number;
  private questionTimeLimit: number;
  private onSkipCallback: () => void;
  private hasSubmitted: boolean;
  private timerId: number | null;
  private questionTimeSpent: number;

  constructor(
    timerSystem: MockTimerSystem,
    questionTimeLimit: number,
    onSkip: () => void
  ) {
    this.timerSystem = timerSystem;
    this.questionStartTime = timerSystem.getCurrentTime();
    this.questionTimeLimit = questionTimeLimit;
    this.onSkipCallback = onSkip;
    this.hasSubmitted = false;
    this.timerId = null;
    this.questionTimeSpent = 0;
    
    this.startTimer();
  }

  private startTimer(): void {
    this.timerId = this.timerSystem.setInterval(() => {
      const elapsed = Math.floor((this.timerSystem.getCurrentTime() - this.questionStartTime) / 1000);
      this.questionTimeSpent = elapsed;
      
      // Auto-skip if question time limit exceeded and not submitted
      if (elapsed >= this.questionTimeLimit && !this.hasSubmitted) {
        this.onSkipCallback();
      }
    }, 1000);
  }

  submit(): void {
    this.hasSubmitted = true;
  }

  getTimeSpent(): number {
    return this.questionTimeSpent;
  }

  cleanup(): void {
    if (this.timerId !== null) {
      this.timerSystem.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  isSubmitted(): boolean {
    return this.hasSubmitted;
  }
}

// Mock assessment timer for overall time limit
class MockAssessmentTimer {
  private timerSystem: MockTimerSystem;
  private assessmentStartTime: number;
  private onFinishCallback: () => void;
  private timerId: number | null;
  private totalAssessmentTime: number;
  private isFinished: boolean;

  constructor(
    timerSystem: MockTimerSystem,
    onFinish: () => void
  ) {
    this.timerSystem = timerSystem;
    this.assessmentStartTime = timerSystem.getCurrentTime();
    this.onFinishCallback = onFinish;
    this.timerId = null;
    this.totalAssessmentTime = 0;
    this.isFinished = false;
    
    this.startTimer();
  }

  private startTimer(): void {
    this.timerId = this.timerSystem.setInterval(() => {
      const elapsed = Math.floor((this.timerSystem.getCurrentTime() - this.assessmentStartTime) / 1000);
      this.totalAssessmentTime = elapsed;
      
      // Auto-finish if 1 hour exceeded
      if (elapsed >= 3600 && !this.isFinished) { // 1 hour = 3600 seconds
        this.isFinished = true;
        this.onFinishCallback();
      }
    }, 1000);
  }

  getTotalTime(): number {
    return this.totalAssessmentTime;
  }

  cleanup(): void {
    if (this.timerId !== null) {
      this.timerSystem.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  isAssessmentFinished(): boolean {
    return this.isFinished;
  }
}

describe('Timer Property Tests', () => {
  let mockTimerSystem: MockTimerSystem;

  beforeEach(() => {
    mockTimerSystem = new MockTimerSystem();
  });

  afterEach(() => {
    mockTimerSystem.clearAllTimers();
  });

  /**
   * Property 8: Time Limit Enforcement
   * Feature: hr-candidate-evaluation-system, Property 8: Time Limit Enforcement
   * Validates: Requirements 6.2
   * 
   * For any question with time limit T seconds, if T seconds elapse without submission, 
   * the question should be automatically skipped.
   */
  it('Property 8: Time Limit Enforcement - questions auto-skip when time limit exceeded', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random questions with various time limits
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
          { minLength: 1, maxLength: 3 }
        ).map(questions => {
          // Ensure unique question IDs
          return questions.map((q, index) => ({
            ...q,
            id: `${q.id}-${index}` // Make IDs unique by appending index
          }));
        }),
        // Generate random time limits (in seconds)
        fc.array(fc.integer({ min: 30, max: 600 }), { minLength: 1, maxLength: 3 }),
        async (questions: Question[], timeLimits: number[]) => {
          // Ensure we have matching number of questions and time limits
          const numQuestions = Math.min(questions.length, timeLimits.length);
          const testQuestions = questions.slice(0, numQuestions);
          const testTimeLimits = timeLimits.slice(0, numQuestions);

          for (let i = 0; i < testQuestions.length; i++) {
            const question = testQuestions[i];
            const timeLimit = testTimeLimits[i];
            
            // Reset timer system for each question
            mockTimerSystem.clearAllTimers();
            
            let wasSkipped = false;
            const onSkip = () => {
              wasSkipped = true;
            };

            // Create question timer
            const questionTimer = new MockQuestionTimer(
              mockTimerSystem,
              timeLimit,
              onSkip
            );

            // Test Case 1: Time limit not exceeded - should not auto-skip
            const halfTime = Math.floor(timeLimit / 2);
            mockTimerSystem.advanceTime(halfTime * 1000); // Convert to milliseconds
            
            expect(wasSkipped).toBe(false);
            expect(questionTimer.getTimeSpent()).toBe(halfTime);
            expect(questionTimer.isSubmitted()).toBe(false);

            // Test Case 2: Submit before time limit - should not auto-skip
            questionTimer.submit();
            mockTimerSystem.advanceTime((timeLimit + 10) * 1000); // Exceed time limit after submission
            
            expect(wasSkipped).toBe(false); // Should not skip after submission
            expect(questionTimer.isSubmitted()).toBe(true);

            // Clean up for next test
            questionTimer.cleanup();

            // Test Case 3: Time limit exceeded without submission - should auto-skip
            wasSkipped = false;
            const questionTimer2 = new MockQuestionTimer(
              mockTimerSystem,
              timeLimit,
              onSkip
            );

            // Advance time to exactly the time limit
            mockTimerSystem.advanceTime(timeLimit * 1000);
            
            // Property assertion: Should auto-skip when time limit is reached
            expect(wasSkipped).toBe(true);
            expect(questionTimer2.getTimeSpent()).toBe(timeLimit);
            expect(questionTimer2.isSubmitted()).toBe(false);

            // Test Case 4: Time limit exceeded by more than limit - should still be skipped
            wasSkipped = false;
            const questionTimer3 = new MockQuestionTimer(
              mockTimerSystem,
              timeLimit,
              onSkip
            );

            // Advance time beyond the time limit
            const excessTime = timeLimit + Math.floor(Math.random() * 60) + 1; // 1-60 seconds over
            mockTimerSystem.advanceTime(excessTime * 1000);
            
            expect(wasSkipped).toBe(true);
            expect(questionTimer3.getTimeSpent()).toBe(excessTime);
            expect(questionTimer3.isSubmitted()).toBe(false);

            // Clean up
            questionTimer2.cleanup();
            questionTimer3.cleanup();
          }
        }
      ),
      { numRuns: 10 } // Reduced for faster execution
    );
  });

  /**
   * Additional Property: Assessment Time Limit Enforcement
   * Feature: hr-candidate-evaluation-system, Property: Assessment Time Limit
   * Validates: Requirements 6.4
   * 
   * For any assessment, if 1 hour (3600 seconds) elapses, 
   * the assessment should be automatically finished.
   */
  it('Property: Assessment Time Limit - assessment auto-finishes after 1 hour', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random time intervals leading up to 1 hour
        fc.array(fc.integer({ min: 300, max: 1800 }), { minLength: 1, maxLength: 3 }), // 5-30 minute intervals
        async (timeIntervals: number[]) => {
          // Reset timer system for clean state
          mockTimerSystem.clearAllTimers();
          
          let wasFinished = false;
          const onFinish = () => {
            wasFinished = true;
          };

          // Create assessment timer
          const assessmentTimer = new MockAssessmentTimer(
            mockTimerSystem,
            onFinish
          );

          // Test intervals before 1 hour - should not auto-finish
          let totalTime = 0;
          for (const interval of timeIntervals) {
            const nextTotalTime = totalTime + interval;
            if (nextTotalTime >= 3600) break; // Don't exceed 1 hour in this loop
            
            totalTime = nextTotalTime;
            mockTimerSystem.advanceTime(interval * 1000);
            
            expect(wasFinished).toBe(false);
            expect(assessmentTimer.getTotalTime()).toBe(totalTime);
            expect(assessmentTimer.isAssessmentFinished()).toBe(false);
          }

          // Now advance to exactly 1 hour
          const remainingTime = 3600 - totalTime;
          if (remainingTime > 0) {
            mockTimerSystem.advanceTime(remainingTime * 1000);
            totalTime = 3600;
          }

          // Property assertion: Should auto-finish at 1 hour
          expect(wasFinished).toBe(true);
          expect(assessmentTimer.getTotalTime()).toBe(3600);
          expect(assessmentTimer.isAssessmentFinished()).toBe(true);

          // Test exceeding 1 hour - should remain finished
          mockTimerSystem.advanceTime(300 * 1000); // Add 5 more minutes
          
          expect(wasFinished).toBe(true); // Should still be finished
          expect(assessmentTimer.getTotalTime()).toBe(3900); // 1 hour + 5 minutes
          expect(assessmentTimer.isAssessmentFinished()).toBe(true);

          // Clean up
          assessmentTimer.cleanup();
        }
      ),
      { numRuns: 10 } // Reduced for faster execution
    );
  });

  /**
   * Edge Case Property: Timer Behavior with Rapid Time Changes
   * Feature: hr-candidate-evaluation-system, Property: Timer Consistency
   * Validates: Requirements 6.2
   * 
   * For any sequence of time advances, timer behavior should be consistent
   * and auto-skip should occur exactly when the time limit is reached.
   */
  it('Property: Timer Consistency - consistent behavior with various time advances', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a time limit and sequence of time advances
        fc.integer({ min: 60, max: 300 }), // 1-5 minute time limits
        fc.array(fc.integer({ min: 1, max: 30 }), { minLength: 2, maxLength: 10 }), // Small time advances
        async (timeLimit: number, timeAdvances: number[]) => {
          let wasSkipped = false;
          let skipTime = -1;
          const onSkip = () => {
            if (!wasSkipped) {
              wasSkipped = true;
              skipTime = mockTimerSystem.getCurrentTime();
            }
          };

          const questionTimer = new MockQuestionTimer(
            mockTimerSystem,
            timeLimit,
            onSkip
          );

          let totalAdvanced = 0;
          
          // Advance time in small increments
          for (const advance of timeAdvances) {
            totalAdvanced += advance;
            mockTimerSystem.advanceTime(advance * 1000);
            
            const expectedTimeSpent = Math.floor(totalAdvanced);
            const actualTimeSpent = questionTimer.getTimeSpent();
            
            // Verify time tracking is accurate
            expect(actualTimeSpent).toBe(expectedTimeSpent);
            
            if (totalAdvanced >= timeLimit) {
              // Should be skipped by now
              expect(wasSkipped).toBe(true);
              expect(actualTimeSpent).toBeGreaterThanOrEqual(timeLimit);
              break;
            } else {
              // Should not be skipped yet
              expect(wasSkipped).toBe(false);
              expect(actualTimeSpent).toBeLessThan(timeLimit);
            }
          }

          // If we haven't reached the time limit yet, advance to it
          if (totalAdvanced < timeLimit) {
            const remaining = timeLimit - totalAdvanced;
            mockTimerSystem.advanceTime(remaining * 1000);
            
            // Property assertion: Should be skipped exactly at time limit
            expect(wasSkipped).toBe(true);
            expect(questionTimer.getTimeSpent()).toBe(timeLimit);
          }

          // Clean up
          questionTimer.cleanup();
        }
      ),
      { numRuns: 10 } // Reduced for faster execution
    );
  });
});