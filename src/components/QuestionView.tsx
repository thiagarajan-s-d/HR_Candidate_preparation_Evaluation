import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, ChevronLeft, ChevronRight, BookOpen, ExternalLink, Code, Brain, Users, Wrench, Building, Bug, Lightbulb, FileText, User } from 'lucide-react';
import { Question, AppMode, QuestionType } from '../types';
import { VoiceInput } from './VoiceInput';

interface QuestionViewProps {
  question: Question;
  mode: AppMode;
  currentIndex: number;
  totalQuestions: number;
  onAnswer: (answer: string, timeSpent: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  canNavigate: boolean;
  isInvitedCandidate?: boolean;
}

const getQuestionTypeIcon = (type: QuestionType) => {
  const icons = {
    'technical-coding': Code,
    'technical-concepts': Brain,
    'system-design': Building,
    'behavioral': Users,
    'problem-solving': Lightbulb,
    'case-study': FileText,
    'architecture': Wrench,
    'debugging': Bug
  };
  return icons[type] || Code;
};

const getQuestionTypeColor = (type: QuestionType) => {
  const colors = {
    'technical-coding': 'bg-blue-100 text-blue-800',
    'technical-concepts': 'bg-purple-100 text-purple-800',
    'system-design': 'bg-green-100 text-green-800',
    'behavioral': 'bg-orange-100 text-orange-800',
    'problem-solving': 'bg-yellow-100 text-yellow-800',
    'case-study': 'bg-indigo-100 text-indigo-800',
    'architecture': 'bg-red-100 text-red-800',
    'debugging': 'bg-pink-100 text-pink-800'
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};

const getQuestionTypeLabel = (type: QuestionType) => {
  const labels = {
    'technical-coding': 'Technical Coding',
    'technical-concepts': 'Technical Concepts',
    'system-design': 'System Design',
    'behavioral': 'Behavioral',
    'problem-solving': 'Problem Solving',
    'case-study': 'Case Study',
    'architecture': 'Architecture',
    'debugging': 'Debugging'
  };
  return labels[type] || type;
};

// Component to render formatted text with proper line breaks and code blocks
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  // Convert markdown-style code blocks and formatting
  const formatText = (text: string) => {
    // Split by code blocks first
    const parts = text.split(/```(\w+)?\n([\s\S]*?)```/g);
    const elements = [];
    
    for (let i = 0; i < parts.length; i++) {
      if (i % 3 === 0) {
        // Regular text part
        const textPart = parts[i];
        if (textPart) {
          // Handle line breaks and bullet points
          const lines = textPart.split('\n');
          lines.forEach((line, lineIndex) => {
            if (line.trim()) {
              // Handle bold text
              const boldFormatted = line.split(/\*\*(.*?)\*\*/g);
              const lineElements = boldFormatted.map((part, partIndex) => {
                if (partIndex % 2 === 1) {
                  return <strong key={partIndex}>{part}</strong>;
                }
                return part;
              });
              
              // Check if it's a bullet point
              if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
                elements.push(
                  <div key={`${i}-${lineIndex}`} className="ml-4 mb-1">
                    {lineElements}
                  </div>
                );
              } else {
                elements.push(
                  <div key={`${i}-${lineIndex}`} className="mb-2">
                    {lineElements}
                  </div>
                );
              }
            } else if (lineIndex < lines.length - 1) {
              elements.push(<br key={`${i}-br-${lineIndex}`} />);
            }
          });
        }
      } else if (i % 3 === 2) {
        // Code block content
        const language = parts[i - 1] || 'javascript';
        const code = parts[i];
        if (code) {
          elements.push(
            <pre key={`code-${i}`} className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
              <code className={`language-${language}`}>
                {code.trim()}
              </code>
            </pre>
          );
        }
      }
    }
    
    return elements;
  };

  return <div className="whitespace-pre-wrap">{formatText(text)}</div>;
};

