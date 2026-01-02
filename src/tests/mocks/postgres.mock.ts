/**
 * Mock implementation of postgres.ts for testing
 * This allows tests to run without a database connection
 */

import * as bcrypt from 'bcrypt';

// In-memory storage for testing
const mockUsers: Array<{
  id: string;
  email: string;
  password_hash: string;
  name?: string;
  created_at: string;
  updated_at: string;
}> = [];

const mockProfiles: Array<{
  id: string;
  email: string;
  name?: string;
  created_at: string;
  updated_at: string;
}> = [];

const mockSessions: Array<{
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}> = [];

const mockInvitations: Array<{
  id: string;
  requestor_id: string;
  requestor_name: string;
  requestor_email: string;
  candidate_email: string;
  candidate_name?: string;
  role: string;
  company: string;
  skills: string; // JSON string
  proficiency_level: string;
  number_of_questions: number;
  question_types: string; // JSON string
  expires_at: string;
  created_at: string;
  status: string;
  custom_message?: string;
}> = [];

// Helper to generate UUIDs for testing
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Helper to generate session tokens
const generateSessionToken = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  user: User;
  access_token: string;
}

class MockPostgresAuth {
  async signUp(email: string, password: string, name?: string) {
    try {
      // Check if user already exists
      const existingUser = mockUsers.find(u => u.email === email);
      if (existingUser) {
        return { user: null, error: { message: 'User already exists' } };
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);
      
      // Create user
      const userId = generateUUID();
      const now = new Date().toISOString();
      
      const newUser = {
        id: userId,
        email,
        password_hash,
        name,
        created_at: now,
        updated_at: now
      };
      
      mockUsers.push(newUser);
      
      // Create profile
      const newProfile = {
        id: userId,
        email,
        name,
        created_at: now,
        updated_at: now
      };
      
      mockProfiles.push(newProfile);
      
      const user: User = {
        id: userId,
        email,
        created_at: now,
        updated_at: now
      };
      
      return { user, error: null };
    } catch (error: any) {
      return { user: null, error: { message: error.message } };
    }
  }

