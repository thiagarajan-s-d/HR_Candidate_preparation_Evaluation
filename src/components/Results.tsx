import React from 'react';
import { motion } from 'framer-motion';
import { Download, Star, TrendingUp, BookOpen, Target, Mail, User, Building } from 'lucide-react';
import { EvaluationResult, InterviewConfig, InvitationConfig } from '../types';

interface ResultsProps {
  result: EvaluationResult;
  config: InterviewConfig;
  invitation?: InvitationConfig | null;
  onDownload: () => void;
  onRestart: () => void;
}

export const Results: React.FC<ResultsProps> = ({ result, config, invitation, onDownload, onRestart }) => {
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 55) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 85) return 'bg-green-100';
    if (score >= 70) return 'bg-blue-100';
    if (score >= 55) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const isInvitedCandidate = !!invitation;

  // Send results via email simulation (in production, this would be a real email service)
  const sendResultsEmail = () => {
    const emailData = {
      to: [invitation?.candidateEmail, invitation?.requestorEmail],
      subject: `Interview Assessment Results - ${config.role} at ${config.company}`,
      results: result,
      config: config,
      invitation: invitation
    };
    
    console.log('Email would be sent with data:', emailData);
    alert('Results have been sent to both candidate and requestor via email!');
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="space-y-6"
    >
      {/* Header for Invited Candidates */}
      {isInvitedCandidate && (
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6 rounded-xl">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Assessment Complete!</h1>
            <p className="text-orange-100">
              Thank you for completing the evaluation for <strong>{config.company}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Candidate Information (for invited assessments) */}
      {isInvitedCandidate && invitation && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <User className="h-6 w-6 mr-2 text-blue-600" />
            Assessment Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-gray-700"><strong>Candidate:</strong> {invitation.candidateEmail}</p>
              <p className="text-gray-700"><strong>Position:</strong> {config.role}</p>
              <p className="text-gray-700"><strong>Company:</strong> {config.company}</p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-700"><strong>Requestor:</strong> {invitation.requestorName}</p>
              <p className="text-gray-700"><strong>Assessment Date:</strong> {new Date().toLocaleDateString()}</p>
              <p className="text-gray-700"><strong>Skills Evaluated:</strong> {config.skills.join(', ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Overall Score */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {isInvitedCandidate ? 'Your Assessment Results' : 'Interview Results'}
          </h2>
          <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getScoreBackground(result.score)} mb-4`}>
            <span className={`text-4xl font-bold ${getScoreColor(result.score)}`}>
              {result.score}%
            </span>
          </div>
          <p className="text-xl text-gray-700 mb-2">
            Assessed Proficiency: <span className="font-semibold capitalize">{result.assessedProficiency}</span>
          </p>
          <p className="text-gray-600">{result.totalQuestions} questions completed</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-6 w-6 mr-2 text-blue-600" />
          Performance by Skill Category
        </h3>
        <div className="space-y-4">
          {Object.entries(result.categoryScores).map(([category, score]) => (
            <div key={category} className="flex items-center justify-between">
              <span className="text-gray-700 font-medium">{category}</span>
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-blue-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <span className={`font-semibold ${getScoreColor(score)}`}>{score}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Question Type Breakdown */}
      {result.typeScores && Object.keys(result.typeScores).length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Target className="h-6 w-6 mr-2 text-purple-600" />
            Performance by Question Type
          </h3>
          <div className="space-y-4">
            {Object.entries(result.typeScores).map(([type, score]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-gray-700 font-medium capitalize">
                  {type.replace('-', ' ')}
                </span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-blue-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className={`font-semibold ${getScoreColor(score)}`}>{score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Star className="h-6 w-6 mr-2 text-yellow-500" />
          Detailed Feedback
        </h3>
        <p className="text-gray-700 mb-4">{result.feedback}</p>
        
        <h4 className="font-semibold text-gray-900 mb-2">Recommendations for Improvement:</h4>
        <ul className="space-y-2">
          {result.recommendations.map((recommendation, index) => (
            <li key={index} className="flex items-start space-x-2">
              <BookOpen className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">{recommendation}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onDownload}
          className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="h-5 w-5" />
          <span>Download Results</span>
        </button>
        
        {isInvitedCandidate && (
          <button
            onClick={sendResultsEmail}
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Mail className="h-5 w-5" />
            <span>Email Results</span>
          </button>
        )}
        
        {!isInvitedCandidate && (
          <button
            onClick={onRestart}
            className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Take Another Assessment
          </button>
        )}
      </div>

      {/* Thank You Message for Invited Candidates */}
      {isInvitedCandidate && (
        <div className="bg-blue-50 p-6 rounded-xl text-center">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Thank You!</h3>
          <p className="text-blue-800">
            Your assessment has been completed and the results have been shared with the hiring team. 
            They will be in touch with you regarding the next steps in the interview process.
          </p>
          <p className="text-blue-700 text-sm mt-2">
            <strong>Requestor:</strong> {invitation?.requestorName} ({invitation?.requestorEmail})
          </p>
        </div>
      )}
    </motion.div>
  );
};