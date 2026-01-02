// API base URL for backend
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper function for API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || errorData.message || response.statusText);
  }
  
  return response.json();
};

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  user: User;
  access_token: string;
}

class PostgresAuth {
  async signUp(email: string, password: string, name?: string) {
    try {
      console.log('Signup request:', { email, password: '***', name });
      const result = await apiCall('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      });
      console.log('Signup success:', result);
      return { user: result.user, error: null };
    } catch (error: any) {
      console.error('Signup error:', error.message);
      return { user: null, error: { message: error.message } };
    }
  }

  async signIn(email: string, password: string) {
    try {
      const result = await apiCall('/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return { data: result, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  }

  async signOut(token: string) {
    try {
      await apiCall('/auth/signout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  }

  async getUser(token: string) {
    try {
      const result = await apiCall('/auth/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { data: { user: result.user }, error: null };
    } catch (error: any) {
      return { data: { user: null }, error: { message: error.message } };
    }
  }


}

export const auth = new PostgresAuth();

// Database query helper
export async function query(text: string, params?: any[]) {
  try {
    const result = await apiCall('/db/query', {
      method: 'POST',
      body: JSON.stringify({ query: text, params }),
    });
    return { rows: result.rows };
  } catch (error) {
    throw error;
  }
}