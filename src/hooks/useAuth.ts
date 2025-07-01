import { useState, useEffect } from 'react';
import { User } from '../types';
import { csvAuthManager } from '../utils/csvAuth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('interview_app_current_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('interview_app_current_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!email.trim() || !password.trim()) {
      console.log('Login failed: empty email or password');
      return false;
    }

    setLoading(true);
    try {
      console.log('Attempting login for:', email);
      const userRecord = await csvAuthManager.login(email.trim(), password);
      
      if (userRecord) {
        const user: User = {
          id: userRecord.id,
          email: userRecord.email,
          name: userRecord.name
        };
        
        console.log('Login successful, setting user:', user);
        setUser(user);
        localStorage.setItem('interview_app_current_user', JSON.stringify(user));
        setLoading(false);
        return true;
      } else {
        console.log('Login failed: invalid credentials');
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false);
      return false;
    }
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    if (!email.trim() || !password.trim() || !name.trim()) {
      console.log('Registration failed: missing required fields');
      return false;
    }

    if (password.length < 6) {
      console.log('Registration failed: password too short');
      return false;
    }

    setLoading(true);
    try {
      console.log('Attempting registration for:', email);
      const userRecord = await csvAuthManager.register(email.trim(), password, name.trim());
      
      if (userRecord) {
        const user: User = {
          id: userRecord.id,
          email: userRecord.email,
          name: userRecord.name
        };
        
        console.log('Registration successful, setting user:', user);
        setUser(user);
        localStorage.setItem('interview_app_current_user', JSON.stringify(user));
        setLoading(false);
        return true;
      } else {
        console.log('Registration failed: user already exists or other error');
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    console.log('Logging out user');
    setUser(null);
    localStorage.removeItem('interview_app_current_user');
  };

  // Debug method
  const debugAuth = async () => {
    await csvAuthManager.debugStorage();
  };

  return { user, login, register, logout, loading, debugAuth };
};