# Requirements Document

## Introduction

The HR Candidate Evaluation System is a comprehensive web-based platform designed to facilitate technical interview preparation and candidate assessment. The system enables candidates to practice interview questions in learning mode, take mock interviews, and allows HR professionals to evaluate candidates through structured assessments with AI-powered question generation and evaluation using Groq LLM.

## Glossary

- **System**: The HR Candidate Evaluation Platform
- **Candidate**: A user taking an assessment or practicing interview questions
- **Evaluator**: An authenticated user (HR professional) who creates and sends assessment invitations
- **Assessment**: A structured set of interview questions with time limits and evaluation criteria
- **Invitation**: A unique link sent to candidates to access a specific assessment
- **Question_Generator**: The AI-powered component that generates interview questions using Groq LLM
- **Answer_Evaluator**: The AI-powered component that evaluates candidate responses
- **Database**: PostgreSQL database storing user data, invitations, and sessions
- **Auth_System**: Authentication and authorization system managing user access

## Requirements

### Requirement 1: User Authentication and Authorization

**User Story:** As a user, I want to securely register and login to the system, so that I can access personalized features and my assessment history.

#### Acceptance Criteria

1. WHEN a user provides valid email and password (minimum 6 characters), THE Auth_System SHALL create a new user account
2. WHEN a user attempts to register with an existing email, THE Auth_System SHALL reject the registration and return an error message
3. WHEN a user provides valid credentials for login, THE Auth_System SHALL authenticate the user and create a session token
4. WHEN a user provides invalid credentials, THE Auth_System SHALL reject the login attempt and return an error message
5. WHEN an authenticated user logs out, THE Auth_System SHALL invalidate the session token
6. WHEN a user accesses protected features without authentication, THE System SHALL redirect to the authentication page

### Requirement 2: Interview Mode Selection

**User Story:** As a user, I want to choose between different interview modes, so that I can practice or take assessments based on my needs.

#### Acceptance Criteria

1. THE System SHALL provide three modes: Learn, Mock, and Evaluate
2. WHEN a user selects Learn mode, THE System SHALL allow question practice with immediate answer visibility
3. WHEN a user selects Mock mode, THE System SHALL simulate interview conditions with answer reveal after submission
4. WHEN an unauthenticated user selects Evaluate mode, THE System SHALL require authentication before proceeding
5. WHEN an authenticated user selects Evaluate mode, THE System SHALL enable assessment invitation creation

### Requirement 3: Assessment Configuration

**User Story:** As a user, I want to configure interview parameters, so that I can customize the assessment to match specific job requirements.

#### Acceptance Criteria

1. WHEN configuring an assessment, THE System SHALL require role, company, at least one skill, and at least one question type
2. WHEN a user adds skills, THE System SHALL store them as a list and prevent duplicates
3. WHEN a user selects question types, THE System SHALL support: technical-coding, technical-concepts, system-design, behavioral, problem-solving, case-study, architecture, and debugging
4. WHEN a user sets proficiency level, THE System SHALL accept: beginner, intermediate, advanced, or expert
5. WHEN a user sets number of questions, THE System SHALL accept values between 5 and 30
6. WHEN configuration is incomplete, THE System SHALL display validation errors and prevent submission

### Requirement 4: AI-Powered Question Generation

**User Story:** As a user, I want the system to generate relevant interview questions using AI, so that I receive diverse and appropriate questions for my assessment.

#### Acceptance Criteria

1. WHEN an assessment is configured, THE Question_Generator SHALL use Groq LLM to generate the specified number of questions
2. WHEN generating questions, THE Question_Generator SHALL distribute questions across selected question types
3. WHEN generating questions, THE Question_Generator SHALL ensure each question is unique and tests different concepts
4. WHEN generating questions, THE Question_Generator SHALL include question text, type, category, difficulty, sample answer, explanation, and learning resources
5. IF the Groq API fails, THE Question_Generator SHALL generate fallback questions using predefined templates
6. WHEN questions are generated, THE System SHALL validate that each question has all required fields