  async signIn(email: string, password: string) {
    try {
      // Find user
      const user = mockUsers.find(u => u.email === email);
      if (!user) {
        return { data: null, error: { message: 'Invalid credentials' } };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return { data: null, error: { message: 'Invalid credentials' } };
      }

      // Create session
      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
      
      const session = {
        id: generateUUID(),
        user_id: user.id,
        token: sessionToken,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      };
      
      mockSessions.push(session);
      
      const userData: User = {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at
      };
      
      const sessionData: Session = {
        user: userData,
        access_token: sessionToken
      };
      
      return { data: { session: sessionData }, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  }

  async signOut(token: string) {
    try {
      // Remove session
      const sessionIndex = mockSessions.findIndex(s => s.token === token);
      if (sessionIndex >= 0) {
        mockSessions.splice(sessionIndex, 1);
      }
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  }

  async getUser(token: string) {
    try {
      // Find session
      const session = mockSessions.find(s => s.token === token);
      if (!session) {
        return { data: { user: null }, error: { message: 'Invalid session' } };
      }

      // Check if session is expired
      if (new Date(session.expires_at) < new Date()) {
        return { data: { user: null }, error: { message: 'Session expired' } };
      }

      // Find user
      const user = mockUsers.find(u => u.id === session.user_id);
      if (!user) {
        return { data: { user: null }, error: { message: 'User not found' } };
      }

      const userData: User = {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at
      };

      return { data: { user: userData }, error: null };
    } catch (error: any) {
      return { data: { user: null }, error: { message: error.message } };
    }
  }
}

export const auth = new MockPostgresAuth();

// Mock invitation functions
export async function createInvitation(invitationData: any) {
  try {
    const now = new Date().toISOString();
    const invitation = {
      id: invitationData.id,
      requestor_id: invitationData.requestorId,
      requestor_name: invitationData.requestorName,
      requestor_email: invitationData.requestorEmail,
      candidate_email: invitationData.candidateEmail,
      candidate_name: invitationData.candidateName,
      role: invitationData.role,
      company: invitationData.company,
      skills: JSON.stringify(invitationData.skills),
      proficiency_level: invitationData.proficiencyLevel,
      number_of_questions: invitationData.numberOfQuestions,
      question_types: JSON.stringify(invitationData.questionTypes),
      expires_at: invitationData.expiresAt,
      created_at: now,
      status: invitationData.status || 'pending',
      custom_message: invitationData.customMessage
    };
    
    mockInvitations.push(invitation);
    return { invitation };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getInvitation(id: string) {
  try {
    const invitation = mockInvitations.find(inv => inv.id === id);
    if (!invitation) {
      return { invitation: null, error: 'Invitation not found' };
    }
    
    // Parse JSON fields for return
    const parsedInvitation = {
      ...invitation,
      skills: JSON.parse(invitation.skills),
      question_types: JSON.parse(invitation.question_types)
    };
    
    return { invitation: parsedInvitation, error: null };
  } catch (error: any) {
    return { invitation: null, error: error.message };
  }
}

// Mock database query helper
export async function query(text: string, params?: any[]) {
  try {
    // Parse the SQL query to determine what to return
    const queryLower = text.toLowerCase().trim();
    
    if (queryLower.includes('select') && queryLower.includes('password_hash') && queryLower.includes('users')) {
      // Query for password hash
      const userId = params?.[0];
      const user = mockUsers.find(u => u.id === userId);
      if (user) {
        return { rows: [{ password_hash: user.password_hash }] };
      }
      return { rows: [] };
    }
    
    if (queryLower.includes('select') && queryLower.includes('token') && queryLower.includes('user_sessions')) {
      // Query for session tokens
      const userId = params?.[0];
      const userSessions = mockSessions.filter(s => s.user_id === userId);
      return { rows: userSessions.map(s => ({ token: s.token })) };
    }
    
    if (queryLower.includes('select') && queryLower.includes('id') && queryLower.includes('users') && queryLower.includes('email')) {
      // Query for user by email
      const email = params?.[0];
      const user = mockUsers.find(u => u.email === email);
      if (user) {
        return { rows: [{ id: user.id }] };
      }
      return { rows: [] };
    }
    
    if (queryLower.includes('insert') && queryLower.includes('invitations')) {
      // Handle invitation insertion
      const [id, requestor_id, requestor_name, requestor_email, candidate_email, 
             candidate_name, role, company, skills, proficiency_level, 
             number_of_questions, question_types, expires_at, status, custom_message] = params || [];
      
      const now = new Date().toISOString();
      const invitation = {
        id,
        requestor_id,
        requestor_name,
        requestor_email,
        candidate_email,
        candidate_name,
        role,
        company,
        skills,
        proficiency_level,
        number_of_questions,
        question_types,
        expires_at,
        created_at: now,
        status,
        custom_message
      };
      
      mockInvitations.push(invitation);
      return { rows: [invitation] };
    }
    
    if (queryLower.includes('select') && queryLower.includes('invitations') && queryLower.includes('where id')) {
      // Query for specific invitation by ID
      const id = params?.[0];
      const invitation = mockInvitations.find(inv => inv.id === id);
      if (invitation) {
        return { rows: [invitation] };
      }
      return { rows: [] };
    }
    
    if (queryLower.includes('select') && queryLower.includes('invitations') && !queryLower.includes('where')) {
      // Query for all invitations
      return { rows: mockInvitations };
    }
    
    if (queryLower.includes('update') && queryLower.includes('invitations')) {
      // Handle invitation updates
      const id = params?.[1]; // Assuming UPDATE invitations SET status = $1 WHERE id = $2
      const newStatus = params?.[0];
      
      const invitationIndex = mockInvitations.findIndex(inv => inv.id === id);
      if (invitationIndex >= 0) {
        mockInvitations[invitationIndex].status = newStatus;
        return { rows: [mockInvitations[invitationIndex]] };
      }
      return { rows: [] };
    }
    
    if (queryLower.includes('delete')) {
      // Handle delete operations
      if (queryLower.includes('user_sessions')) {
        const userId = params?.[0];
        for (let i = mockSessions.length - 1; i >= 0; i--) {
          if (mockSessions[i].user_id === userId) {
            mockSessions.splice(i, 1);
          }
        }
        return { rows: [] };
      }
      
      if (queryLower.includes('profiles')) {
        const userId = params?.[0];
        const profileIndex = mockProfiles.findIndex(p => p.id === userId);
        if (profileIndex >= 0) {
          mockProfiles.splice(profileIndex, 1);
        }
        return { rows: [] };
      }
      
      if (queryLower.includes('users')) {
        const userId = params?.[0];
        const userIndex = mockUsers.findIndex(u => u.id === userId);
        if (userIndex >= 0) {
          mockUsers.splice(userIndex, 1);
        }
        return { rows: [] };
      }
    }
    
    // Default return for unhandled queries
    return { rows: [] };
  } catch (error) {
    throw error;
  }
}

// Helper function to clear mock data between tests
export function clearMockData() {
  mockUsers.length = 0;
  mockProfiles.length = 0;
  mockSessions.length = 0;
  mockInvitations.length = 0;
}