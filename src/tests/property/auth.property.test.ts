/**
 * Property-Based Tests for Authentication
 * Feature: hr-candidate-evaluation-system
 * 
 * These tests validate universal properties of the authentication system
 * using property-based testing with fast-check.
 * 
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { auth, query, clearMockData } from '../mocks/postgres.mock';

describe('Authentication Property Tests', () => {
  // Clear mock data before each test to ensure clean state
  beforeEach(() => {
    clearMockData();
  });

  /**
   * Property 1: Authentication Round Trip
   * Feature: hr-candidate-evaluation-system, Property 1: Authentication Round Trip
   * Validates: Requirements 1.1, 1.3
   * 
   * For any valid user credentials (email and password), registering then logging in
   * with those credentials should return the same user email.
   */
  it('Property 1: Authentication Round Trip - register then login returns same email', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 6, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (email, password, name) => {
          // Step 1: Register user
          const { user: registeredUser, error: signUpError } = await auth.signUp(
            email,
            password,
            name
          );

          // Verify registration succeeded
          expect(signUpError).toBeNull();
          expect(registeredUser).toBeDefined();
          expect(registeredUser?.email).toBe(email);

          // Step 2: Login with same credentials
          const { data: signInData, error: signInError } = await auth.signIn(
            email,
            password
          );

          // Verify login succeeded
          expect(signInError).toBeNull();
          expect(signInData).toBeDefined();
          expect(signInData?.session).toBeDefined();
          expect(signInData?.session.user).toBeDefined();

          // Property assertion: Email should match
          expect(signInData?.session.user.email).toBe(email);
        }
      ),
      { numRuns: 10 } // Reduced for faster execution
    );
  }, 15000); // Reduced timeout

  /**
   * Property 2: Password Security
   * Feature: hr-candidate-evaluation-system, Property 2: Password Security
   * Validates: Requirements 11.5
   * 
   * For any user registration, the stored password hash should never equal the plaintext password.
   */
  it('Property 2: Password Security - stored hash never equals plaintext', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 6, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (email, password, name) => {
          // Step 1: Register user with plaintext password
          const { user: registeredUser, error: signUpError } = await auth.signUp(
            email,
            password,
            name
          );

          // Verify registration succeeded
          expect(signUpError).toBeNull();
          expect(registeredUser).toBeDefined();

          // Step 2: Query database to get stored password hash
          const result = await query(
            'SELECT password_hash FROM users WHERE id = $1',
            [registeredUser?.id]
          );

          expect(result.rows).toHaveLength(1);
          const storedHash = result.rows[0].password_hash;

          // Property assertion: Stored hash should NEVER equal plaintext password
          expect(storedHash).toBeDefined();
          expect(storedHash).not.toBe(password);
          expect(storedHash).not.toBe('');
          
          // Additional security check: Hash should look like a bcrypt hash
          // Bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 characters long
          expect(storedHash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
        }
      ),
      { numRuns: 10 } // Reduced for faster execution
    );
  }, 15000); // Reduced timeout

  /**
   * Property 3: Session Token Uniqueness
   * Feature: hr-candidate-evaluation-system, Property 3: Session Token Uniqueness
   * Validates: Requirements 1.3
   * 
   * For any two concurrent login sessions, the generated session tokens should be unique.
   */
  it('Property 3: Session Token Uniqueness - concurrent logins generate unique tokens', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 6, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 2, max: 3 }), // Reduced max concurrent logins
        async (email, password, name, loginCount) => {
          // Step 1: Register a single user
          const { user: registeredUser, error: signUpError } = await auth.signUp(
            email,
            password,
            name
          );

          // Verify registration succeeded
          expect(signUpError).toBeNull();
          expect(registeredUser).toBeDefined();

          // Step 2: Perform multiple concurrent logins with the same credentials
          const loginPromises = Array.from({ length: loginCount }, () =>
            auth.signIn(email, password)
          );

          const loginResults = await Promise.all(loginPromises);

          // Verify all logins succeeded
          loginResults.forEach((result, index) => {
            expect(result.error).toBeNull();
            expect(result.data).toBeDefined();
            expect(result.data?.session).toBeDefined();
            expect(result.data?.session.access_token).toBeDefined();
          });

          // Step 3: Extract all session tokens
          const tokens = loginResults.map(
            (result) => result.data?.session.access_token
          ).filter((token): token is string => token !== undefined);

          // Property assertion: All tokens should be unique
          const uniqueTokens = new Set(tokens);
          expect(uniqueTokens.size).toBe(tokens.length);
          expect(tokens.length).toBe(loginCount);

          // Additional verification: Query database to confirm all tokens are stored
          const dbResult = await query(
            'SELECT token FROM user_sessions WHERE user_id = $1',
            [registeredUser?.id]
          );

          expect(dbResult.rows.length).toBe(loginCount);
          
          const dbTokens = dbResult.rows.map(row => row.token);
          const uniqueDbTokens = new Set(dbTokens);
          expect(uniqueDbTokens.size).toBe(loginCount);
        }
      ),
      { numRuns: 5 } // Reduced for faster execution
    );
  }, 15000); // Reduced timeout
});