### Requirement 5: Question Presentation and Answer Collection

**User Story:** As a candidate, I want to view questions one at a time with clear instructions, so that I can focus on providing thoughtful answers.

#### Acceptance Criteria

1. WHEN a question is displayed, THE System SHALL show question text, type, category, difficulty, and current progress
2. WHEN in Learn mode, THE System SHALL display the sample answer immediately
3. WHEN in Mock or Evaluate mode, THE System SHALL hide the sample answer until after submission
4. WHEN a candidate submits an answer, THE System SHALL record the answer text and time spent
5. WHEN a candidate skips a question, THE System SHALL mark it as skipped and allow return later
6. WHEN a candidate navigates between questions, THE System SHALL preserve previously entered answers

### Requirement 6: Time Management and Limits

**User Story:** As a candidate, I want to see time limits and track my progress, so that I can manage my time effectively during the assessment.

#### Acceptance Criteria

1. WHEN a question is displayed, THE System SHALL start a timer for that question
2. WHEN the question time limit is exceeded, THE System SHALL automatically skip the question
3. WHEN an assessment starts, THE System SHALL track total assessment time
4. WHEN total assessment time exceeds 1 hour, THE System SHALL automatically finish the assessment
5. WHEN displaying timers, THE System SHALL show both question time remaining and total assessment time
6. WHEN calculating time limits, THE System SHALL adjust based on question type and difficulty level

### Requirement 7: Voice Input Support

**User Story:** As a candidate, I want to use voice input for my answers, so that I can respond more naturally and efficiently.

#### Acceptance Criteria

1. WHEN a candidate clicks the microphone button, THE System SHALL request microphone permissions
2. WHEN microphone access is granted, THE System SHALL start recording voice input
3. WHEN voice input is detected, THE System SHALL convert speech to text in real-time
4. WHEN a candidate stops recording, THE System SHALL append the transcribed text to the answer field
5. IF voice recognition fails, THE System SHALL display an error message and allow manual text input

### Requirement 8: Answer Evaluation

**User Story:** As an evaluator, I want the system to automatically evaluate candidate answers, so that I can receive objective assessment results.

#### Acceptance Criteria

1. WHEN a candidate completes an assessment, THE Answer_Evaluator SHALL use Groq LLM to evaluate all answers
2. WHEN evaluating answers, THE Answer_Evaluator SHALL compare candidate responses to expected answers
3. WHEN evaluating answers, THE Answer_Evaluator SHALL calculate scores for each question (0-100)
4. WHEN evaluating answers, THE Answer_Evaluator SHALL categorize answers as: correct, partially-correct, incorrect, or unanswered
5. WHEN evaluating answers, THE Answer_Evaluator SHALL generate overall feedback and recommendations
6. WHEN evaluating answers, THE Answer_Evaluator SHALL calculate category scores and type scores
7. WHEN evaluating answers, THE Answer_Evaluator SHALL assess overall proficiency level
8. IF the Groq API fails, THE Answer_Evaluator SHALL use fallback evaluation based on answer length and content patterns

### Requirement 9: Results Presentation

**User Story:** As a candidate or evaluator, I want to view detailed assessment results, so that I can understand performance and areas for improvement.

#### Acceptance Criteria

1. WHEN results are displayed, THE System SHALL show overall score, total questions, and assessed proficiency level
2. WHEN results are displayed, THE System SHALL show category scores for each skill
3. WHEN results are displayed, THE System SHALL show type scores for each question type
4. WHEN results are displayed, THE System SHALL show detailed feedback and recommendations
5. WHEN results are displayed, THE System SHALL show question breakdown by category (correct, incorrect, partially-correct, unanswered)
6. WHEN a user requests to download results, THE System SHALL generate a JSON file with complete assessment data

### Requirement 10: Invitation Management

