---
inclusion: always
---

# HR Candidate Evaluation System - Project Overview

## Project Description

This is a full-stack web application for technical interview preparation and candidate assessment. The system provides three modes:

1. **Learn Mode**: Practice interview questions with immediate answer visibility
2. **Mock Mode**: Simulate interview conditions with timed questions and post-submission answer reveal
3. **Evaluate Mode**: HR professionals can create assessment invitations for candidates

## Technology Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useEffect)

### Backend
- **Runtime**: Node.js
- **Framework**: Express 4.18.2
- **Database**: PostgreSQL 8.11.3
- **Authentication**: bcrypt for password hashing
- **CORS**: Enabled for cross-origin requests

### AI/ML
- **Provider**: Groq
- **Model**: meta-llama/llama-4-scout-17b-16e-instruct
- **SDK**: groq-sdk 0.7.0
- **Use Cases**: Question generation and answer evaluation

## Project Structure

```
/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   ├── AuthForm.tsx         # Authentication UI
│   │   ├── ConfigForm.tsx       # Assessment configuration
│   │   ├── QuestionView.tsx     # Question display and answering
│   │   ├── Results.tsx          # Results display
│   │   ├── InviteForm.tsx       # Invitation creation
│   │   └── ...
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts           # Authentication logic
│   │   └── useLLM.ts            # LLM integration
│   ├── lib/                      # Utility libraries
│   │   ├── postgres.ts          # Database client
│   │   └── supabase.ts          # Legacy (not used)
│   ├── types/                    # TypeScript type definitions
│   │   └── index.ts             # All type definitions
│   └── App.tsx                   # Main application component
├── server/                       # Backend source code
│   ├── index.js                 # Express server
│   └── package.json             # Backend dependencies
├── .kiro/                        # Kiro configuration
│   ├── specs/                   # Feature specifications
│   └── steering/                # Agent steering files
├── postgres_setup.sql           # Legacy (use DB folder instead)
└── package.json                 # Frontend dependencies
```

## Key Features

1. **AI-Powered Question Generation**: Uses Groq LLM to generate diverse, relevant interview questions
2. **Multiple Question Types**: Supports 8 different question types (coding, concepts, system design, behavioral, etc.)
3. **Timed Assessments**: Questions and overall assessments have time limits
4. **Voice Input**: Candidates can use voice-to-text for answers
5. **Invitation System**: HR can send unique assessment links to candidates
6. **Comprehensive Evaluation**: AI-powered answer evaluation with detailed feedback
7. **Fallback Mechanisms**: System continues working even if AI services fail

## Environment Variables

Required environment variables (see `.env.example`):

```bash
# Groq API Configuration
VITE_GROQ_API_KEY=your_groq_api_key_here

# API Configuration
VITE_API_URL=http://localhost:3001/api

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=hr_candidate_eval
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
PORT=3001
HOST=0.0.0.0
```

## Development Commands

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install

# Start backend server (development)
cd server && npm run dev

# Start frontend (development)
npm run dev

# Build frontend for production
npm run build

# Run linter
npm run lint
```

## Database Setup

1. Create PostgreSQL database:
```sql
CREATE DATABASE hr_candidate_eval;
```

2. Run setup script:
```bash
# Use the organized DB folder setup instead
cd db && ./setup.sh
# Or on Windows: cd db && .\setup.bat
```

## Common Issues and Solutions

### Issue: Groq API Key Not Working
- Verify the API key is correctly set in `.env`
- Check that the key starts with `gsk_`
- Ensure the key has not expired
- System will fall back to template-based generation if API fails

### Issue: Database Connection Failed
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists and schema is created
- Check firewall settings if using remote database

### Issue: CORS Errors
- Verify `VITE_API_URL` matches the backend server URL
- Check that CORS is enabled in `server/index.js`
- Ensure frontend and backend are running on correct ports

### Issue: Voice Input Not Working
- Voice input requires HTTPS or localhost
- Check browser compatibility (Chrome/Edge recommended)
- Verify microphone permissions are granted
- System falls back to text input if voice fails

## Code Style Guidelines

1. **TypeScript**: Use strict typing, avoid `any` when possible
2. **React**: Use functional components with hooks
3. **Naming**: Use camelCase for variables/functions, PascalCase for components
4. **Comments**: Add JSDoc comments for complex functions
5. **Error Handling**: Always handle errors gracefully with user-friendly messages
6. **Async/Await**: Prefer async/await over promises for readability

## Testing Guidelines

1. **Property-Based Tests**: Use fast-check with minimum 100 iterations
2. **Unit Tests**: Test individual functions and components
3. **Integration Tests**: Test complete user flows
4. **Test Naming**: Use descriptive names that explain what is being tested
5. **Test Tags**: Tag property tests with feature name and property number
