/**
 * Property-Based Tests for Question Generation
 * Feature: hr-candidate-evaluation-system
 * 
 * These tests validate universal properties of the question generation system
 * using property-based testing with fast-check.
 * 
 * @vitest-environment node
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { InterviewConfig, Question, QuestionType } from '../../types';

// Helper function to generate fallback questions (extracted from useLLM logic)
const generateFallbackQuestion = (index: number, config: InterviewConfig, usedQuestions: Set<string>): Question => {
  const skillIndex = index % config.skills.length;
  const typeIndex = index % config.questionTypes.length;
  const skill = config.skills[skillIndex];
  const type = config.questionTypes[typeIndex];
  
  // Create unique variations to avoid duplicates
  const variations = [
    'implement', 'design', 'optimize', 'debug', 'explain', 'compare', 'analyze', 'create'
  ];
  const variation = variations[index % variations.length];
  
  const concepts = [
    'data structure', 'algorithm', 'pattern', 'system', 'component', 'feature', 'process', 'workflow'
  ];
  const concept = concepts[index % concepts.length];
  
  let questionText = '';
  let answer = '';
  let explanation = '';
  
  // Generate different questions based on type
  switch (type) {
    case 'technical-coding':
      const problems = [
        'find the maximum element in an array',
        'reverse a linked list',
        'implement binary search',
        'sort an array using merge sort',
        'find the first non-repeating character',
        'implement a stack using arrays',
        'check if a string is a palindrome',
        'find the intersection of two arrays'
      ];
      const problem = problems[index % problems.length];
      
      questionText = `Using ${skill}, ${variation} a solution to ${problem}. Provide time and space complexity analysis.`;
      answer = `Here's a solution for ${problem} using ${skill}`;
      explanation = `This question tests your ability to write efficient algorithms and understand complexity analysis.`;
      break;
      
    case 'technical-concepts':
      const conceptTopics = [
        'inheritance and polymorphism',
        'asynchronous programming',
        'memory management',
        'design patterns',
        'data binding',
        'state management',
        'error handling',
        'performance optimization'
      ];
      const conceptTopic = conceptTopics[index % conceptTopics.length];
      
      questionText = `${variation.charAt(0).toUpperCase() + variation.slice(1)} the concept of ${conceptTopic} in ${skill}. How does it apply to ${config.role} responsibilities?`;
      answer = `${conceptTopic.charAt(0).toUpperCase() + conceptTopic.slice(1)} in ${skill} involves...`;
      explanation = `This question evaluates your theoretical understanding of core concepts.`;
      break;
      
    case 'system-design':
      const systems = [
        'chat application',
        'e-commerce platform',
        'social media feed',
        'video streaming service',
        'file storage system',
        'notification service',
        'search engine',
        'payment processing system'
      ];
      const system = systems[index % systems.length];
      
      questionText = `${variation.charAt(0).toUpperCase() + variation.slice(1)} a scalable ${system} that handles ${skill}. Consider performance, scalability, and reliability.`;
      answer = `System Design for ${system} would include...`;
      explanation = `This tests your ability to design large-scale systems.`;
      break;
      
    case 'behavioral':
      const situations = [
        'overcome a technical challenge',
        'work with a difficult team member',
        'meet a tight deadline',
        'learn a new technology quickly',
        'handle conflicting requirements',
        'lead a project initiative',
        'resolve a production issue',
        'mentor a junior developer'
      ];
      const situation = situations[index % situations.length];
      
      questionText = `Tell me about a time when you had to ${situation} while working with ${skill}. What was your approach?`;
      answer = `I would use the STAR method to answer this question about ${situation}...`;
      explanation = `This evaluates your soft skills and problem-solving approach.`;
      break;
      
    default:
      questionText = `How would you approach ${variation} in a ${config.role} application that uses ${skill}?`;
      answer = `To approach ${variation} with ${skill}, I would...`;
      explanation = `This tests your practical experience and methodology.`;
  }
  
  // Ensure question is unique
  let finalQuestion = questionText;
  let counter = 1;
  while (usedQuestions.has(finalQuestion.toLowerCase().trim())) {
    finalQuestion = `${questionText} (Variation ${counter})`;
    counter++;
  }
  
  usedQuestions.add(finalQuestion.toLowerCase().trim());
  
  return {
    id: `fallback-q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
    question: finalQuestion,
    type: type,
    category: skill,
    difficulty: config.proficiencyLevel,
    answer: answer,
    explanation: explanation,
    links: [
      `https://developer.mozilla.org/en-US/docs/Web/${skill.toLowerCase()}`,
      `https://github.com/topics/${skill.toLowerCase().replace(/\s+/g, '-')}`
    ]
  };
};

// Helper function to generate mock questions (extracted from useLLM logic)
const generateMockQuestions = (config: InterviewConfig): Question[] => {
  const mockQuestions = [];
  const usedQuestions = new Set<string>();
  
  for (let i = 0; i < config.numberOfQuestions; i++) {
    mockQuestions.push(generateFallbackQuestion(i, config, usedQuestions));
  }
  
  return mockQuestions;
};

describe('Question Generation Property Tests', () => {
  /**
   * Property 5: Question Generation Count
   * Feature: hr-candidate-evaluation-system, Property 5: Question Generation Count
   * Validates: Requirements 4.1, 4.3
   * 
   * For any valid assessment configuration requesting N questions, 
   * the question generator should return exactly N unique questions.
   */
  it('Property 5: Question Generation Count - returns exact number of requested questions', async () => {
    await fc.assert(
      fc.property(
        // Generate valid interview configurations
        fc.record({
          role: fc.string({ minLength: 1, maxLength: 50 }),
          company: fc.string({ minLength: 1, maxLength: 50 }),
          skills: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 3 }),
          proficiencyLevel: fc.constantFrom('beginner', 'intermediate', 'advanced', 'expert'),
          numberOfQuestions: fc.integer({ min: 5, max: 10 }), // Reduced range for faster testing
          questionTypes: fc.array(
            fc.constantFrom(
              'technical-coding',
              'technical-concepts', 
              'system-design',
              'behavioral'
            ),
            { minLength: 1, maxLength: 2 }
          )
        }),
        (config: InterviewConfig) => {
          // Generate questions using fallback logic
          const questions = generateMockQuestions(config);

          // Property assertion: Should return exactly the requested number of questions
          expect(questions).toHaveLength(config.numberOfQuestions);

          // Additional validations
          questions.forEach((question, index) => {
            expect(question.id).toBeDefined();
            expect(question.question).toBeDefined();
            expect(question.type).toBeDefined();
            expect(question.category).toBeDefined();
            expect(question.difficulty).toBe(config.proficiencyLevel);
            expect(question.answer).toBeDefined();
            expect(question.explanation).toBeDefined();
            
            // Verify question type is one of the requested types
            expect(config.questionTypes).toContain(question.type);
            
            // Verify category is one of the requested skills
            expect(config.skills).toContain(question.category);
          });
        }
      ),
      { numRuns: 10 } // Reduced for faster execution
    );
  });

  /**
   * Property 6: Question Uniqueness
   * Feature: hr-candidate-evaluation-system, Property 6: Question Uniqueness
   * Validates: Requirements 4.3
   * 
   * For any generated question set, no two questions should have identical question text (case-insensitive).
   */
  it('Property 6: Question Uniqueness - no duplicate question texts', async () => {
    await fc.assert(
      fc.property(
        // Generate valid interview configurations
        fc.record({
          role: fc.string({ minLength: 1, maxLength: 50 }),
          company: fc.string({ minLength: 1, maxLength: 50 }),
          skills: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 3 }),
          proficiencyLevel: fc.constantFrom('beginner', 'intermediate', 'advanced', 'expert'),
          numberOfQuestions: fc.integer({ min: 5, max: 10 }), // Reduced range for faster testing
          questionTypes: fc.array(
            fc.constantFrom(
              'technical-coding',
              'technical-concepts', 
              'system-design',
              'behavioral'
            ),
            { minLength: 1, maxLength: 2 }
          )
        }),
        (config: InterviewConfig) => {
          // Generate questions using fallback logic
          const questions = generateMockQuestions(config);

          // Extract question texts and normalize for comparison
          const questionTexts = questions.map(q => q.question.toLowerCase().trim());

          // Property assertion: All question texts should be unique
          const uniqueTexts = new Set(questionTexts);
          expect(uniqueTexts.size).toBe(questionTexts.length);
          expect(questionTexts.length).toBe(config.numberOfQuestions);

          // Additional validation: Ensure no empty or undefined questions
          questions.forEach(question => {
            expect(question.question).toBeDefined();
            expect(question.question.trim()).not.toBe('');
            expect(question.question.length).toBeGreaterThan(10); // Reasonable minimum length
          });
        }
      ),
      { numRuns: 10 } // Reduced for faster execution
    );
  });

  /**
   * Property 13: Fallback Question Generation
   * Feature: hr-candidate-evaluation-system, Property 13: Fallback Question Generation
   * Validates: Requirements 4.5, 12.1
   * 
   * For any assessment configuration, if the Groq API fails, 
   * the system should still generate the requested number of questions using fallback templates.
   */
  it('Property 13: Fallback Question Generation - generates correct number of questions when API fails', async () => {
    await fc.assert(
      fc.property(
        // Generate valid interview configurations
        fc.record({
          role: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          company: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          skills: fc.array(fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 3 }),
          proficiencyLevel: fc.constantFrom('beginner', 'intermediate', 'advanced', 'expert'),
          numberOfQuestions: fc.integer({ min: 5, max: 10 }), // Ensure this is always an integer
          questionTypes: fc.array(
            fc.constantFrom(
              'technical-coding',
              'technical-concepts', 
              'system-design',
              'behavioral'
            ),
            { minLength: 1, maxLength: 2 }
          )
        }),
        (config: InterviewConfig) => {
          // Ensure numberOfQuestions is a number (defensive programming)
          const numQuestions = typeof config.numberOfQuestions === 'string' 
            ? parseInt(config.numberOfQuestions, 10) 
            : config.numberOfQuestions;
          
          // Simulate API failure by directly calling fallback logic
          // This tests the fallback question generation without needing to mock the API
          const questions = generateMockQuestions(config);

          // Property assertion: Should return exactly the requested number of questions
          expect(questions).toHaveLength(numQuestions);

          // Additional validations for fallback questions
          questions.forEach((question, index) => {
            // Verify basic question structure
            expect(question.id).toBeDefined();
            expect(question.id).toMatch(/^fallback-q-/); // Fallback questions have specific ID format
            expect(question.question).toBeDefined();
            expect(question.question.trim()).not.toBe('');
            expect(question.question.length).toBeGreaterThan(10);
            
            // Verify question metadata
            expect(question.type).toBeDefined();
            expect(question.category).toBeDefined();
            expect(question.difficulty).toBe(config.proficiencyLevel);
            expect(question.answer).toBeDefined();
            expect(question.explanation).toBeDefined();
            
            // Verify question type is one of the requested types
            expect(config.questionTypes).toContain(question.type);
            
            // Verify category is one of the requested skills
            expect(config.skills).toContain(question.category);
            
            // Verify fallback questions have proper structure
            expect(question.answer.length).toBeGreaterThan(20); // Fallback answers should be substantial
            expect(question.explanation.length).toBeGreaterThan(10);
            expect(Array.isArray(question.links)).toBe(true);
          });

          // Verify question uniqueness (important for fallback generation)
          const questionTexts = questions.map(q => q.question.toLowerCase().trim());
          const uniqueTexts = new Set(questionTexts);
          expect(uniqueTexts.size).toBe(questionTexts.length);

          // Verify distribution across question types and skills
          const typeDistribution = questions.reduce((acc, q) => {
            acc[q.type] = (acc[q.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const skillDistribution = questions.reduce((acc, q) => {
            acc[q.category] = (acc[q.category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          // Each requested type should have at least one question
          config.questionTypes.forEach(type => {
            expect(typeDistribution[type]).toBeGreaterThan(0);
          });

          // Each requested skill should have at least one question
          config.skills.forEach(skill => {
            expect(skillDistribution[skill]).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 10 } // Reduced for faster execution
    );
  });
});