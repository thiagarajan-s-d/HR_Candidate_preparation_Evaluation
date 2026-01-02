# Design Document

## Overview

The HR Candidate Evaluation System is a full-stack web application built with React (TypeScript) frontend and Node.js/Express backend, utilizing PostgreSQL for data persistence and Groq LLM for AI-powered question generation and evaluation. The system follows a client-server architecture with RESTful API communication.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + TypeScript)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Components  │  │    Hooks     │  │   Services   │     │
│  │  - UI Views  │  │  - useAuth   │  │  - API calls │     │
│  │  - Forms     │  │  - useLLM    │  │  - Postgres  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (Node.js + Express)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Auth Routes │  │  Invitation  │  │  DB Queries  │     │
│  │              │  │    Routes    │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    users     │  │  invitations │  │user_sessions │     │
│  │   profiles   │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  ┌──────────────────────────────────────────────────┐       │
│  │              Groq LLM API                        │       │
│  │  - Question Generation (llama-4-scout-17b)      │       │
│  │  - Answer Evaluation                             │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18.3.1 with TypeScript
- Vite (build tool)
- Framer Motion (animations)
- Tailwind CSS (styling)
- Lucide React (icons)

**Backend:**
- Node.js with Express 4.18.2
- PostgreSQL 8.11.3 (database)
- bcrypt 5.1.1 (password hashing)
- CORS (cross-origin support)

**AI/ML:**
- Groq SDK 0.7.0
- Model: meta-llama/llama-4-scout-17b-16e-instruct

## Components and Interfaces

### Frontend Components

#### 1. App Component (src/App.tsx)
Main application component managing global state and routing.

**State Management:**
- `appState`: Current application view (mode-selection, config, questions, results, auth, invite, candidate)
- `selectedMode`: Interview mode (learn, mock, evaluate, invite)
- `config`: Assessment configuration
- `questions`: Generated questions array
- `userAnswers`: Candidate responses
- `results`: Evaluation results
- `currentInvitation`: Active invitation data

**Key Methods:**
- `handleModeChange(mode)`: Switch between interview modes
- `handleConfigSubmit(config)`: Process configuration and generate questions
- `handleAnswer(answer, timeSpent)`: Record candidate answer
- `handleNext()`: Navigate to next question
- `finishAssessment()`: Complete assessment and evaluate answers

#### 2. Authentication Components

**AuthForm (src/components/AuthForm.tsx)**
- Handles user registration and login
- Validates email format and password length
- Displays error messages for failed authentication

**useAuth Hook (src/hooks/useAuth.ts)**
- Manages authentication state
- Provides login, register, logout functions
- Handles session token storage
- Loads user profile from database

#### 3. Configuration Components

**ConfigForm (src/components/ConfigForm.tsx)**
- Collects assessment parameters
- Validates required fields
- Manages skill tags and question type selection
- Supports dynamic form validation

**ModeSelector (src/components/ModeSelector.tsx)**
- Displays available interview modes
- Shows authentication requirements
- Provides mode descriptions

#### 4. Question Components

**QuestionView (src/components/QuestionView.tsx)**
- Displays current question with metadata
- Manages answer input (text and voice)
- Shows timers for question and total assessment
- Handles navigation between questions
- Displays sample answers in learn/mock modes
- Supports question skipping and review

**VoiceInput (src/components/VoiceInput.tsx)**
- Provides voice-to-text input
- Uses Web Speech API
- Falls back to text input if unavailable

#### 5. Results Components

**Results (src/components/Results.tsx)**
- Displays overall score and proficiency
- Shows category and type breakdowns
- Presents detailed feedback
- Provides question-by-question analysis
- Supports results download

#### 6. Invitation Components

**InviteForm (src/components/InviteForm.tsx)**
- Creates assessment invitations
- Generates unique invitation links
- Configures assessment parameters
- Sets expiration dates

**CandidateView (src/components/CandidateView.tsx)**
- Displays invitation details to candidates
- Shows assessment requirements
- Initiates candidate assessment

### Backend API Endpoints

#### Authentication Endpoints

