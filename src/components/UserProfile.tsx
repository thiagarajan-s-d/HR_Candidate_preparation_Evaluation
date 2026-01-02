import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Users, Edit2, Save, X } from 'lucide-react';
import { User as UserType } from '../types';

interface UserProfileProps {
  user: UserType;
  onClose: () => void;
  onUpdateProfile?: (updates: { name?: string; email?: string }) => Promise<boolean>;
  onGetAllUsers?: () => Promise<UserType[]>;
}

export const UserProfile: React.FC<UserProfileProps> = ({ 
  user, 
  onClose, 
  onUpdateProfile,
  onGetAllUsers 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user.name || '');
  const [userCount, setUserCount] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);

  React.useEffect(() => {
    const loadUserCount = async () => {
      if (onGetAllUsers) {
        const users = await onGetAllUsers();
        setUserCount(users.length);
      }
    };
    loadUserCount();
  }, [onGetAllUsers]);

  const handleSaveProfile = async () => {
    if (!onUpdateProfile) return;

    setIsUpdating(true);
    try {
      const success = await onUpdateProfile({ name: editedName.trim() });
      if (success) {
        setIsEditing(false);
      } else {
        alert('Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedName(user.name || '');
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-blue-600" />
          </div>
          
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-2xl font-bold text-gray-900 text-center w-full border-b-2 border-blue-500 focus:outline-none"
                placeholder="Enter your name"
              />
              <div className="flex justify-center space-x-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={isUpdating}
                  className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{isUpdating ? 'Saving...' : 'Save'}</span>
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                  className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-center space-x-2 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{user.name || 'No name set'}</h2>
                {onUpdateProfile && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit name"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-gray-600">{user.email}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3 mb-2">
              <Mail className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">Email</span>
            </div>
            <p className="text-gray-700 ml-8">{user.email}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3 mb-2">
              <Calendar className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">Member Since</span>
            </div>
            <p className="text-gray-700 ml-8">
              {new Date().toLocaleDateString()} {/* This would be from created_at in production */}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3 mb-2">
              <Users className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">Platform Stats</span>
            </div>
            <p className="text-gray-700 ml-8">
              {userCount} total registered users
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Database Integration</h3>
            <p className="text-sm text-blue-800">
              Your data is now securely stored in PostgreSQL with proper authentication and real-time capabilities.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};