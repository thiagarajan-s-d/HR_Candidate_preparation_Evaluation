export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface InterviewConfig {
  role: string;
  company: string;
  skills: string[];
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  numberOfQuestions: number;
  questionTypes: QuestionType[];
}

export interface Question {
  id: string;
  question: string;
  category: string;
  difficulty: string;
  type: QuestionType;
  answer?: string;
  explanation?: string;
  links?: string[];
}

export interface UserAnswer {
  questionId: string;
  answer: string;
  timeSpent: number;
}

export interface EvaluationResult {
  score: number;
  totalQuestions: number;
  assessedProficiency: string;
  categoryScores: Record<string, number>;
  typeScores: Record<string, number>;
  feedback: string;
  recommendations: string[];
}

export interface InvitationConfig {
  id: string;
  requestorId: string;
  requestorName: string;
  requestorEmail: string;
  candidateEmail: string;
  candidateName?: string;
  role: string;
  company: string;
  skills: string[];
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  numberOfQuestions: number;
  questionTypes: QuestionType[];
  expiresAt: string;
  createdAt: string;
  status: 'pending' | 'started' | 'completed' | 'expired';
  customMessage?: string;
}

export interface CandidateSession {
  invitationId: string;
  candidateInfo: {
    name: string;
    email: string;
    phone?: string;
    experience?: string;
  };
  startedAt: string;
  completedAt?: string;
  results?: EvaluationResult;
  answers: UserAnswer[];
}

export type AppMode = 'learn' | 'mock' | 'evaluate' | 'invite';
export type ViewMode = 'web' | 'chat';

export type QuestionType = 
  | 'technical-coding'
  | 'technical-concepts' 
  | 'system-design'
  | 'behavioral'
  | 'problem-solving'
  | 'case-study'
  | 'architecture'
  | 'debugging';

export interface QuestionTypeOption {
  id: QuestionType;
  label: string;
  description: string;
  icon: string;
}