**POST /api/auth/signup**
```typescript
Request: { email: string, password: string, name?: string }
Response: { user: { id, email, created_at, updated_at } }
```

**POST /api/auth/signin**
```typescript
Request: { email: string, password: string }
Response: { session: { user, access_token } }
```

**POST /api/auth/signout**
```typescript
Headers: { Authorization: "Bearer <token>" }
Response: { success: boolean }
```

**GET /api/auth/user**
```typescript
Headers: { Authorization: "Bearer <token>" }
Response: { user: { id, email, created_at, updated_at } }
```

#### Invitation Endpoints

**POST /api/invitations**
```typescript
Request: { invitation: InvitationConfig }
Response: { invitation: InvitationConfig }
```

**GET /api/invitations/:id**
```typescript
Response: { invitation: InvitationConfig }
```

**GET /api/invitations**
```typescript
Response: { invitations: InvitationConfig[] }
```

#### Database Endpoints

**POST /api/db/query**
```typescript
Request: { query: string, params?: any[] }
Response: { rows: any[] }
```

### Custom Hooks

#### useLLM Hook (src/hooks/useLLM.ts)

**generateQuestions(config: InterviewConfig): Promise<Question[]>**
- Constructs prompt with assessment requirements
- Calls Groq API with llama-4-scout-17b model
- Parses JSON response
- Validates and deduplicates questions
- Falls back to template-based generation on failure
- Returns array of Question objects

**evaluateAnswers(questions, answers, config): Promise<EvaluationResult>**
- Constructs evaluation prompt with questions and answers
- Calls Groq API for assessment
- Parses evaluation scores and feedback
- Calculates category and type scores
- Falls back to heuristic evaluation on failure
- Returns EvaluationResult object

## Data Models

### User Model
```typescript
interface User {
  id: string;              // UUID
  email: string;           // Unique email
  name?: string;           // Optional display name
}
```

### InterviewConfig Model
```typescript
interface InterviewConfig {
  role: string;                    // Job title
  company: string;                 // Company name
  skills: string[];                // Required skills
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  numberOfQuestions: number;       // 5-30
  questionTypes: QuestionType[];   // Selected types
}
```

### Question Model
```typescript
interface Question {
  id: string;              // Unique identifier
  question: string;        // Question text
  category: string;        // Skill category
  difficulty: string;      // Proficiency level
  type: QuestionType;      // Question type
  answer?: string;         // Sample answer
  explanation?: string;    // Why this question matters
  links?: string[];        // Learning resources
}
```

### UserAnswer Model
```typescript
interface UserAnswer {
  questionId: string;      // Reference to question
  answer: string;          // Candidate's response
  timeSpent: number;       // Seconds spent
}
```

### EvaluationResult Model
```typescript
interface EvaluationResult {
  score: number;                              // Overall score 0-100
  totalQuestions: number;                     // Total questions
  assessedProficiency: string;                // Assessed level
  categoryScores: Record<string, number>;     // Scores by skill
  typeScores: Record<string, number>;         // Scores by type
  feedback: string;                           // Overall feedback
  recommendations: string[];                  // Improvement suggestions
  questionBreakdown?: {
    correct: QuestionResult[];
    incorrect: QuestionResult[];
    partiallyCorrect: QuestionResult[];
    unanswered: QuestionResult[];
  };
}
```

### InvitationConfig Model
```typescript
interface InvitationConfig {
  id: string;                      // Unique invitation ID
  requestorId: string;             // Evaluator user ID
  requestorName: string;           // Evaluator name
  requestorEmail: string;          // Evaluator email
  candidateEmail: string;          // Candidate email
  candidateName?: string;          // Candidate name
  role: string;                    // Job role
  company: string;                 // Company name
  skills: string[];                // Required skills
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  numberOfQuestions: number;       // Question count
  questionTypes: QuestionType[];   // Question types
  expiresAt: string;               // ISO date string
  createdAt: string;               // ISO date string
  status: 'pending' | 'started' | 'completed' | 'expired';
  customMessage?: string;          // Optional message
}
```

### Database Schema

