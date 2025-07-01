import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Download, Upload, Users } from 'lucide-react';
import { User as UserType } from '../types';
import { csvAuthManager } from '../utils/csvAuth';

interface UserProfileProps {
  user: UserType;
  onClose: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onClose }) => {
  const [showExport, setShowExport] = useState(false);
  const [userCount, setUserCount] = useState<number>(0);

  React.useEffect(() => {
    const loadUserCount = async () => {
      const users = await csvAuthManager.getAllUsers();
      setUserCount(users.length);
    };
    loadUserCount();
  }, []);

  const handleExportCSV = async () => {
    try {
      const csvContent = await csvAuthManager.exportCSV();
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `interview-app-users-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowExport(false);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const csvContent = e.target?.result as string;
        const success = await csvAuthManager.importCSV(csvContent);
        if (success) {
          alert('CSV imported successfully!');
          const users = await csvAuthManager.getAllUsers();
          setUserCount(users.length);
        } else {
          alert('Failed to import CSV. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
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
          <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
          <p className="text-gray-600">{user.email}</p>
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
              {new Date(parseInt(user.id)).toLocaleDateString()}
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

        {/* Admin Features */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h3>
          
          <div className="space-y-3">
            <button
              onClick={() => setShowExport(!showExport)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export User Data (CSV)</span>
            </button>

            {showExport && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-green-50 p-3 rounded-lg"
              >
                <p className="text-sm text-green-800 mb-2">
                  This will download all user data as a CSV file for backup purposes.
                </p>
                <button
                  onClick={handleExportCSV}
                  className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                >
                  Download CSV
                </button>
              </motion.div>
            )}

            <div>
              <label className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                <Upload className="h-4 w-4" />
                <span>Import User Data (CSV)</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="hidden"
                />
              </label>
            </div>
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