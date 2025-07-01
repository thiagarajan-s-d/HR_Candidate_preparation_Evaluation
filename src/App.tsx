import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Monitor } from 'lucide-react';
import { Header } from './components/Header';
import { ModeSelector } from './components/ModeSelector';
import { ConfigForm } from './components/ConfigForm';
import { QuestionView } from './components/QuestionView';
import { Results } from './components/Results';
import { AuthForm } from './components/AuthForm';
import { ChatInterface } from './components/ChatInterface';
import { InviteForm } from './components/InviteForm';
import { CandidateView } from './components/CandidateView';
import { useAuth } from './hooks/useAuth';
import { useLLM } from './hooks/useLLM';
import { AppMode, ViewMode, InterviewConfig, Question, UserAnswer, EvaluationResult, InvitationConfig } from './types';

type AppState = 'mode-selection' | 'config' | 'questions' | 'results' | 'auth' | 'invite' | 'candidate';

function App() {
  const { user, login, register, logout, loading: authLoading } = useAuth();
  const { generateQuestions, evaluateAnswers, loading: llmLoading } = useLLM();
  
  const [appState, setAppState] = useState<AppState>('mode-selection');
  const [selectedMode, setSelectedMode] = useState<AppMode>('learn');
  const [viewMode, setViewMode] = useState<ViewMode>('web');
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [results, setResults] = useState<EvaluationResult | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [currentInvitation, setCurrentInvitation] = useState<InvitationConfig | null>(null);

  // Check for invitation link on app load
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteId = urlParams.get('invite');
    
    if (inviteId) {
      // Load invitation from localStorage
      const invitations = JSON.parse(localStorage.getItem('interview_invitations') || '[]');
      const invitation = invitations.find((inv: InvitationConfig) => inv.id === inviteId);
      
      if (invitation && invitation.status !== 'expired' && new Date(invitation.expiresAt) > new Date()) {
        setCurrentInvitation(invitation);
        setAppState('candidate');
      } else {
        alert('This invitation link has expired or is invalid.');
      }
    }
  }, []);

  const handleModeChange = (mode: AppMode) => {
    console.log('Mode changed to:', mode);
    setSelectedMode(mode);
    if ((mode === 'evaluate' || mode === 'invite') && !user) {
      setAppState('auth');
    } else if (mode === 'invite') {
      setAppState('invite');
    } else {
      setAppState('config');
    }
  };

  const handleShowAuth = () => {
    setAppState('auth');
  };

  const handleConfigSubmit = async (interviewConfig: InterviewConfig) => {
    console.log('Config submitted:', interviewConfig);
    setConfig(interviewConfig);
    
    try {
      const generatedQuestions = await generateQuestions(interviewConfig);
      console.log('Generated questions:', generatedQuestions);
      setQuestions(generatedQuestions);
      setCurrentQuestionIndex(0);
      setUserAnswers([]);
      setAppState('questions');
    } catch (error) {
      console.error('Error generating questions:', error);
    }
  };

  const handleInvitationSent = () => {
    setAppState('mode-selection');
  };

  const handleCandidateStart = (candidateInfo: any, invitation: InvitationConfig) => {
    // Convert invitation to interview config
    const interviewConfig: InterviewConfig = {
      role: invitation.role,
      company: invitation.company,
      skills: invitation.skills,
      proficiencyLevel: invitation.proficiencyLevel,
      numberOfQuestions: invitation.numberOfQuestions,
      questionTypes: invitation.questionTypes
    };
    
    setConfig(interviewConfig);
    setCurrentInvitation(invitation);
    
    // Generate questions and start assessment
    generateQuestions(interviewConfig).then(generatedQuestions => {
      setQuestions(generatedQuestions);
      setCurrentQuestionIndex(0);
      setUserAnswers([]);
      setAppState('questions');
    });
  };

  const handleAnswer = (answer: string, timeSpent: number) => {
    const userAnswer: UserAnswer = {
      questionId: questions[currentQuestionIndex].id,
      answer,
      timeSpent
    };
    
    setUserAnswers(prev => [...prev, userAnswer]);
  };

  const handleNext = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // End of questions
      if (selectedMode === 'mock' || selectedMode === 'evaluate' || currentInvitation) {
        const evaluationResult = await evaluateAnswers(questions, userAnswers, config!);
        setResults(evaluationResult);
        
        // If this is an invited candidate, save the results
        if (currentInvitation) {
          const sessions = JSON.parse(localStorage.getItem('candidate_sessions') || '[]');
          const session = {
            invitationId: currentInvitation.id,
            candidateInfo: {
              name: 'Candidate', // This would come from candidate form
              email: currentInvitation.candidateEmail
            },
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            results: evaluationResult,
            answers: userAnswers
          };
          sessions.push(session);
          localStorage.setItem('candidate_sessions', JSON.stringify(sessions));
          
          // Update invitation status
          const invitations = JSON.parse(localStorage.getItem('interview_invitations') || '[]');
          const updatedInvitations = invitations.map((inv: InvitationConfig) =>
            inv.id === currentInvitation.id ? { ...inv, status: 'completed' } : inv
          );
          localStorage.setItem('interview_invitations', JSON.stringify(updatedInvitations));
        }
        
        setAppState('results');
      } else {
        // Learn mode - can restart or go back
        setAppState('mode-selection');
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleDownloadResults = () => {
    if (!results || !config) return;
    
    const reportData = {
      timestamp: new Date().toISOString(),
      user: user ? { id: user.id, name: user.name, email: user.email } : null,
      invitation: currentInvitation,
      config,
      results,
      answers: userAnswers
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-results-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestart = () => {
    setAppState('mode-selection');
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setResults(null);
    setCurrentInvitation(null);
  };

  const handleHome = () => {
    setAppState('mode-selection');
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setResults(null);
    setConfig(null);
    setCurrentInvitation(null);
  };

  const canNavigateNext = () => {
    if (selectedMode === 'learn') return true;
    const currentAnswer = userAnswers.find(a => a.questionId === questions[currentQuestionIndex]?.id);
    return !!currentAnswer;
  };

  const showHomeButton = appState !== 'mode-selection' && !currentInvitation;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header 
        user={user} 
        onLogout={logout} 
        onHome={handleHome}
        showHomeButton={showHomeButton}
        onShowAuth={handleShowAuth}
      />
      
      {/* View Mode Toggle - Hide for candidate view */}
      {!currentInvitation && (
        <div className="fixed top-20 right-4 z-40 flex bg-white rounded-lg shadow-lg p-1">
          <button
            onClick={() => setViewMode('web')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
              viewMode === 'web' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Monitor className="h-4 w-4" />
            <span className="text-sm">Web</span>
          </button>
          <button
            onClick={() => setChatOpen(true)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
              chatOpen ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm">Chat</span>
          </button>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {appState === 'auth' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AuthForm onLogin={login} onRegister={register} loading={authLoading} />
            </motion.div>
          )}

          {appState === 'candidate' && currentInvitation && (
            <motion.div
              key="candidate"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <CandidateView 
                invitation={currentInvitation}
                onStart={handleCandidateStart}
              />
            </motion.div>
          )}

          {appState === 'invite' && (
            <motion.div
              key="invite"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <InviteForm 
                requestor={user!}
                onInvitationSent={handleInvitationSent}
                loading={llmLoading}
              />
            </motion.div>
          )}

          {appState === 'mode-selection' && (
            <motion.div
              key="mode-selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Interview Preparation Platform
                </h1>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Master your interviews with AI-powered practice sessions, comprehensive learning resources, 
                  and detailed performance evaluations powered by Groq.
                </p>
                {user && (
                  <div className="mt-4 inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    Welcome back, {user.name}! You now have access to all features including evaluation mode.
                  </div>
                )}
              </div>
              
              <ModeSelector
                selectedMode={selectedMode}
                onModeChange={handleModeChange}
                isAuthenticated={!!user}
              />
            </motion.div>
          )}

          {appState === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ConfigForm
                mode={selectedMode}
                onSubmit={handleConfigSubmit}
                loading={llmLoading}
              />
            </motion.div>
          )}

          {appState === 'questions' && questions.length > 0 && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <QuestionView
                question={questions[currentQuestionIndex]}
                mode={currentInvitation ? 'evaluate' : selectedMode}
                currentIndex={currentQuestionIndex}
                totalQuestions={questions.length}
                onAnswer={handleAnswer}
                onNext={handleNext}
                onPrevious={handlePrevious}
                canNavigate={canNavigateNext()}
                isInvitedCandidate={!!currentInvitation}
              />
            </motion.div>
          )}

          {appState === 'results' && results && config && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Results
                result={results}
                config={config}
                invitation={currentInvitation}
                onDownload={handleDownloadResults}
                onRestart={handleRestart}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Chat Interface - Hide for candidate view */}
      {!currentInvitation && (
        <ChatInterface isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      )}
      
      {/* Loading Overlay */}
      {llmLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-700">Processing with Groq AI...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;