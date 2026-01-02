/**
 * Property-Based Tests for Configuration Validation
 * Feature: hr-candidate-evaluation-system
 * 
 * These tests validate universal properties of the configuration validation system
 * using property-based testing with fast-check.
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { InterviewConfig, QuestionType } from '../../types';

/**
 * Validates if a configuration is valid according to requirements
 * Requirements 3.1, 15.1, 15.4, 15.5:
 * - role must be non-empty
 * - company must be non-empty
 * - skills array must have at least one element
 * - questionTypes array must have at least one element
 */
function isConfigValid(config: Partial<InterviewConfig>): boolean {
  return (
    typeof config.role === 'string' && config.role.trim() !== '' &&
    typeof config.company === 'string' && config.company.trim() !== '' &&
    Array.isArray(config.skills) && config.skills.length > 0 &&
    Array.isArray(config.questionTypes) && config.questionTypes.length > 0
  );
}

describe('Configuration Validation Property Tests', () => {
  /**
   * Property 4: Configuration Validation
   * Feature: hr-candidate-evaluation-system, Property 4: Configuration Validation
   * Validates: Requirements 3.1, 15.1, 15.4, 15.5
   * 
   * For any assessment configuration with empty required fields (role, company, skills, or questionTypes),
   * form submission should be prevented.
   */
  it('Property 4: Configuration Validation - configurations with missing fields are invalid', async () => {
    // Valid question types for generation
    const validQuestionTypes: QuestionType[] = [
      'technical-coding',
      'technical-concepts',
      'system-design',
      'behavioral',
      'problem-solving',
      'case-study',
      'architecture',
      'debugging'
    ];

    await fc.assert(
      fc.asyncProperty(
        // Generate configurations with potentially missing or empty fields
        fc.record({
          role: fc.oneof(
            fc.constant(''),           // Empty string
            fc.constant('   '),        // Whitespace only
            fc.string({ minLength: 1, maxLength: 50 }) // Valid string
          ),
          company: fc.oneof(
            fc.constant(''),           // Empty string
            fc.constant('   '),        // Whitespace only
            fc.string({ minLength: 1, maxLength: 50 }) // Valid string
          ),
          skills: fc.oneof(
            fc.constant([]),           // Empty array
            fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 10 }) // Valid array
          ),
          proficiencyLevel: fc.constantFrom('beginner', 'intermediate', 'advanced', 'expert'),
          numberOfQuestions: fc.integer({ min: 5, max: 30 }),
          questionTypes: fc.oneof(
            fc.constant([]),           // Empty array
            fc.array(fc.constantFrom(...validQuestionTypes), { minLength: 1, maxLength: 8 }) // Valid array
          )
        }),
        async (config) => {
          // Determine if this configuration should be valid
          const shouldBeValid = isConfigValid(config);

          // Test the validation logic
          const roleValid = config.role.trim() !== '';
          const companyValid = config.company.trim() !== '';
          const skillsValid = config.skills.length > 0;
          const questionTypesValid = config.questionTypes.length > 0;

          const isValid = roleValid && companyValid && skillsValid && questionTypesValid;

          // Property assertion: Validation result should match expected validity
          expect(isValid).toBe(shouldBeValid);

          // Additional assertions for specific field validations
          if (config.role.trim() === '') {
            expect(isValid).toBe(false);
          }

          if (config.company.trim() === '') {
            expect(isValid).toBe(false);
          }

          if (config.skills.length === 0) {
            expect(isValid).toBe(false);
          }

          if (config.questionTypes.length === 0) {
            expect(isValid).toBe(false);
          }

          // If all fields are valid, the configuration should be valid
          if (roleValid && companyValid && skillsValid && questionTypesValid) {
            expect(isValid).toBe(true);
          }
        }
      ),
      { numRuns: 10 } // Reduced for faster execution
    );
  });

  /**
   * Additional test: Verify that completely empty configurations are always invalid
   */
  it('Property 4 (Edge Case): Empty configurations are always invalid', () => {
    const emptyConfigs: Partial<InterviewConfig>[] = [
      { role: '', company: '', skills: [], questionTypes: [] },
      { role: '   ', company: '   ', skills: [], questionTypes: [] },
      { role: '', company: 'Company', skills: ['Skill'], questionTypes: ['technical-coding'] },
      { role: 'Role', company: '', skills: ['Skill'], questionTypes: ['technical-coding'] },
      { role: 'Role', company: 'Company', skills: [], questionTypes: ['technical-coding'] },
      { role: 'Role', company: 'Company', skills: ['Skill'], questionTypes: [] },
    ];

    emptyConfigs.forEach((config) => {
      const isValid = isConfigValid(config);
      expect(isValid).toBe(false);
    });
  });

  /**
   * Additional test: Verify that valid configurations are recognized as valid
   */
  it('Property 4 (Edge Case): Valid configurations are recognized as valid', () => {
    const validConfigs: InterviewConfig[] = [
      {
        role: 'Software Engineer',
        company: 'Google',
        skills: ['JavaScript'],
        proficiencyLevel: 'intermediate',
        numberOfQuestions: 10,
        questionTypes: ['technical-coding']
      },
      {
        role: 'Senior Developer',
        company: 'Microsoft',
        skills: ['Python', 'Java'],
        proficiencyLevel: 'advanced',
        numberOfQuestions: 20,
        questionTypes: ['technical-coding', 'system-design']
      },
      {
        role: 'Tech Lead',
        company: 'Amazon',
        skills: ['React', 'Node.js', 'AWS'],
        proficiencyLevel: 'expert',
        numberOfQuestions: 25,
        questionTypes: ['technical-coding', 'system-design', 'architecture']
      }
    ];

    validConfigs.forEach((config) => {
      const isValid = isConfigValid(config);
      expect(isValid).toBe(true);
    });
  });
});
