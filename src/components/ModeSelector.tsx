import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Mic, Award, Lock, Send } from 'lucide-react';
import { AppMode } from '../types';

interface ModeSelectorProps {
  selectedMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  isAuthenticated: boolean;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ 
  selectedMode, 
  onModeChange, 
  isAuthenticated 
}) => {
  const modes = [
    {
      id: 'learn' as AppMode,
      title: 'Learn',
      description: 'Study interview questions with detailed answers and learning resources',
      icon: BookOpen,
      color: 'bg-green-50 border-green-200 text-green-800',
      iconColor: 'text-green-600',
      available: true
    },
    {
      id: 'mock' as AppMode,
      title: 'Mock Interview',
      description: 'Practice with timed questions and get immediate feedback',
      icon: Mic,
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      iconColor: 'text-blue-600',
      available: true
    },
    {
      id: 'evaluate' as AppMode,
      title: 'Evaluation',
      description: 'Take a comprehensive 25-question assessment with detailed scoring',
      icon: Award,
      color: 'bg-purple-50 border-purple-200 text-purple-800',
      iconColor: 'text-purple-600',
      available: isAuthenticated
    },
    {
      id: 'invite' as AppMode,
      title: 'Invite for Evaluation',
      description: 'Create custom assessments and send invitation links to candidates',
      icon: Send,
      color: 'bg-orange-50 border-orange-200 text-orange-800',
      iconColor: 'text-orange-600',
      available: isAuthenticated
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {modes.map((mode, index) => {
        const Icon = mode.icon;
        const isSelected = selectedMode === mode.id;
        
        return (
          <motion.div
            key={mode.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`relative cursor-pointer transition-all duration-300 ${
              isSelected 
                ? 'ring-2 ring-blue-500 shadow-lg transform scale-105' 
                : 'hover:shadow-md'
            }`}
            onClick={() => mode.available && onModeChange(mode.id)}
          >
            <div className={`p-6 rounded-xl border-2 ${mode.color} ${
              !mode.available ? 'opacity-50' : ''
            }`}>
              <div className="flex items-center justify-between mb-4">
                <Icon className={`h-8 w-8 ${mode.iconColor}`} />
                {!mode.available && <Lock className="h-5 w-5 text-gray-400" />}
              </div>
              <h3 className="text-lg font-semibold mb-2">{mode.title}</h3>
              <p className="text-sm opacity-80">{mode.description}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};