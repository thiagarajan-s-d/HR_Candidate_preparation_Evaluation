import { useState } from 'react';
import Groq from 'groq-sdk';
import { InterviewConfig, Question, UserAnswer, EvaluationResult, QuestionType, QuestionResult } from '../types';
import { ApiErrorHandler, apiCall } from '../lib/apiErrorHandler';

// Initialize Groq client with detailed logging
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY || 'your-groq-api-key-here',
  dangerouslyAllowBrowser: true
});

// Log API key status (without exposing the actual key)
console.log('🔑 Groq API Key Status:', {
  hasKey: !!import.meta.env.VITE_GROQ_API_KEY,
  keyLength: import.meta.env.VITE_GROQ_API_KEY?.length || 0,
  keyPrefix: import.meta.env.VITE_GROQ_API_KEY?.substring(0, 8) + '...' || 'Not set'
});

const getQuestionTypeDescription = (type: QuestionType): string => {
  const descriptions = {
    'technical-coding': 'coding problems, algorithms, and data structures',
    'technical-concepts': 'theoretical concepts and fundamental principles',
    'system-design': 'system architecture, scalability, and design patterns',
    'behavioral': 'soft skills, teamwork, and past experiences',
    'problem-solving': 'logical reasoning and analytical thinking',
    'case-study': 'real-world scenarios and business problems',
    'architecture': 'software design patterns and architectural decisions',
    'debugging': 'code review, troubleshooting, and error analysis'
  };
  return descriptions[type] || 'general interview questions';
};

