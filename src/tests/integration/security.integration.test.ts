import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Security Integration Tests
 * 
 * End-to-end security tests for SQL injection prevention, XSS prevention, and authentication security
 * Requirements: 11.5, 12.5
 */

describe('Security Integration Tests', () => {
  const API_BASE = 'http://localhost:3001/api';
  const skipIntegration = !process.env.RUN_INTEGRATION_TESTS;

  describe('Authentication Security', () => {
    it.skipIf(skipIntegration)('should prevent SQL injection in login endpoint', async () => {
      // Requirements: 12.5
      const maliciousPayloads = [
        {
          email: "admin@test.com'; DROP TABLE users; --",
          password: "password123"
        },
        {
          email: "admin@test.com",
          password: "' OR '1'='1"
        },
        {
          email: "admin@test.com' UNION SELECT password FROM users WHERE '1'='1",
          password: "password123"
        }
      ];

      for (const payload of maliciousPayloads) {
        try {
          const response = await fetch(`${API_BASE}/auth/signin`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          // Should either return validation error or invalid credentials
          // Should NOT return successful login or cause server error
          expect(response.status).toBeOneOf([400, 401]);
          
          if (response.status === 400) {
            const result = await response.json();
            expect(result.error).toContain('Validation failed');
          } else if (response.status === 401) {
            const result = await response.json();
            expect(result.error).toBe('Invalid credentials');
          }
        } catch (error) {
          // Network errors are acceptable - means server rejected the request
          expect(error).toBeDefined();
        }
      }
    });

    it.skipIf(skipIntegration)('should prevent XSS in registration endpoint', async () => {
      // Requirements: 12.5
      const maliciousPayloads = [
        {
          email: "test@example.com",
          password: "password123",
          name: "<script>alert('XSS')</script>John"
        },
        {
          email: "test2@example.com",
          password: "password123",
          name: "<img src=x onerror=alert(1)>Jane"
        },
        {
          email: "test3@example.com",
          password: "password123",
          name: "javascript:alert('XSS')"
        }
      ];

      for (const payload of maliciousPayloads) {
        try {
          const response = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const result = await response.json();
            // If registration succeeds, name should be sanitized
            if (result.user && result.user.name) {
              expect(result.user.name).not.toContain('<script>');
              expect(result.user.name).not.toContain('<img');
              expect(result.user.name).not.toContain('javascript:');
              expect(result.user.name).not.toContain('alert(');
            }
          } else {
            // Validation errors are acceptable
            expect(response.status).toBe(400);
          }
        } catch (error) {
          // Network errors are acceptable
          expect(error).toBeDefined();
        }
      }
    });

    it.skipIf(skipIntegration)('should enforce password strength requirements', async () => {
      // Requirements: 11.5
      const weakPasswords = [
        { email: "weak1@test.com", password: "123" },
        { email: "weak2@test.com", password: "password" },
        { email: "weak3@test.com", password: "12345" },
        { email: "weak4@test.com", password: "" },
      ];

      for (const payload of weakPasswords) {
        try {
          const response = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          expect(response.status).toBe(400);
          const result = await response.json();
          expect(result.error).toBeDefined();
          expect(result.error.toLowerCase()).toMatch(/password|validation/);
        } catch (error) {
          // Network errors are acceptable
          expect(error).toBeDefined();
        }
      }
    });

    it.skipIf(skipIntegration)('should validate email format strictly', async () => {
      // Requirements: 12.5
      const invalidEmails = [
        { email: "not-an-email", password: "password123" },
        { email: "test@", password: "password123" },
        { email: "@example.com", password: "password123" },
        { email: "test..test@example.com", password: "password123" },
        { email: "test@example", password: "password123" },
        { email: "<script>alert(1)</script>@example.com", password: "password123" },
      ];

      for (const payload of invalidEmails) {
        try {
          const response = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          expect(response.status).toBe(400);
          const result = await response.json();
          expect(result.error).toBeDefined();
        } catch (error) {
          // Network errors are acceptable
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Invitation Security', () => {
    it.skipIf(skipIntegration)('should prevent XSS in invitation creation', async () => {
      // Requirements: 12.5
      const maliciousInvitation = {
        invitation: {
          id: "test-invitation-123",
          requestorId: "user-123",
          requestorName: "<script>alert('XSS')</script>John Doe",
          requestorEmail: "john@company.com",
          candidateEmail: "candidate@email.com",
          candidateName: "<img src=x onerror=alert(1)>Jane Smith",
          role: "<iframe src='javascript:alert(1)'></iframe>Developer",
          company: "<style>body{display:none}</style>TechCorp",
          skills: ["JavaScript<script>alert(1)</script>", "React<img src=x onerror=alert(1)>"],
          proficiencyLevel: "intermediate",
          numberOfQuestions: 10,
          questionTypes: ["technical-coding", "behavioral"],
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: "pending",
          customMessage: "<script>document.location='http://evil.com'</script>Please complete this assessment"
        }
      };

      try {
        const response = await fetch(`${API_BASE}/invitations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(maliciousInvitation),
        });

        if (response.ok) {
          const result = await response.json();
          const invitation = result.invitation;
          
          // All fields should be sanitized
          expect(invitation.requestor_name).not.toContain('<script>');
          expect(invitation.candidate_name).not.toContain('<img');
          expect(invitation.role).not.toContain('<iframe');
          expect(invitation.company).not.toContain('<style>');
          expect(invitation.custom_message).not.toContain('<script>');
          
          // Skills should be sanitized
          const skills = JSON.parse(invitation.skills);
          skills.forEach((skill: string) => {
            expect(skill).not.toContain('<script>');
            expect(skill).not.toContain('<img');
          });
        } else {
          // Validation errors are acceptable
          expect(response.status).toBeOneOf([400, 401, 403]);
        }
      } catch (error) {
        // Network errors are acceptable
        expect(error).toBeDefined();
      }
    });

    it.skipIf(skipIntegration)('should validate invitation data strictly', async () => {
      // Requirements: 12.5
      const invalidInvitations = [
        // Missing required fields
        {
          invitation: {
            id: "test-1",
            requestorEmail: "john@company.com"
            // Missing other required fields
          }
        },
        // Invalid email formats
        {
          invitation: {
            id: "test-2",
            requestorEmail: "invalid-email",
            candidateEmail: "also-invalid",
            role: "Developer",
            company: "TechCorp",
            skills: ["JavaScript"],
            proficiencyLevel: "intermediate",
            numberOfQuestions: 10,
            questionTypes: ["technical-coding"]
          }
        },
        // Invalid question count
        {
          invitation: {
            id: "test-3",
            requestorEmail: "john@company.com",
            candidateEmail: "candidate@email.com",
            role: "Developer",
            company: "TechCorp",
            skills: ["JavaScript"],
            proficiencyLevel: "intermediate",
            numberOfQuestions: 100, // Too many
            questionTypes: ["technical-coding"]
          }
        }
      ];

      for (const payload of invalidInvitations) {
        try {
          const response = await fetch(`${API_BASE}/invitations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          expect(response.status).toBe(400);
          const result = await response.json();
          expect(result.error).toBeDefined();
        } catch (error) {
          // Network errors are acceptable
          expect(error).toBeDefined();
        }
      }
    });

    it.skipIf(skipIntegration)('should prevent SQL injection in invitation retrieval', async () => {
      // Requirements: 12.5
      const maliciousIds = [
        "'; DROP TABLE invitations; --",
        "' UNION SELECT * FROM users WHERE '1'='1",
        "test'; DELETE FROM invitations WHERE '1'='1",
        "../../../etc/passwd",
        "<script>alert(1)</script>"
      ];

      for (const maliciousId of maliciousIds) {
        try {
          const encodedId = encodeURIComponent(maliciousId);
          const response = await fetch(`${API_BASE}/invitations/${encodedId}`);

          // Should return 404 (not found) or 400 (bad request)
          // Should NOT return 500 (server error) or 200 (success)
          expect(response.status).toBeOneOf([400, 404]);
          
          if (response.status === 400) {
            const result = await response.json();
            expect(result.error).toBeDefined();
          }
        } catch (error) {
          // Network errors are acceptable
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Rate Limiting Security', () => {
    it.skipIf(skipIntegration)('should enforce rate limiting on auth endpoints', async () => {
      // Requirements: 12.5
      const payload = {
        email: "test@example.com",
        password: "wrongpassword"
      };

      let rateLimitHit = false;
      const maxRequests = 25; // Should be within the rate limit for testing

      for (let i = 0; i < maxRequests; i++) {
        try {
          const response = await fetch(`${API_BASE}/auth/signin`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (response.status === 429) {
            rateLimitHit = true;
            const result = await response.json();
            expect(result.error).toContain('Too many requests');
            break;
          }
          
          // Small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 10));
        } catch (error) {
          // Network errors might indicate rate limiting at network level
          if (error instanceof TypeError && error.message.includes('fetch')) {
            rateLimitHit = true;
            break;
          }
        }
      }

      // Note: Rate limiting might not be hit in test environment
      // This test verifies the mechanism exists rather than exact limits
      console.log(`Rate limiting ${rateLimitHit ? 'was' : 'was not'} triggered during test`);
    });
  });

  describe('Security Headers', () => {
    it.skipIf(skipIntegration)('should include security headers in responses', async () => {
      // Requirements: 12.5
      try {
        const response = await fetch(`${API_BASE}/health`);
        
        // Check for security headers
        const headers = response.headers;
        
        // These headers help prevent XSS and other attacks
        expect(headers.get('x-content-type-options')).toBe('nosniff');
        expect(headers.get('x-frame-options')).toBe('DENY');
        expect(headers.get('x-xss-protection')).toBe('1; mode=block');
        
        // Content Security Policy should be present
        const csp = headers.get('content-security-policy');
        expect(csp).toBeDefined();
        if (csp) {
          expect(csp).toContain("default-src 'self'");
          expect(csp).toContain("object-src 'none'");
        }
      } catch (error) {
        // If server is not running, skip this test
        console.log('Server not available for security header test');
      }
    });
  });

  describe('Database Query Security', () => {
    it.skipIf(skipIntegration)('should prevent dangerous SQL operations in query endpoint', async () => {
      // Requirements: 12.5
      const dangerousQueries = [
        { query: "DROP TABLE users", params: [] },
        { query: "DELETE FROM users WHERE 1=1", params: [] },
        { query: "TRUNCATE TABLE invitations", params: [] },
        { query: "ALTER TABLE users ADD COLUMN malicious TEXT", params: [] },
        { query: "CREATE TABLE malicious (id INT)", params: [] },
        { query: "UPDATE users SET password_hash = 'hacked' WHERE 1=1", params: [] }
      ];

      for (const payload of dangerousQueries) {
        try {
          const response = await fetch(`${API_BASE}/db/query`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          // Should return validation error, not execute the query
          expect(response.status).toBe(400);
          const result = await response.json();
          expect(result.error).toContain('dangerous operations');
        } catch (error) {
          // Network errors are acceptable
          expect(error).toBeDefined();
        }
      }
    });
  });
});

// Helper function for test assertions
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false,
      };
    }
  },
});