import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, User, LogOut, Home, LogIn } from 'lucide-react';
import { User as UserType } from '../types';
import { UserProfile } from './UserProfile';

interface HeaderProps {
  user: UserType | null;
  onLogout: () => void;
  onHome?: () => void;
  showHomeButton?: boolean;
  onShowAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  user, 
  onLogout, 
  onHome, 
  showHomeButton = false,
  onShowAuth 
}) => {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">InterviewAce</span>
              </div>
              
              {showHomeButton && onHome && (
                <button
                  onClick={onHome}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <button
                    onClick={() => setShowProfile(true)}
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <User className="h-5 w-5" />
                    <span>{user.name || user.email}</span>
                  </button>
                  <button
                    onClick={onLogout}
                    className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                onShowAuth && (
                  <button
                    onClick={onShowAuth}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Login / Register</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {showProfile && user && (
          <UserProfile 
            user={user} 
            onClose={() => setShowProfile(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
};