export const useLLM = () => {
  const [loading, setLoading] = useState(false);

  const generateQuestions = async (config: InterviewConfig): Promise<Question[]> => {
    console.log('🚀 Starting question generation process...');
    console.log('📋 Config received:', JSON.stringify(config, null, 2));
    
    setLoading(true);
    
    try {
      return await apiCall(
        async () => {
          // Check API key before making request
          if (!import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_GROQ_API_KEY === 'your-groq-api-key-here') {
            console.error('❌ Groq API key is not properly configured!');
            console.log('💡 Please set VITE_GROQ_API_KEY in your .env file');
            throw ApiErrorHandler.createApiError(
              'Groq API key not configured. Please check your .env file.',
              'AUTH_ERROR'
            );
          }

          console.log('✅ API key is configured, proceeding with API call...');
          
          // Create a more detailed prompt that ensures unique questions
          const questionTypesDescription = config.questionTypes
            .map(type => `${type}: ${getQuestionTypeDescription(type)}`)
            .join(', ');

          // Calculate distribution of questions across types
          const questionsPerType = Math.floor(config.numberOfQuestions / config.questionTypes.length);
          const remainingQuestions = config.numberOfQuestions % config.questionTypes.length;
          
          const typeDistribution = config.questionTypes.map((type, index) => ({
            type,
            count: questionsPerType + (index < remainingQuestions ? 1 : 0)
          }));

          console.log('📊 Question type distribution:', typeDistribution);

          const prompt = `You are generating interview questions for a ${config.role} position at ${config.company}.

REQUIREMENTS:
- Generate exactly ${config.numberOfQuestions} COMPLETELY DIFFERENT and UNIQUE questions
- Each question must be distinct and cover different aspects
- No two questions should be similar or test the same concept
- Proficiency level: ${config.proficiencyLevel}
- Skills focus: ${config.skills.join(', ')}

QUESTION DISTRIBUTION:
${typeDistribution.map(td => `- ${td.type}: ${td.count} questions (${getQuestionTypeDescription(td.type)})`).join('\n')}

FORMATTING REQUIREMENTS:
- For coding questions: Include properly formatted code with \\n for line breaks
- Use markdown formatting: **bold**, \`code\`, bullet points with •
- Structure answers with clear sections and proper spacing

QUESTION VARIETY EXAMPLES:
For technical-coding: array manipulation, string processing, tree traversal, dynamic programming, sorting algorithms
For system-design: database design, API architecture, caching strategies, microservices, load balancing
For behavioral: conflict resolution, leadership, project management, learning experiences, teamwork
For technical-concepts: OOP principles, design patterns, data structures, algorithms complexity, best practices

Generate exactly ${config.numberOfQuestions} questions following this distribution. Each question must be completely unique.

Return a JSON array with this exact structure:
[
  {
    "question": "unique question text",
    "type": "question-type",
    "category": "skill category", 
    "difficulty": "${config.proficiencyLevel}",
    "answer": "comprehensive formatted answer with proper \\n line breaks",
    "explanation": "what this question tests",
    "links": ["url1", "url2"]
  }
]`;

          console.log('📝 Prompt prepared, length:', prompt.length);
          console.log('🌐 Making API call to Groq...');

          const startTime = Date.now();

          const completion = await groq.chat.completions.create({
            messages: [
              {
                role: "system",
                content: "You are an expert technical interviewer. Generate UNIQUE, DIVERSE interview questions. Each question must be completely different from the others. Use proper formatting with \\n for line breaks in JSON strings. Return only a valid JSON array, no additional text."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            temperature: 0.9, // Higher temperature for more variety
            max_tokens: 8000,
            response_format: { type: "json_object" }
          });

          const endTime = Date.now();
          const apiCallDuration = endTime - startTime;

          console.log('✅ API call completed successfully!');
          console.log('⏱️ API call duration:', apiCallDuration + 'ms');
          console.log('📊 API response metadata:', {
            model: completion.model,
            usage: completion.usage,
            finishReason: completion.choices[0]?.finish_reason
          });

          const response = completion.choices[0]?.message?.content;
          if (!response) {
            console.error('❌ No content in API response');
            throw ApiErrorHandler.createApiError('No response from Groq API', 'SERVER_ERROR');
          }

          console.log('📄 Raw API response length:', response.length);
          console.log('📄 Raw API response preview:', response.substring(0, 200) + '...');

          // Parse the JSON response
          let questionsData;
          try {
            console.log('🔍 Parsing JSON response...');
            const parsedResponse = JSON.parse(response);
            
            // Handle different response formats
            if (Array.isArray(parsedResponse)) {
              questionsData = parsedResponse;
              console.log('✅ Response is direct array format');
            } else if (parsedResponse.questions && Array.isArray(parsedResponse.questions)) {
              questionsData = parsedResponse.questions;
              console.log('✅ Response has questions property');
            } else if (parsedResponse.data && Array.isArray(parsedResponse.data)) {
              questionsData = parsedResponse.data;
              console.log('✅ Response has data property');
            } else {
              console.error('❌ Unexpected response format:', Object.keys(parsedResponse));
              console.error('Full response:', parsedResponse);
              throw ApiErrorHandler.createApiError('Response is not in expected format', 'VALIDATION_ERROR');
            }
          } catch (parseError) {
            console.error('❌ JSON parsing error:', parseError);
            console.error('Raw response that failed to parse:', response);
            throw ApiErrorHandler.createApiError('Invalid JSON response from API', 'VALIDATION_ERROR');
          }

          if (!Array.isArray(questionsData) || questionsData.length === 0) {
            console.error('❌ No questions in parsed response:', questionsData);
            throw ApiErrorHandler.createApiError('No questions received from API', 'SERVER_ERROR');
          }

          console.log(`✅ Successfully parsed ${questionsData.length} questions from API`);

          // Transform and validate questions
          const questions: Question[] = [];
          const usedQuestions = new Set<string>();

          for (let i = 0; i < Math.min(questionsData.length, config.numberOfQuestions); i++) {
            const q = questionsData[i];
            
            console.log(`🔍 Processing question ${i + 1}:`, {
              hasQuestion: !!q.question,
              questionLength: q.question?.length || 0,
              hasAnswer: !!q.answer,
              hasType: !!q.type,
              type: q.type
            });
            
            // Normalize question text for duplicate detection
            const normalizedQuestion = q.question?.toLowerCase().trim();
            
            if (!normalizedQuestion || usedQuestions.has(normalizedQuestion)) {
              console.warn(`⚠️ Skipping duplicate or invalid question at index ${i}:`, q.question?.substring(0, 50) + '...');
              continue;
            }

            usedQuestions.add(normalizedQuestion);

            const question: Question = {
              id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
              question: q.question || `Question ${i + 1}: What is your experience with ${config.skills[i % config.skills.length]}?`,
              type: q.type || config.questionTypes[i % config.questionTypes.length],
              category: q.category || config.skills[i % config.skills.length],
              difficulty: config.proficiencyLevel,
              answer: q.answer || `Sample answer for question ${i + 1}`,
              explanation: q.explanation || `This question tests your knowledge and experience.`,
              links: Array.isArray(q.links) ? q.links : []
            };
            
            questions.push(question);
            console.log(`✅ Added question ${questions.length}: ${question.question.substring(0, 80)}...`);
          }

          // If we don't have enough unique questions, generate fallback questions
          while (questions.length < config.numberOfQuestions) {
            console.log(`⚠️ Need more questions (${questions.length}/${config.numberOfQuestions}), generating fallback...`);
            const fallbackQuestion = generateFallbackQuestion(questions.length, config, usedQuestions);
            questions.push(fallbackQuestion);
            console.log(`✅ Added fallback question ${questions.length}: ${fallbackQuestion.question.substring(0, 80)}...`);
          }

          console.log(`🎉 Final questions array: ${questions.length} unique questions generated`);
          console.log('📋 Question previews:', questions.map((q, i) => `${i + 1}. ${q.question.substring(0, 60)}...`));
          
          return questions;
        },
        'groq-question-generation',
        {
          maxRetries: 2,
          baseDelay: 2000,
          retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'SERVER_ERROR', 'RATE_LIMIT_ERROR']
        }
      );
    } catch (error) {
      console.error('❌ Error in generateQuestions:', error);
      
      // Check if it's an API key issue
      const errorInfo = ApiErrorHandler.categorizeError(error as Error);
      if (errorInfo.category === 'AUTH_ERROR') {
        console.error('🔑 This appears to be an API key issue');
        alert('API Key Error: Please check your Groq API key configuration in the .env file');
      }
      
      // Fallback to mock questions if API fails
      console.log('🔄 Falling back to mock questions due to API error');
      return generateMockQuestions(config);
    } finally {
      setLoading(false);
    }
  };

  const evaluateAnswers = async (
    questions: Question[],
    answers: UserAnswer[],
    config: InterviewConfig
  ): Promise<EvaluationResult> => {
    console.log('🚀 Starting answer evaluation process...');
    console.log('📊 Evaluation data:', {
      questionsCount: questions.length,
      answersCount: answers.length,
      config: config.role + ' at ' + config.company
    });
    
    setLoading(true);
    
    try {
      return await apiCall(
        async () => {
          // Check API key before making request
          if (!import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_GROQ_API_KEY === 'your-groq-api-key-here') {
            console.error('❌ Groq API key is not properly configured for evaluation!');
            throw ApiErrorHandler.createApiError(
              'Groq API key not configured for evaluation',
              'AUTH_ERROR'
            );
          }

          console.log('✅ API key is configured, proceeding with evaluation API call...');
          
          const evaluationPrompt = `Evaluate the following interview answers for a ${config.role} position at ${config.company}.
          
          Questions and Answers:
          ${questions.map((q, i) => {
            const userAnswer = answers.find(a => a.questionId === q.id);
            return `
            Question ${i + 1} (Type: ${q.type}): ${q.question}
            Expected Answer: ${q.answer}
            User Answer: ${userAnswer?.answer || 'No answer provided'}
            Time Spent: ${userAnswer?.timeSpent || 0} seconds
            `;
          }).join('\n')}
          
          Return ONLY a valid JSON object with this exact structure:
          {
            "score": 85,
            "assessedProficiency": "advanced",
            "categoryScores": {
              "React": 90,
              "JavaScript": 80
            },
            "typeScores": {
              "technical-coding": 85,
              "behavioral": 90
            },
            "feedback": "Overall feedback text",
            "recommendations": ["recommendation 1", "recommendation 2"]
          }
          
          Score should be 0-100. AssessedProficiency should be: beginner, intermediate, advanced, or expert.
          Include scores for both skill categories and question types.`;

          console.log('📝 Evaluation prompt prepared, making API call...');
          const startTime = Date.now();

          const completion = await groq.chat.completions.create({
            messages: [
              {
                role: "system",
                content: "You are an expert technical interviewer. Provide fair and constructive evaluation of interview answers, considering both technical accuracy and communication skills. You must respond with valid JSON only, no additional text or explanations."
              },
              {
                role: "user",
                content: evaluationPrompt
              }
            ],
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            temperature: 0.3,
            max_tokens: 2000,
            response_format: { type: "json_object" }
          });

          const endTime = Date.now();
          const apiCallDuration = endTime - startTime;

          console.log('✅ Evaluation API call completed successfully!');
          console.log('⏱️ Evaluation API call duration:', apiCallDuration + 'ms');

          const response = completion.choices[0]?.message?.content;
          if (!response) {
            console.error('❌ No content in evaluation API response');
            throw ApiErrorHandler.createApiError('No response from Groq API', 'SERVER_ERROR');
          }

          console.log('📄 Evaluation response length:', response.length);
          console.log('📄 Evaluation response preview:', response.substring(0, 200) + '...');

          // Parse the JSON response with better error handling
          let evaluationData;
          try {
            console.log('🔍 Parsing evaluation JSON response...');
            evaluationData = JSON.parse(response);
            console.log('✅ Evaluation JSON parsed successfully');
          } catch (parseError) {
            console.error('❌ Evaluation JSON parsing error:', parseError);
            console.error('Raw evaluation response:', response);
            throw ApiErrorHandler.createApiError('Invalid JSON response from API', 'VALIDATION_ERROR');
          }
          
          const result: EvaluationResult = {
            score: evaluationData.score,
            totalQuestions: questions.length,
            assessedProficiency: evaluationData.assessedProficiency,
            categoryScores: evaluationData.categoryScores,
            typeScores: evaluationData.typeScores || {},
            feedback: evaluationData.feedback,
            recommendations: evaluationData.recommendations
          };

          console.log('🎉 Evaluation completed successfully:', {
            score: result.score,
            proficiency: result.assessedProficiency,
            categoriesCount: Object.keys(result.categoryScores).length,
            typesCount: Object.keys(result.typeScores).length
          });

          return result;
        },
        'groq-answer-evaluation',
        {
          maxRetries: 2,
          baseDelay: 2000,
          retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'SERVER_ERROR', 'RATE_LIMIT_ERROR']
        }
      );
    } catch (error) {
      console.error('❌ Error in evaluateAnswers:', error);
      
      // Fallback evaluation
      console.log('🔄 Falling back to mock evaluation due to API error');
      return generateMockEvaluation(questions, answers, config);
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackQuestion = (index: number, config: InterviewConfig, usedQuestions: Set<string>): Question => {
    console.log(`🔄 Generating fallback question ${index + 1}`);
    
    const skillIndex = index % config.skills.length;
    const typeIndex = index % config.questionTypes.length;
    const skill = config.skills[skillIndex];
    const type = config.questionTypes[typeIndex];
    
    // Create unique variations to avoid duplicates
    const variations = [
      'implement', 'design', 'optimize', 'debug', 'explain', 'compare', 'analyze', 'create'
    ];
    const variation = variations[index % variations.length];
    
    const concepts = [
      'data structure', 'algorithm', 'pattern', 'system', 'component', 'feature', 'process', 'workflow'
    ];
    const concept = concepts[index % concepts.length];
    
    let questionText = '';
    let answer = '';
    let explanation = '';
    
    // Generate different questions based on type with proper formatting
    switch (type) {
      case 'technical-coding':
        const problems = [
          'find the maximum element in an array',
          'reverse a linked list',
          'implement binary search',
          'sort an array using merge sort',
          'find the first non-repeating character',
          'implement a stack using arrays',
          'check if a string is a palindrome',
          'find the intersection of two arrays'
        ];
        const problem = problems[index % problems.length];
        
        questionText = `Using ${skill}, ${variation} a solution to ${problem}. Provide time and space complexity analysis.`;
        answer = `Here's a solution:\n\n\`\`\`javascript\nfunction solve${index}(input) {\n  // Implementation for ${problem}\n  if (!input || input.length === 0) {\n    return null;\n  }\n  \n  let result = input[0];\n  \n  for (let i = 1; i < input.length; i++) {\n    // Process each element\n    if (input[i] > result) {\n      result = input[i];\n    }\n  }\n  \n  return result;\n}\n\`\`\`\n\n**Time Complexity:** O(n)\n**Space Complexity:** O(1)\n\nThis solution efficiently handles the problem by iterating through the input once.`;
        explanation = `This question tests your ability to write efficient algorithms and understand complexity analysis.`;
        break;
        
      case 'technical-concepts':
        const concepts = [
          'inheritance and polymorphism',
          'asynchronous programming',
          'memory management',
          'design patterns',
          'data binding',
          'state management',
          'error handling',
          'performance optimization'
        ];
        const conceptTopic = concepts[index % concepts.length];
        
        questionText = `${variation.charAt(0).toUpperCase() + variation.slice(1)} the concept of ${conceptTopic} in ${skill}. How does it apply to ${config.role} responsibilities?`;
        answer = `${conceptTopic.charAt(0).toUpperCase() + conceptTopic.slice(1)} in ${skill}:\n\n**Core Principles:**\n• **Definition:** ${conceptTopic} enables efficient development patterns\n• **Key Benefits:**\n  - Improved code organization\n  - Better maintainability\n  - Enhanced performance\n  - Easier testing and debugging\n\n**Application in ${config.role}:**\n• Used for building scalable applications\n• Helps in creating reusable components\n• Facilitates team collaboration\n• Ensures code quality standards\n\n**Best Practices:**\n• Follow established patterns\n• Write clean, readable code\n• Implement proper error handling\n• Use appropriate design patterns`;
        explanation = `This question evaluates your theoretical understanding of core concepts and ability to explain technical topics clearly.`;
        break;
        
      case 'system-design':
        const systems = [
          'chat application',
          'e-commerce platform',
          'social media feed',
          'video streaming service',
          'file storage system',
          'notification service',
          'search engine',
          'payment processing system'
        ];
        const system = systems[index % systems.length];
        
        questionText = `${variation.charAt(0).toUpperCase() + variation.slice(1)} a scalable ${system} that handles ${skill}. Consider performance, scalability, and reliability.`;
        answer = `System Design for ${system}:\n\n**Architecture Overview:**\n• **Frontend:** React/Vue.js application with responsive design\n• **API Gateway:** Routes requests and handles authentication\n• **Microservices:** Separate services for different functionalities\n• **Database:** Distributed database with read replicas\n• **Caching:** Redis for session management and data caching\n• **Message Queue:** For asynchronous processing\n\n**Scalability Considerations:**\n• **Horizontal Scaling:** Auto-scaling groups for services\n• **Load Balancing:** Distribute traffic across multiple instances\n• **Database Sharding:** Partition data across multiple databases\n• **CDN:** Content delivery network for static assets\n\n**Reliability Measures:**\n• **Health Checks:** Monitor service availability\n• **Circuit Breakers:** Prevent cascade failures\n• **Backup Strategy:** Regular automated backups\n• **Monitoring:** Comprehensive logging and alerting`;
        explanation = `This tests your ability to design large-scale systems and consider trade-offs between different architectural decisions.`;
        break;
        
      case 'behavioral':
        const situations = [
          'overcome a technical challenge',
          'work with a difficult team member',
          'meet a tight deadline',
          'learn a new technology quickly',
          'handle conflicting requirements',
          'lead a project initiative',
          'resolve a production issue',
          'mentor a junior developer'
        ];
        const situation = situations[index % situations.length];
        
        questionText = `Tell me about a time when you had to ${situation} while working with ${skill}. What was your approach?`;
        answer = `I'll use the STAR method to answer this:\n\n**Situation:**\nDescribe the specific context where I needed to ${situation}.\n\n**Task:**\nExplain what needed to be accomplished and my role:\n• Define the specific challenge or goal\n• Identify stakeholders and constraints\n• Understand the timeline and resources\n\n**Action:**\nDetail the specific steps I took:\n• Analyzed the problem thoroughly\n• Researched potential solutions\n• Collaborated with team members\n• Implemented the chosen approach\n• Monitored progress and adjusted as needed\n\n**Result:**\nShare the positive outcome and lessons learned:\n• Successfully achieved the objective\n• Improved team processes and communication\n• Gained valuable experience in ${skill}\n• Applied lessons to future similar situations`;
        explanation = `This evaluates your soft skills, problem-solving approach, and ability to work effectively in team environments.`;
        break;
        
      default:
        const approaches = [
          'debugging a performance issue',
          'optimizing code efficiency',
          'implementing security measures',
          'conducting code reviews',
          'testing and validation',
          'documentation and maintenance',
          'integration and deployment',
          'monitoring and alerting'
        ];
        const approach = approaches[index % approaches.length];
        
        questionText = `How would you approach ${approach} in a ${config.role} application that uses ${skill}?`;
        answer = `Approach to ${approach}:\n\n**1. Problem Identification:**\n• Reproduce the issue consistently\n• Gather relevant logs and error messages\n• Identify the scope and impact\n• Document findings clearly\n\n**2. Analysis Phase:**\n• Use debugging tools and profilers\n• Check recent code changes and deployments\n• Review system metrics and performance data\n• Consult with team members and documentation\n\n**3. Solution Implementation:**\n• Start with the most likely cause\n• Make incremental, testable changes\n• Follow established coding standards\n• Document the solution approach\n\n**4. Verification and Follow-up:**\n• Confirm the fix resolves the issue\n• Run comprehensive test suites\n• Monitor for any side effects\n• Update documentation and processes`;
        explanation = `This tests your problem-solving methodology and practical experience with debugging and optimization techniques.`;
    }
    
    // Ensure question is unique
    let finalQuestion = questionText;
    let counter = 1;
    while (usedQuestions.has(finalQuestion.toLowerCase().trim())) {
      finalQuestion = `${questionText} (Variation ${counter})`;
      counter++;
    }
    
    usedQuestions.add(finalQuestion.toLowerCase().trim());
    
    const fallbackQuestion = {
      id: `fallback-q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
      question: finalQuestion,
      type: type,
      category: skill,
      difficulty: config.proficiencyLevel,
      answer: answer,
      explanation: explanation,
      links: [
        `https://developer.mozilla.org/en-US/docs/Web/${skill.toLowerCase()}`,
        `https://github.com/topics/${skill.toLowerCase().replace(/\s+/g, '-')}`
      ]
    };
    
    console.log(`✅ Generated fallback question: ${fallbackQuestion.question.substring(0, 60)}...`);
    return fallbackQuestion;
  };

  // Fallback functions for when API fails
  const generateMockQuestions = (config: InterviewConfig): Question[] => {
    console.log('🔄 Generating mock questions as fallback');
    
    const mockQuestions = [];
    const usedQuestions = new Set<string>();
    
    for (let i = 0; i < config.numberOfQuestions; i++) {
      mockQuestions.push(generateFallbackQuestion(i, config, usedQuestions));
    }
    
    console.log(`✅ Generated ${mockQuestions.length} mock questions:`, mockQuestions.map(q => q.question.substring(0, 60) + '...'));
    return mockQuestions;
  };

  const generateMockEvaluation = (
    questions: Question[],
    answers: UserAnswer[],
    config: InterviewConfig
  ): EvaluationResult => {
    console.log('🔄 Generating realistic evaluation based on actual answers');
    
    const totalQuestions = questions.length;
    const answeredQuestions = answers.filter(a => a.answer && a.answer.trim().length > 0);
    
    // Calculate score based on actual answers
    let totalScore = 0;
    const categoryScores: Record<string, number> = {};
    const typeScores: Record<string, number> = {};
    
    // Initialize category and type scores
    config.skills.forEach(skill => categoryScores[skill] = 0);
    config.questionTypes.forEach(type => typeScores[type] = 0);
    
    const questionResults: QuestionResult[] = [];
    
    console.log('Evaluating questions:', questions.length);
    console.log('User answers:', answers.length);
    console.log('Question IDs:', questions.map(q => q.id));
    console.log('Answer IDs:', answers.map(a => a.questionId));
    
    questions.forEach((question, index) => {
      const userAnswer = answers.find(a => a.questionId === question.id);
      let questionScore = 0;
      let category: 'correct' | 'incorrect' | 'partially-correct' | 'unanswered' = 'unanswered';
      
      console.log(`Question ${index + 1} (${question.id}):`, userAnswer ? 'HAS ANSWER' : 'NO ANSWER');
      
      if (userAnswer && userAnswer.answer && userAnswer.answer.trim().length > 0) {
        const answerLength = userAnswer.answer.trim().length;
        const timeSpent = userAnswer.timeSpent || 0;
        
        // Basic scoring logic based on answer quality indicators
        if (answerLength < 10) {
          questionScore = 10; // Very short answers
          category = 'incorrect';
        } else if (answerLength < 50) {
          questionScore = 25; // Short answers
          category = 'incorrect';
        } else if (answerLength < 100) {
          questionScore = 45; // Medium answers
          category = 'partially-correct';
        } else if (answerLength < 200) {
          questionScore = 65; // Good length answers
          category = 'partially-correct';
        } else {
          questionScore = 80; // Comprehensive answers
          category = 'correct';
        }
        
        // Adjust for time spent (reasonable time indicates thoughtfulness)
        if (timeSpent > 30 && timeSpent < 300) {
          questionScore += 10;
        } else if (timeSpent >= 300) {
          questionScore += 5;
        }
        
        // Check for code-like patterns in technical questions
        if (question.type.includes('technical') || question.type.includes('coding')) {
          if (userAnswer.answer.includes('function') || userAnswer.answer.includes('class') || 
              userAnswer.answer.includes('const') || userAnswer.answer.includes('let') ||
              userAnswer.answer.includes('if') || userAnswer.answer.includes('for')) {
            questionScore += 15;
          }
        }
        
        // Cap at 100 and adjust category based on final score
        questionScore = Math.min(questionScore, 100);
        
        // Refine category based on final score
        if (questionScore >= 80) category = 'correct';
        else if (questionScore >= 50) category = 'partially-correct';
        else category = 'incorrect';
      } else {
        // Ensure unanswered category is set correctly
        category = 'unanswered';
        questionScore = 0;
      }
      
      questionResults.push({ question, userAnswer, score: questionScore, category });
      totalScore += questionScore;
      
      // Add to category and type scores
      if (categoryScores[question.category] !== undefined) {
        categoryScores[question.category] += questionScore;
      }
      if (typeScores[question.type] !== undefined) {
        typeScores[question.type] += questionScore;
      }
    });
    
    const averageScore = Math.round(totalScore / totalQuestions);
    
    // Average the category and type scores
    Object.keys(categoryScores).forEach(key => {
      const questionsInCategory = questions.filter(q => q.category === key).length;
      categoryScores[key] = questionsInCategory > 0 ? Math.round(categoryScores[key] / questionsInCategory) : 0;
    });
    
    Object.keys(typeScores).forEach(key => {
      const questionsOfType = questions.filter(q => q.type === key).length;
      typeScores[key] = questionsOfType > 0 ? Math.round(typeScores[key] / questionsOfType) : 0;
    });
    
    // Categorize results
    const correctAnswers = questionResults.filter(r => r.category === 'correct');
    const incorrectAnswers = questionResults.filter(r => r.category === 'incorrect');
    const partiallyCorrectAnswers = questionResults.filter(r => r.category === 'partially-correct');
    const unansweredQuestions = questionResults.filter(r => r.category === 'unanswered');
    
    const mockEvaluation = {
      score: averageScore,
      totalQuestions,
      assessedProficiency: averageScore >= 85 ? 'expert' : averageScore >= 70 ? 'advanced' : averageScore >= 55 ? 'intermediate' : 'beginner',
      categoryScores,
      typeScores,
      feedback: `Based on your responses, you scored ${averageScore}%. You answered ${answeredQuestions.length} out of ${totalQuestions} questions. ${averageScore >= 70 ? 'Your answers showed good understanding of the topics.' : averageScore >= 40 ? 'Your answers showed basic understanding but could be more comprehensive.' : 'Your answers were quite brief and could benefit from more detailed explanations.'}`,
      recommendations: [
        answeredQuestions.length < totalQuestions ? 'Try to answer all questions completely' : 'Good job answering all questions',
        averageScore < 50 ? 'Focus on providing more detailed and comprehensive answers' : 'Continue building on your technical knowledge',
        'Practice explaining technical concepts with examples',
        'Review the expected answers to understand what was missing',
        'Consider the time spent on each question for better pacing'
      ],
      questionBreakdown: {
        correct: correctAnswers,
        incorrect: incorrectAnswers,
        partiallyCorrect: partiallyCorrectAnswers,
        unanswered: unansweredQuestions
      }
    };
    
    console.log('✅ Generated realistic evaluation:', { 
      score: mockEvaluation.score, 
      proficiency: mockEvaluation.assessedProficiency,
      answeredQuestions: answeredQuestions.length,
      totalQuestions 
    });
    return mockEvaluation;
  };

  return { generateQuestions, evaluateAnswers, loading };
};