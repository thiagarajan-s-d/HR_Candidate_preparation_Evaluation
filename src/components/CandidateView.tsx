import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Briefcase, Clock, Calendar, Building, Award } from 'lucide-react';
import { InvitationConfig } from '../types';

interface CandidateViewProps {
  invitation: InvitationConfig;
  onStart: (candidateInfo: any, invitation: InvitationConfig) => void;
}

export const CandidateView: React.FC<CandidateViewProps> = ({ invitation, onStart }) => {
  const [candidateInfo, setCandidateInfo] = useState({
    name: invitation.candidateName || 'Test Candidate',
    email: invitation.candidateEmail,
    phone: '+1-555-0123',
    experience: '3-5'
  });
  const [hasStarted, setHasStarted] = useState(false);

  const handleStart = () => {
    setHasStarted(true);
    onStart(candidateInfo, invitation);
  };

  const isExpired = new Date(invitation.expiresAt) < new Date();
  const timeRemaining = Math.ceil((new Date(invitation.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  if (isExpired) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto text-center"
      >
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Invitation Expired</h2>
        <p className="text-gray-600 mb-6">
          This evaluation invitation has expired. Please contact the requestor for a new invitation link.
        </p>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Requestor:</strong> {invitation.requestorName} ({invitation.requestorEmail})
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Award className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Evaluation</h1>
        <p className="text-xl text-gray-600">
          You've been invited to complete an assessment for <strong>{invitation.company}</strong>
        </p>
      </div>

      {/* Invitation Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Position Details
          </h3>
          <div className="space-y-3 text-blue-800">
            <p><strong>Role:</strong> {invitation.role}</p>
            <p><strong>Company:</strong> {invitation.company}</p>
            <p><strong>Skills Focus:</strong> {invitation.skills.join(', ')}</p>
            <p><strong>Level:</strong> {invitation.proficiencyLevel.charAt(0).toUpperCase() + invitation.proficiencyLevel.slice(1)}</p>
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Assessment Details
          </h3>
          <div className="space-y-3 text-green-800">
            <p><strong>Questions:</strong> {invitation.numberOfQuestions} questions</p>
            <p><strong>Question Types:</strong> {invitation.questionTypes.length} categories</p>
            <p><strong>Time Limit:</strong> No strict time limit</p>
            <p><strong>Expires:</strong> {timeRemaining > 0 ? `${timeRemaining} day${timeRemaining > 1 ? 's' : ''}` : 'Today'}</p>
          </div>
        </div>
      </div>

      {/* Requestor Information */}
      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">From: {invitation.requestorName}</h3>
        <p className="text-gray-700 mb-4">
          <strong>Email:</strong> {invitation.requestorEmail}
        </p>
        {invitation.customMessage && (
          <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
            <p className="text-gray-700 italic">"{invitation.customMessage}"</p>
          </div>
        )}
      </div>

      {/* Candidate Information Form */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <User className="h-5 w-5 mr-2" />
          Your Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={candidateInfo.name}
              onChange={(e) => setCandidateInfo(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your full name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={candidateInfo.email}
              onChange={(e) => setCandidateInfo(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={candidateInfo.phone}
              onChange={(e) => setCandidateInfo(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your phone number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Years of Experience (Optional)
            </label>
            <select
              value={candidateInfo.experience}
              onChange={(e) => setCandidateInfo(prev => ({ ...prev, experience: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select experience level</option>
              <option value="0-1">0-1 years</option>
              <option value="1-3">1-3 years</option>
              <option value="3-5">3-5 years</option>
              <option value="5-8">5-8 years</option>
              <option value="8+">8+ years</option>
            </select>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-amber-50 p-6 rounded-lg mb-8">
        <h3 className="text-lg font-semibold text-amber-900 mb-4">Assessment Instructions</h3>
        <ul className="space-y-2 text-amber-800">
          <li>• Answer all questions to the best of your ability</li>
          <li>• Take your time - there's no strict time limit</li>
          <li>• You can use voice input or type your answers</li>
          <li>• Once submitted, you cannot change your answers</li>
          <li>• Results will be shared with both you and the requestor</li>
        </ul>
      </div>

      {/* Start Button */}
      <div className="text-center">
        <button
          onClick={handleStart}
          disabled={!candidateInfo.name.trim() || hasStarted}
          className={`px-8 py-4 font-semibold rounded-lg transition-all duration-300 ${
            !candidateInfo.name.trim() || hasStarted
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 shadow-lg'
          }`}
        >
          {hasStarted ? 'Starting Assessment...' : 'Start Assessment'}
        </button>
        
        {!candidateInfo.name.trim() && (
          <p className="text-sm text-red-600 mt-2">
            Please enter your full name to continue
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
        <p>This assessment is powered by InterviewAce AI Platform</p>
        <p>Your responses will be evaluated using advanced AI technology</p>
      </div>
    </motion.div>
  );
};