**users table:**
```sql
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  email_verified boolean DEFAULT false,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb
);
```

**profiles table:**
```sql
CREATE TABLE profiles (
  id uuid REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**user_sessions table:**
```sql
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

**invitations table:**
```sql
CREATE TABLE invitations (
  id text PRIMARY KEY,
  requestor_id uuid REFERENCES users(id) ON DELETE CASCADE,
  requestor_name text NOT NULL,
  requestor_email text NOT NULL,
  candidate_email text NOT NULL,
  candidate_name text,
  role text NOT NULL,
  company text NOT NULL,
  skills jsonb NOT NULL,
  proficiency_level text NOT NULL,
  number_of_questions integer NOT NULL,
  question_types jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending',
  custom_message text
);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Authentication Round Trip
*For any* valid user credentials (email and password), registering then logging in with those credentials should return the same user email.
**Validates: Requirements 1.1, 1.3**

### Property 2: Password Security
*For any* user registration, the stored password hash should never equal the plaintext password.
**Validates: Requirements 11.5**

### Property 3: Session Token Uniqueness
*For any* two concurrent login sessions, the generated session tokens should be unique.
**Validates: Requirements 1.3**

### Property 4: Configuration Validation
*For any* assessment configuration with empty required fields (role, company, skills, or questionTypes), form submission should be prevented.
**Validates: Requirements 3.1, 15.1, 15.4, 15.5**

### Property 5: Question Generation Count
*For any* valid assessment configuration requesting N questions, the question generator should return exactly N unique questions.
**Validates: Requirements 4.1, 4.3**

### Property 6: Question Uniqueness
*For any* generated question set, no two questions should have identical question text (case-insensitive).
**Validates: Requirements 4.3**

### Property 7: Answer Persistence
*For any* submitted answer, navigating away from the question and returning should preserve the answer text.
**Validates: Requirements 5.4, 14.6**

### Property 8: Time Limit Enforcement
*For any* question with time limit T seconds, if T seconds elapse without submission, the question should be automatically skipped.
**Validates: Requirements 6.2**

### Property 9: Evaluation Score Range
*For any* evaluated answer, the score should be between 0 and 100 inclusive.
**Validates: Requirements 8.3**

### Property 10: Invitation Expiration
*For any* invitation with expiration date in the past, accessing the invitation link should display an error message.
**Validates: Requirements 10.7**

### Property 11: Invitation ID Uniqueness
*For any* two created invitations, their invitation IDs should be unique.
**Validates: Requirements 10.2**

### Property 12: Results Completeness
*For any* completed assessment, the evaluation result should include scores for all question categories and types present in the assessment.
**Validates: Requirements 9.2, 9.3**

### Property 13: Fallback Question Generation
*For any* assessment configuration, if the Groq API fails, the system should still generate the requested number of questions using fallback templates.
**Validates: Requirements 4.5, 12.1**

### Property 14: Fallback Evaluation
*For any* completed assessment, if the Groq API fails, the system should still generate an evaluation result using heuristic scoring.
**Validates: Requirements 8.8, 12.2**

### Property 15: Navigation State Preservation
*For any* question navigation (previous/next), the current answer state should be preserved before navigation.
**Validates: Requirements 14.6**

## Error Handling

### API Error Handling

**Groq API Failures:**
- Catch network errors and API timeouts
- Log detailed error information to console
- Fall back to template-based question generation
- Fall back to heuristic answer evaluation
- Display user-friendly error messages

**Database Connection Failures:**
- Catch connection errors
- Attempt localStorage fallback for invitations
- Log errors for debugging
- Display appropriate error messages to users

**Authentication Errors:**
- Validate input before API calls
- Return specific error messages (invalid credentials, user exists, etc.)
- Clear invalid session tokens
- Redirect to login on authentication failures

### Validation Error Handling

**Form Validation:**
- Validate on submission attempt
- Display field-specific error messages
- Highlight invalid fields visually
- Prevent submission until valid
- Focus first invalid field

**Input Validation:**
- Email format validation
- Password length validation (minimum 6 characters)
- Required field validation
- Array length validation (skills, question types)

### Runtime Error Handling

**Voice Input Errors:**
- Check browser support for Web Speech API
- Request microphone permissions
- Handle permission denials gracefully
- Fall back to text input
- Display error messages for recognition failures

**Timer Errors:**
- Clean up timers on component unmount
- Handle edge cases (negative time, overflow)
- Auto-skip on question timeout
- Auto-finish on assessment timeout

## Testing Strategy

### Unit Testing

**Authentication Tests:**
- Test successful registration with valid credentials
- Test registration rejection with existing email
- Test successful login with valid credentials
- Test login rejection with invalid credentials
- Test logout clears session token
- Test password hashing never stores plaintext

**Configuration Tests:**
- Test form validation with empty fields
- Test skill addition and removal
- Test question type selection
- Test duplicate skill prevention
- Test form submission with valid data

**Question Generation Tests:**
- Test question count matches configuration
- Test question uniqueness within set
- Test fallback generation on API failure
- Test question structure validation

**Answer Evaluation Tests:**
- Test score calculation within valid range
- Test category score aggregation
- Test type score aggregation
- Test fallback evaluation on API failure

**Invitation Tests:**
- Test invitation creation with valid data
- Test invitation ID uniqueness
- Test expiration date calculation
- Test invitation link generation

### Property-Based Testing

Each correctness property should be implemented as a property-based test with minimum 100 iterations. Tests should use a property-based testing library appropriate for TypeScript/JavaScript (e.g., fast-check).

**Test Configuration:**
- Minimum 100 test iterations per property
- Random input generation for comprehensive coverage
- Each test tagged with: **Feature: hr-candidate-evaluation-system, Property {number}: {property_text}**

**Property Test Examples:**

```typescript
// Property 1: Authentication Round Trip
test('Feature: hr-candidate-evaluation-system, Property 1: Authentication Round Trip', () => {
  fc.assert(
    fc.property(
      fc.emailAddress(),
      fc.string({ minLength: 6 }),
      fc.string({ minLength: 1 }),
      async (email, password, name) => {
        // Register user
        const { user: registeredUser } = await auth.signUp(email, password, name);
        
        // Login with same credentials
        const { data } = await auth.signIn(email, password);
        
        // Email should match
        expect(data.session.user.email).toBe(email);
      }
    ),
    { numRuns: 100 }
  );
});

