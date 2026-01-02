import { useState, useEffect } from 'react';
import { User } from '../types';
import { ApiErrorHandler, apiCall } from '../lib/apiErrorHandler';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user and token are stored in localStorage
    const storedUser = localStorage.getItem('auth_user');
    const storedToken = localStorage.getItem('auth_token');
    
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
      }
    }
    setLoading(false);
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!email.trim() || !password.trim()) {
      return { success: false, error: 'Email and password are required.' };
    }

    try {
      const result = await apiCall(
        async () => {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
          const response = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email.trim(), password }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Login failed');
          }

          const data = await response.json();
          
          if (data.user && data.token) {
            const user: User = {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name || undefined
            };
            
            setUser(user);
            localStorage.setItem('auth_user', JSON.stringify(user));
            localStorage.setItem('auth_token', data.token);
            return { success: true };
          }

          throw new Error('Login failed. Please try again.');
        },
        'user-login',
        { maxRetries: 2 }
      );

      return result;
    } catch (error) {
      const errorInfo = ApiErrorHandler.categorizeError(error as Error);
      return { success: false, error: errorInfo.userMessage };
    }
  };

  const register = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    if (!email.trim() || !password.trim() || !name.trim()) {
      return { success: false, error: 'All fields are required.' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    try {
      const result = await apiCall(
        async () => {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
          const response = await fetch(`${apiUrl}/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Registration failed');
          }

          const data = await response.json();
          
          // Registration successful - don't auto-login for security
          return { success: true };
        },
        'user-registration',
        { maxRetries: 2 }
      );

      return result;
    } catch (error) {
      const errorInfo = ApiErrorHandler.categorizeError(error as Error);
      return { success: false, error: errorInfo.userMessage };
    }
  };

  const logout = async () => {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    setUser(null);
    setLoading(false);
  };

  const updateProfile = async (updates: { name?: string; email?: string }): Promise<boolean> => {
    if (!user) return false;

    try {
      // For now, just update locally. In a full implementation, you'd call an API
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      return true;
    } catch (error) {
      ApiErrorHandler.logError(error as Error, 'update-user-profile');
      return false;
    }
  };

  const getAllUsers = async (): Promise<User[]> => {
    try {
      return await apiCall(
        async () => {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
          const response = await fetch(`${apiUrl}/users`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders()
            } as HeadersInit,
          });

          if (!response.ok) {
            throw new Error('Failed to fetch users');
          }

          const data = await response.json();
          return data.users || [];
        },
        'get-all-users',
        { maxRetries: 2 }
      );
    } catch (error) {
      ApiErrorHandler.logError(error as Error, 'get-all-users');
      return [];
    }
  };

  const isAuthenticated = !!user && !!localStorage.getItem('auth_token');

  return {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    getAllUsers,
    getAuthHeaders,
    isAuthenticated
  };
};