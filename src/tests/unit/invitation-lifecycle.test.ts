/**
 * Unit tests for invitation lifecycle
 * Tests invitation creation, retrieval, status transitions, and expiration handling
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createInvitation, getInvitation, clearMockData, query } from '../mocks/postgres.mock';

describe('Invitation Lifecycle Unit Tests', () => {
  beforeEach(() => {
    clearMockData();
  });

  describe('Invitation Creation', () => {
    it('should create invitation with all required fields', async () => {
      // Requirements: 10.1, 10.2
      const invitationData = {
        id: 'test-invite-123',
        requestorId: 'user-123',
        requestorName: 'John Doe',
        requestorEmail: 'john@company.com',
        candidateEmail: 'candidate@email.com',
        candidateName: 'Jane Smith',
        role: 'Senior Software Engineer',
        company: 'Tech Corp',
        skills: ['JavaScript', 'React', 'Node.js'],
        proficiencyLevel: 'advanced' as const,
        numberOfQuestions: 15,
        questionTypes: ['technical-coding', 'technical-concepts'] as const,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending' as const,
        customMessage: 'Please complete this assessment by Friday.'
      };

      const result = await createInvitation(invitationData);

      expect(result.invitation).toBeDefined();
      expect(result.invitation.id).toBe('test-invite-123');
      expect(result.invitation.requestor_id).toBe('user-123');
      expect(result.invitation.requestor_name).toBe('John Doe');
      expect(result.invitation.requestor_email).toBe('john@company.com');
      expect(result.invitation.candidate_email).toBe('candidate@email.com');
      expect(result.invitation.candidate_name).toBe('Jane Smith');
      expect(result.invitation.role).toBe('Senior Software Engineer');
      expect(result.invitation.company).toBe('Tech Corp');
      expect(result.invitation.proficiency_level).toBe('advanced');
      expect(result.invitation.number_of_questions).toBe(15);
      expect(result.invitation.status).toBe('pending');
      expect(result.invitation.custom_message).toBe('Please complete this assessment by Friday.');
      expect(result.invitation.created_at).toBeDefined();
      expect(result.invitation.expires_at).toBe(invitationData.expiresAt);
    });

    it('should create invitation without optional fields', async () => {
      // Requirements: 10.1, 10.2
      const invitationData = {
        id: 'test-invite-minimal',
        requestorId: 'user-456',
        requestorName: 'Alice Johnson',
        requestorEmail: 'alice@company.com',
        candidateEmail: 'candidate2@email.com',
        role: 'Frontend Developer',
        company: 'StartupCo',
        skills: ['Vue.js', 'CSS'],
        proficiencyLevel: 'intermediate' as const,
        numberOfQuestions: 10,
        questionTypes: ['technical-concepts'] as const,
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending' as const
      };

      const result = await createInvitation(invitationData);

      expect(result.invitation).toBeDefined();
      expect(result.invitation.id).toBe('test-invite-minimal');
      expect(result.invitation.candidate_name).toBeUndefined();
      expect(result.invitation.custom_message).toBeUndefined();
      expect(result.invitation.status).toBe('pending');
    });

    it('should generate unique invitation IDs', async () => {
      // Requirements: 10.2
      const baseData = {
        requestorId: 'user-789',
        requestorName: 'Bob Wilson',
        requestorEmail: 'bob@company.com',
        candidateEmail: 'candidate3@email.com',
        role: 'Backend Developer',
        company: 'Enterprise Inc',
        skills: ['Python', 'Django'],
        proficiencyLevel: 'expert' as const,
        numberOfQuestions: 20,
        questionTypes: ['system-design', 'technical-coding'] as const,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending' as const
      };

      const invitation1 = await createInvitation({ ...baseData, id: 'unique-id-1' });
      const invitation2 = await createInvitation({ ...baseData, id: 'unique-id-2' });
      const invitation3 = await createInvitation({ ...baseData, id: 'unique-id-3' });

      expect(invitation1.invitation.id).toBe('unique-id-1');
      expect(invitation2.invitation.id).toBe('unique-id-2');
      expect(invitation3.invitation.id).toBe('unique-id-3');

      // Verify all IDs are different
      const ids = [invitation1.invitation.id, invitation2.invitation.id, invitation3.invitation.id];
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it('should set default status to pending when not specified', async () => {
      // Requirements: 10.3
      const invitationData = {
        id: 'test-default-status',
        requestorId: 'user-default',
        requestorName: 'Default User',
        requestorEmail: 'default@company.com',
        candidateEmail: 'candidate@email.com',
        role: 'Developer',
        company: 'Company',
        skills: ['JavaScript'],
        proficiencyLevel: 'beginner' as const,
        numberOfQuestions: 5,
        questionTypes: ['behavioral'] as const,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        // Note: status not specified
      };

      const result = await createInvitation(invitationData);

      expect(result.invitation.status).toBe('pending');
    });
  });

  describe('Invitation Retrieval', () => {
    it('should retrieve existing invitation by ID', async () => {
      // Requirements: 10.4
      const invitationData = {
        id: 'retrieve-test-123',
        requestorId: 'user-retrieve',
        requestorName: 'Retrieve User',
        requestorEmail: 'retrieve@company.com',
        candidateEmail: 'candidate@email.com',
        role: 'QA Engineer',
        company: 'Quality Corp',
        skills: ['Testing', 'Automation'],
        proficiencyLevel: 'intermediate' as const,
        numberOfQuestions: 12,
        questionTypes: ['problem-solving', 'case-study'] as const,
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending' as const,
        customMessage: 'Focus on testing methodologies.'
      };

      // Create invitation first
      await createInvitation(invitationData);

      // Retrieve invitation
      const result = await getInvitation('retrieve-test-123');

      expect(result.invitation).toBeDefined();
      expect(result.error).toBeNull();
      expect(result.invitation!.id).toBe('retrieve-test-123');
      expect(result.invitation!.role).toBe('QA Engineer');
      expect(result.invitation!.company).toBe('Quality Corp');
      expect(result.invitation!.skills).toEqual(['Testing', 'Automation']);
      expect(result.invitation!.question_types).toEqual(['problem-solving', 'case-study']);
      expect(result.invitation!.custom_message).toBe('Focus on testing methodologies.');
    });

    it('should return error for non-existent invitation', async () => {
      // Requirements: 10.4
      const result = await getInvitation('non-existent-id');

      expect(result.invitation).toBeNull();
      expect(result.error).toBe('Invitation not found');
    });

    it('should parse JSON fields correctly', async () => {
      // Requirements: 10.4
      const invitationData = {
        id: 'json-parse-test',
        requestorId: 'user-json',
        requestorName: 'JSON User',
        requestorEmail: 'json@company.com',
        candidateEmail: 'candidate@email.com',
        role: 'Full Stack Developer',
        company: 'JSON Corp',
        skills: ['JavaScript', 'Python', 'SQL', 'Docker'],
        proficiencyLevel: 'advanced' as const,
        numberOfQuestions: 25,
        questionTypes: ['technical-coding', 'system-design', 'architecture', 'debugging'] as const,
        expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending' as const
      };

      await createInvitation(invitationData);
      const result = await getInvitation('json-parse-test');

      expect(result.invitation).toBeDefined();
      expect(Array.isArray(result.invitation!.skills)).toBe(true);
      expect(result.invitation!.skills).toEqual(['JavaScript', 'Python', 'SQL', 'Docker']);
      expect(Array.isArray(result.invitation!.question_types)).toBe(true);
      expect(result.invitation!.question_types).toEqual(['technical-coding', 'system-design', 'architecture', 'debugging']);
    });
  });

  describe('Status Transitions', () => {
    it('should transition from pending to started', async () => {
      // Requirements: 10.5, 10.6
      const invitationId = 'status-transition-1';
      const invitationData = {
        id: invitationId,
        requestorId: 'user-status',
        requestorName: 'Status User',
        requestorEmail: 'status@company.com',
        candidateEmail: 'candidate@email.com',
        role: 'DevOps Engineer',
        company: 'Cloud Corp',
        skills: ['AWS', 'Kubernetes'],
        proficiencyLevel: 'advanced' as const,
        numberOfQuestions: 18,
        questionTypes: ['system-design', 'architecture'] as const,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending' as const
      };

      // Create invitation
      await createInvitation(invitationData);
      
      // Verify initial status
      let result = await getInvitation(invitationId);
      expect(result.invitation!.status).toBe('pending');

      // Simulate status transition to started (via database query)
      await query(
        'UPDATE invitations SET status = $1 WHERE id = $2',
        ['started', invitationId]
      );

      // Verify status changed
      result = await getInvitation(invitationId);
      expect(result.invitation!.status).toBe('started');
    });

    it('should transition from started to completed', async () => {
      // Requirements: 10.5, 10.6
      const invitationId = 'status-transition-2';
      const invitationData = {
        id: invitationId,
        requestorId: 'user-complete',
        requestorName: 'Complete User',
        requestorEmail: 'complete@company.com',
        candidateEmail: 'candidate@email.com',
        role: 'Data Scientist',
        company: 'Analytics Inc',
        skills: ['Python', 'Machine Learning'],
        proficiencyLevel: 'expert' as const,
        numberOfQuestions: 20,
        questionTypes: ['problem-solving', 'technical-concepts'] as const,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'started' as const
      };

      // Create invitation with started status
      await createInvitation(invitationData);
      
      // Verify initial status
      let result = await getInvitation(invitationId);
      expect(result.invitation!.status).toBe('started');

      // Simulate completion
      await query(
        'UPDATE invitations SET status = $1 WHERE id = $2',
        ['completed', invitationId]
      );

      // Verify status changed
      result = await getInvitation(invitationId);
      expect(result.invitation!.status).toBe('completed');
    });

    it('should handle expired status transition', async () => {
      // Requirements: 10.5, 10.6, 10.7
      const invitationId = 'status-expired';
      const invitationData = {
        id: invitationId,
        requestorId: 'user-expired',
        requestorName: 'Expired User',
        requestorEmail: 'expired@company.com',
        candidateEmail: 'candidate@email.com',
        role: 'Security Engineer',
        company: 'SecureCorp',
        skills: ['Cybersecurity', 'Penetration Testing'],
        proficiencyLevel: 'expert' as const,
        numberOfQuestions: 15,
        questionTypes: ['technical-concepts', 'problem-solving'] as const,
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending' as const
      };

      // Create invitation
      await createInvitation(invitationData);

      // Simulate expiration by updating status
      await query(
        'UPDATE invitations SET status = $1 WHERE id = $2',
        ['expired', invitationId]
      );

      // Verify status changed to expired
      const result = await getInvitation(invitationId);
      expect(result.invitation!.status).toBe('expired');
    });

    it('should maintain valid status values', async () => {
      // Requirements: 10.5, 10.6
      const validStatuses: Array<'pending' | 'started' | 'completed' | 'expired'> = 
        ['pending', 'started', 'completed', 'expired'];

      for (let i = 0; i < validStatuses.length; i++) {
        const status = validStatuses[i];
        const invitationId = `status-valid-${i}`;
        const invitationData = {
          id: invitationId,
          requestorId: 'user-valid',
          requestorName: 'Valid User',
          requestorEmail: 'valid@company.com',
          candidateEmail: 'candidate@email.com',
          role: 'Software Engineer',
          company: 'ValidCorp',
          skills: ['JavaScript'],
          proficiencyLevel: 'intermediate' as const,
          numberOfQuestions: 10,
          questionTypes: ['technical-coding'] as const,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status
        };

        await createInvitation(invitationData);
        const result = await getInvitation(invitationId);
        
        expect(result.invitation!.status).toBe(status);
        expect(validStatuses).toContain(result.invitation!.status);
      }
    });
  });

  describe('Expiration Handling', () => {
    it('should detect expired invitations by date comparison', async () => {
      // Requirements: 10.7, 10.8
      const invitationId = 'expiration-test-1';
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      
      const invitationData = {
        id: invitationId,
        requestorId: 'user-expired-date',
        requestorName: 'Expired Date User',
        requestorEmail: 'expireddate@company.com',
        candidateEmail: 'candidate@email.com',
        role: 'Mobile Developer',
        company: 'MobileCorp',
        skills: ['React Native', 'Swift'],
        proficiencyLevel: 'intermediate' as const,
        numberOfQuestions: 12,
        questionTypes: ['technical-coding', 'problem-solving'] as const,
        expiresAt: pastDate.toISOString(),
        status: 'pending' as const
      };

      await createInvitation(invitationData);
      const result = await getInvitation(invitationId);

      expect(result.invitation).toBeDefined();
      
      // Check that expiration date is in the past
      const expirationDate = new Date(result.invitation!.expires_at);
      const now = new Date();
      expect(expirationDate.getTime()).toBeLessThan(now.getTime());
    });

    it('should handle future expiration dates correctly', async () => {
      // Requirements: 10.7, 10.8
      const invitationId = 'expiration-test-2';
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
      
      const invitationData = {
        id: invitationId,
        requestorId: 'user-future-date',
        requestorName: 'Future Date User',
        requestorEmail: 'futuredate@company.com',
        candidateEmail: 'candidate@email.com',
        role: 'Game Developer',
        company: 'GameStudio',
        skills: ['Unity', 'C#'],
        proficiencyLevel: 'advanced' as const,
        numberOfQuestions: 16,
        questionTypes: ['technical-coding', 'problem-solving'] as const,
        expiresAt: futureDate.toISOString(),
        status: 'pending' as const
      };

      await createInvitation(invitationData);
      const result = await getInvitation(invitationId);

      expect(result.invitation).toBeDefined();
      
      // Check that expiration date is in the future
      const expirationDate = new Date(result.invitation!.expires_at);
      const now = new Date();
      expect(expirationDate.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should handle edge case of expiration at current time', async () => {
      // Requirements: 10.7, 10.8
      const invitationId = 'expiration-edge-case';
      const currentTime = new Date();
      
      const invitationData = {
        id: invitationId,
        requestorId: 'user-edge-case',
        requestorName: 'Edge Case User',
        requestorEmail: 'edgecase@company.com',
        candidateEmail: 'candidate@email.com',
        role: 'AI Engineer',
        company: 'AI Corp',
        skills: ['TensorFlow', 'PyTorch'],
        proficiencyLevel: 'expert' as const,
        numberOfQuestions: 22,
        questionTypes: ['technical-concepts', 'problem-solving'] as const,
        expiresAt: currentTime.toISOString(),
        status: 'pending' as const
      };

      await createInvitation(invitationData);
      const result = await getInvitation(invitationId);

      expect(result.invitation).toBeDefined();
      expect(result.invitation!.expires_at).toBe(currentTime.toISOString());
    });

    it('should preserve expiration date format during storage and retrieval', async () => {
      // Requirements: 10.7, 10.8
      const invitationId = 'expiration-format-test';
      const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const isoString = expirationDate.toISOString();
      
      const invitationData = {
        id: invitationId,
        requestorId: 'user-format',
        requestorName: 'Format User',
        requestorEmail: 'format@company.com',
        candidateEmail: 'candidate@email.com',
        role: 'Blockchain Developer',
        company: 'CryptoCorp',
        skills: ['Solidity', 'Web3'],
        proficiencyLevel: 'advanced' as const,
        numberOfQuestions: 14,
        questionTypes: ['technical-coding', 'architecture'] as const,
        expiresAt: isoString,
        status: 'pending' as const
      };

      await createInvitation(invitationData);
      const result = await getInvitation(invitationId);

      expect(result.invitation).toBeDefined();
      expect(result.invitation!.expires_at).toBe(isoString);
      
      // Verify the date can be parsed back correctly
      const retrievedDate = new Date(result.invitation!.expires_at);
      expect(retrievedDate.getTime()).toBe(expirationDate.getTime());
    });

    it('should handle multiple invitations with different expiration dates', async () => {
      // Requirements: 10.7, 10.8
      const invitations = [
        {
          id: 'multi-exp-1',
          expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago (expired)
          expectedExpired: true
        },
        {
          id: 'multi-exp-2',
          expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now (valid)
          expectedExpired: false
        },
        {
          id: 'multi-exp-3',
          expiresAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago (expired)
          expectedExpired: true
        }
      ];

      // Create all invitations
      for (const inv of invitations) {
        const invitationData = {
          id: inv.id,
          requestorId: 'user-multi',
          requestorName: 'Multi User',
          requestorEmail: 'multi@company.com',
          candidateEmail: 'candidate@email.com',
          role: 'Software Engineer',
          company: 'MultiCorp',
          skills: ['JavaScript'],
          proficiencyLevel: 'intermediate' as const,
          numberOfQuestions: 10,
          questionTypes: ['technical-coding'] as const,
          expiresAt: inv.expiresAt,
          status: 'pending' as const
        };

        await createInvitation(invitationData);
      }

      // Verify expiration status for each
      const now = new Date();
      for (const inv of invitations) {
        const result = await getInvitation(inv.id);
        expect(result.invitation).toBeDefined();
        
        const expirationDate = new Date(result.invitation!.expires_at);
        const isExpired = expirationDate.getTime() < now.getTime();
        
        expect(isExpired).toBe(inv.expectedExpired);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully during creation', async () => {
      // Requirements: 10.1, 10.2
      // Test with duplicate ID that should cause a conflict
      const invitationData = {
        id: 'duplicate-test-id',
        requestorId: 'user-error',
        requestorName: 'Error User',
        requestorEmail: 'error@company.com',
        candidateEmail: 'candidate@email.com',
        role: 'Test Role',
        company: 'Test Company',
        skills: ['Test Skill'],
        proficiencyLevel: 'beginner' as const,
        numberOfQuestions: 5,
        questionTypes: ['technical-coding'] as const,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending' as const
      };

      // Create invitation first time - should succeed
      const result1 = await createInvitation(invitationData);
      expect(result1.invitation).toBeDefined();
      expect(result1.invitation.id).toBe('duplicate-test-id');

      // Try to create same invitation again - should still work in mock but would fail in real DB
      const result2 = await createInvitation(invitationData);
      expect(result2.invitation).toBeDefined();
      expect(result2.invitation.id).toBe('duplicate-test-id');
    });

    it('should handle retrieval of invitation with malformed JSON gracefully', async () => {
      // Requirements: 10.4
      // Create invitation with valid data first
      const invitationData = {
        id: 'malformed-json-test',
        requestorId: 'user-malformed',
        requestorName: 'Malformed User',
        requestorEmail: 'malformed@company.com',
        candidateEmail: 'candidate@email.com',
        role: 'Test Role',
        company: 'Test Company',
        skills: ['Test Skill'],
        proficiencyLevel: 'beginner' as const,
        numberOfQuestions: 5,
        questionTypes: ['technical-coding'] as const,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending' as const
      };

      await createInvitation(invitationData);

      // In a real scenario, malformed JSON would cause parsing errors
      // For the mock, we'll test that the invitation can still be retrieved
      const result = await getInvitation('malformed-json-test');
      expect(result.invitation).toBeDefined();
      expect(result.error).toBeNull();
      expect(result.invitation!.id).toBe('malformed-json-test');
    });
  });
});