**User Story:** As an evaluator, I want to create and send assessment invitations to candidates, so that I can evaluate specific candidates for job positions.

#### Acceptance Criteria

1. WHEN creating an invitation, THE System SHALL require candidate email, role, company, skills, and question types
2. WHEN creating an invitation, THE System SHALL generate a unique invitation ID and link
3. WHEN creating an invitation, THE System SHALL set expiration date based on evaluator's selection (1-30 days)
4. WHEN creating an invitation, THE System SHALL store invitation data in the Database
5. WHEN an invitation is created, THE System SHALL display the invitation link for sharing
6. WHEN a candidate accesses an invitation link, THE System SHALL validate the invitation ID and expiration
7. IF an invitation is expired or invalid, THE System SHALL display an error message
8. WHEN a candidate completes an invited assessment, THE System SHALL update invitation status to completed

### Requirement 11: Data Persistence

**User Story:** As a system administrator, I want all user data and assessment results to be securely stored, so that data is not lost and can be retrieved later.

#### Acceptance Criteria

1. WHEN a user registers, THE Database SHALL store user credentials with hashed passwords
2. WHEN a user logs in, THE Database SHALL create and store a session token with expiration
3. WHEN an invitation is created, THE Database SHALL store all invitation details
4. WHEN a candidate completes an assessment, THE System SHALL store results in localStorage
5. WHEN storing passwords, THE System SHALL use bcrypt hashing with salt
6. WHEN storing session tokens, THE Database SHALL automatically clean expired sessions

### Requirement 12: Error Handling and Fallbacks

**User Story:** As a user, I want the system to handle errors gracefully, so that I can continue using the system even when external services fail.

#### Acceptance Criteria

1. WHEN the Groq API is unavailable, THE System SHALL use fallback question generation
2. WHEN the Groq API is unavailable, THE System SHALL use fallback answer evaluation
3. WHEN the Database connection fails, THE System SHALL attempt to use localStorage as fallback
4. WHEN an API call times out, THE System SHALL display a user-friendly error message
5. WHEN validation errors occur, THE System SHALL display specific error messages for each field
6. WHEN network errors occur, THE System SHALL log errors to console for debugging

### Requirement 13: User Interface Responsiveness

**User Story:** As a user, I want the interface to be responsive and provide visual feedback, so that I know the system is processing my actions.

#### Acceptance Criteria

1. WHEN an API call is in progress, THE System SHALL display a loading indicator
2. WHEN a form is submitted, THE System SHALL disable the submit button to prevent duplicate submissions
3. WHEN validation errors occur, THE System SHALL highlight invalid fields with error messages
4. WHEN actions complete successfully, THE System SHALL display success messages or visual confirmations
5. WHEN navigating between pages, THE System SHALL use smooth animations and transitions

### Requirement 14: Question Navigation

**User Story:** As a candidate, I want to navigate between questions freely, so that I can review and modify my answers before final submission.

#### Acceptance Criteria

1. WHEN viewing a question, THE System SHALL display navigation buttons for previous and next questions
2. WHEN on the first question, THE System SHALL disable the previous button
3. WHEN on the last question, THE System SHALL change the next button to "Finish Assessment"
4. WHEN skipped questions exist, THE System SHALL allow navigation back to skipped questions
5. WHEN all questions are answered, THE System SHALL enable the finish button
6. WHEN navigating between questions, THE System SHALL preserve answer state

### Requirement 15: Configuration Validation

**User Story:** As a user, I want the system to validate my configuration inputs, so that I don't create invalid assessments.

#### Acceptance Criteria

1. WHEN a required field is empty, THE System SHALL display a validation error
2. WHEN an email is invalid, THE System SHALL display an email format error
3. WHEN a password is too short, THE System SHALL display a password length error
4. WHEN no skills are added, THE System SHALL prevent form submission
5. WHEN no question types are selected, THE System SHALL prevent form submission
6. WHEN validation fails, THE System SHALL focus on the first invalid field
