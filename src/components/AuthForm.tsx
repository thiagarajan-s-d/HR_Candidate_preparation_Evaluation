import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, UserPlus, LogIn, AlertCircle } from 'lucide-react';

interface AuthFormProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
  onRegister: (email: string, password: string, name: string) => Promise<boolean>;
  loading: boolean;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onLogin, onRegister, loading }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    if (!email.trim()) {
      setError('Email is required.');
      return false;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address.');
      return false;
    }
    
    if (!password.trim()) {
      setError('Password is required.');
      return false;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }
    
    if (!isLogin && !name.trim()) {
      setError('Full name is required for registration.');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log(`Attempting ${isLogin ? 'login' : 'registration'} for:`, email);
      
      const success = isLogin 
        ? await onLogin(email, password)
        : await onRegister(email, password, name);
      
      if (!success) {
        setError(isLogin 
          ? 'Invalid email or password. Please check your credentials and try again.'
          : 'Registration failed. Please check your details and try again.'
        );
      } else {
        console.log(`${isLogin ? 'Login' : 'Registration'} successful!`);
        // Clear form on success
        setEmail('');
        setPassword('');
        setName('');
        setError('');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setError('');
    setShowPassword(false);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  const isFormDisabled = loading || isSubmitting;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6"
    >
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-4">
          {isLogin ? (
            <LogIn className="h-8 w-8 text-blue-600" />
          ) : (
            <UserPlus className="h-8 w-8 text-green-600" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-gray-600 mt-2">
          {isLogin 
            ? 'Please log in to access the evaluation mode'
            : 'Create your profile to unlock all features'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isFormDisabled}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter your full name"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isFormDisabled}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter your email"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password *
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isFormDisabled}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isFormDisabled}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {!isLogin && (
            <p className="text-xs text-gray-500 mt-1">
              Password must be at least 6 characters long
            </p>
          )}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2"
          >
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </motion.div>
        )}

        <button
          type="submit"
          disabled={isFormDisabled}
          className={`w-full py-3 font-medium rounded-lg transition-colors ${
            isLogin
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isFormDisabled ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{isLogin ? 'Logging in...' : 'Creating account...'}</span>
            </div>
          ) : (
            isLogin ? 'Login' : 'Create Account'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button
            onClick={toggleMode}
            disabled={isFormDisabled}
            className={`ml-2 font-medium transition-colors disabled:opacity-50 ${
              isLogin ? 'text-green-600 hover:text-green-700' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>

      <div className="mt-4 text-center text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
        <p><strong>Supabase Integration:</strong> Your data is securely stored with proper authentication</p>
        <p>Create an account with any email and a 6+ character password</p>
      </div>
    </motion.div>
  );
};