export const QuestionView: React.FC<QuestionViewProps> = ({
  question,
  mode,
  currentIndex,
  totalQuestions,
  onAnswer,
  onNext,
  onPrevious,
  canNavigate,
  isInvitedCandidate = false
}) => {
  const [answer, setAnswer] = useState('');
  const [timeSpent, setTimeSpent] = useState(0);
  const [showAnswer, setShowAnswer] = useState(mode === 'learn');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex]);

  useEffect(() => {
    setAnswer('');
    setTimeSpent(0);
    setShowAnswer(mode === 'learn');
    setHasSubmitted(false);
  }, [currentIndex, mode]);

  const handleSubmit = () => {
    if (answer.trim() && !hasSubmitted) {
      setHasSubmitted(true);
      onAnswer(answer, timeSpent);
      
      if (mode === 'mock') {
        setShowAnswer(true);
      }
      
      // Auto-navigate to next question after a brief delay
      setTimeout(() => {
        onNext();
      }, mode === 'mock' ? 2000 : 500); // Longer delay for mock mode to show answer
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const TypeIcon = getQuestionTypeIcon(question.type);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white rounded-xl shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className={`${isInvitedCandidate ? 'bg-gradient-to-r from-orange-600 to-red-600' : 'bg-gradient-to-r from-blue-600 to-purple-600'} text-white p-6`}>
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              {isInvitedCandidate && (
                <div className="flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-full">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">Candidate Assessment</span>
                </div>
              )}
              <h2 className="text-xl font-semibold">
                Question {currentIndex + 1} of {totalQuestions}
              </h2>
            </div>
            <div className="flex items-center space-x-4 mt-2">
              <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getQuestionTypeColor(question.type)}`}>
                <TypeIcon className="h-3 w-3" />
                <span>{getQuestionTypeLabel(question.type)}</span>
              </div>
              <span className={`text-sm ${isInvitedCandidate ? 'text-orange-100' : 'text-blue-100'}`}>
                Category: {question.category}
              </span>
              <span className={`text-sm ${isInvitedCandidate ? 'text-orange-100' : 'text-blue-100'}`}>
                Difficulty: {question.difficulty}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span className="font-mono">{formatTime(timeSpent)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="p-6 space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Question:</h3>
          <FormattedText text={question.question} />
        </div>

        {/* Answer Input with Voice Support */}
        {mode !== 'learn' && !showAnswer && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Answer:
            </label>
            <VoiceInput
              value={answer}
              onChange={setAnswer}
              placeholder="Type your answer here or use the microphone to dictate..."
            />
            
            <button
              onClick={handleSubmit}
              disabled={!answer.trim() || hasSubmitted}
              className={`mt-4 px-6 py-3 font-medium rounded-lg transition-all duration-200 ${
                hasSubmitted
                  ? 'bg-green-600 text-white cursor-default'
                  : !answer.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isInvitedCandidate
                  ? 'bg-orange-600 text-white hover:bg-orange-700 hover:shadow-lg transform hover:scale-105'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg transform hover:scale-105'
              }`}
            >
              {hasSubmitted ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitted! Moving to next...</span>
                </div>
              ) : (
                'Submit Answer'
              )}
            </button>
            
            {hasSubmitted && mode === 'mock' && (
              <p className="mt-2 text-sm text-green-600">
                Great! Your answer has been recorded. Showing sample answer below...
              </p>
            )}
          </div>
        )}

        {/* Sample Answer */}
        {showAnswer && question.answer && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-green-50 p-4 rounded-lg"
          >
            <div className="flex items-center space-x-2 mb-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-medium text-green-800">Sample Answer:</h3>
            </div>
            <div className="text-green-700 leading-relaxed mb-3">
              <FormattedText text={question.answer} />
            </div>
            
            {question.explanation && (
              <div className="bg-green-100 p-3 rounded-lg">
                <h4 className="font-medium text-green-800 mb-1">Explanation:</h4>
                <div className="text-green-700 text-sm">
                  <FormattedText text={question.explanation} />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Learning Resources */}
        {showAnswer && question.links && question.links.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-blue-800 mb-3">Further Learning:</h3>
            <div className="space-y-2">
              {question.links.map((link, index) => (
                <a
                  key={index}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="text-sm">{link}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
        <button
          onClick={onPrevious}
          disabled={currentIndex === 0}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
          <span>Previous</span>
        </button>

        <div className="flex space-x-2">
          {Array.from({ length: totalQuestions }).map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentIndex
                  ? isInvitedCandidate ? 'bg-orange-600' : 'bg-blue-600'
                  : index < currentIndex
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        <button
          onClick={onNext}
          disabled={!canNavigate && !hasSubmitted}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
            canNavigate || hasSubmitted
              ? isInvitedCandidate
                ? 'bg-orange-600 text-white hover:bg-orange-700 hover:shadow-lg'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>{currentIndex === totalQuestions - 1 ? 'Finish' : 'Next'}</span>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  );
};