// Property 6: Question Uniqueness
test('Feature: hr-candidate-evaluation-system, Property 6: Question Uniqueness', () => {
  fc.assert(
    fc.property(
      fc.record({
        role: fc.string({ minLength: 1 }),
        company: fc.string({ minLength: 1 }),
        skills: fc.array(fc.string({ minLength: 1 }), { minLength: 1 }),
        proficiencyLevel: fc.constantFrom('beginner', 'intermediate', 'advanced', 'expert'),
        numberOfQuestions: fc.integer({ min: 5, max: 30 }),
        questionTypes: fc.array(
          fc.constantFrom('technical-coding', 'technical-concepts', 'system-design', 'behavioral'),
          { minLength: 1 }
        )
      }),
      async (config) => {
        const questions = await generateQuestions(config);
        
        // Extract question texts
        const questionTexts = questions.map(q => q.question.toLowerCase());
        
        // Check uniqueness
        const uniqueTexts = new Set(questionTexts);
        expect(uniqueTexts.size).toBe(questionTexts.length);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

**End-to-End Flows:**
- Complete learn mode flow
- Complete mock mode flow
- Complete evaluate mode flow with invitation
- Authentication flow (register → login → logout)
- Invitation creation and access flow

**API Integration:**
- Test all backend endpoints
- Test database operations
- Test Groq API integration
- Test error handling and fallbacks

### Manual Testing Checklist

- [ ] Test all three interview modes
- [ ] Test voice input functionality
- [ ] Test timer behavior and auto-skip
- [ ] Test question navigation
- [ ] Test invitation link sharing
- [ ] Test results download
- [ ] Test responsive design on mobile
- [ ] Test error messages and validation
- [ ] Test fallback behavior when API fails
- [ ] Test session persistence across page refreshes
