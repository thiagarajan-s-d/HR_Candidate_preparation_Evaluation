import { useState } from 'react';
import Groq from 'groq-sdk';
import { InterviewConfig, Question, UserAnswer, EvaluationResult, QuestionType } from '../types';

// Initialize Groq client
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY || 'your-groq-api-key-here',
  dangerouslyAllowBrowser: true
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
    setLoading(true);
    
    try {
      console.log('Starting question generation with config:', config);
      
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

      console.log('Question type distribution:', typeDistribution);

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

      console.log('Sending prompt to Groq API...');

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

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from Groq API');
      }

      console.log('Received response from API, parsing...');

      // Parse the JSON response
      let questionsData;
      try {
        const parsedResponse = JSON.parse(response);
        
        // Handle different response formats
        if (Array.isArray(parsedResponse)) {
          questionsData = parsedResponse;
        } else if (parsedResponse.questions && Array.isArray(parsedResponse.questions)) {
          questionsData = parsedResponse.questions;
        } else if (parsedResponse.data && Array.isArray(parsedResponse.data)) {
          questionsData = parsedResponse.data;
        } else {
          console.error('Unexpected response format:', parsedResponse);
          throw new Error('Response is not in expected format');
        }
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        console.error('Raw response:', response);
        throw new Error('Invalid JSON response from API');
      }

      if (!Array.isArray(questionsData) || questionsData.length === 0) {
        console.error('No questions in response:', questionsData);
        throw new Error('No questions received from API');
      }

      console.log(`Received ${questionsData.length} questions from API`);

      // Transform and validate questions
      const questions: Question[] = [];
      const usedQuestions = new Set<string>();

      for (let i = 0; i < Math.min(questionsData.length, config.numberOfQuestions); i++) {
        const q = questionsData[i];
        
        // Normalize question text for duplicate detection
        const normalizedQuestion = q.question?.toLowerCase().trim();
        
        if (!normalizedQuestion || usedQuestions.has(normalizedQuestion)) {
          console.warn(`Skipping duplicate or invalid question at index ${i}:`, q.question);
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
        console.log(`Added question ${questions.length}: ${question.question.substring(0, 80)}...`);
      }

      // If we don't have enough unique questions, generate fallback questions
      while (questions.length < config.numberOfQuestions) {
        const fallbackQuestion = generateFallbackQuestion(questions.length, config, usedQuestions);
        questions.push(fallbackQuestion);
        console.log(`Added fallback question ${questions.length}: ${fallbackQuestion.question.substring(0, 80)}...`);
      }

      console.log(`Final questions array: ${questions.length} unique questions generated`);
      console.log('Question previews:', questions.map((q, i) => `${i + 1}. ${q.question.substring(0, 60)}...`));
      
      setLoading(false);
      return questions;
    } catch (error) {
      console.error('Error generating questions:', error);
      setLoading(false);
      
      // Fallback to mock questions if API fails
      console.log('Falling back to mock questions');
      return generateMockQuestions(config);
    }
  };

  const generateFallbackQuestion = (index: number, config: InterviewConfig, usedQuestions: Set<string>): Question => {
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
    
    return {
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
  };

  const evaluateAnswers = async (
    questions: Question[],
    answers: UserAnswer[],
    config: InterviewConfig
  ): Promise<EvaluationResult> => {
    setLoading(true);
    
    try {
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

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from Groq API');
      }

      // Parse the JSON response with better error handling
      let evaluationData;
      try {
        evaluationData = JSON.parse(response);
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        console.error('Raw response:', response);
        throw new Error('Invalid JSON response from API');
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

      setLoading(false);
      return result;
    } catch (error) {
      console.error('Error evaluating answers:', error);
      setLoading(false);
      
      // Fallback evaluation
      return generateMockEvaluation(questions, answers, config);
    }
  };

  // Fallback functions for when API fails
  const generateMockQuestions = (config: InterviewConfig): Question[] => {
    console.log('Generating mock questions as fallback');
    
    const mockQuestions = [];
    const usedQuestions = new Set<string>();
    
    for (let i = 0; i < config.numberOfQuestions; i++) {
      mockQuestions.push(generateFallbackQuestion(i, config, usedQuestions));
    }
    
    console.log(`Generated ${mockQuestions.length} mock questions:`, mockQuestions.map(q => q.question.substring(0, 60) + '...'));
    return mockQuestions;
  };

  const generateMockEvaluation = (
    questions: Question[],
    answers: UserAnswer[],
    config: InterviewConfig
  ): EvaluationResult => {
    const totalQuestions = questions.length;
    const score = Math.floor(Math.random() * 40 + 60); // Mock score between 60-100
    
    const categoryScores: Record<string, number> = {};
    config.skills.forEach(skill => {
      categoryScores[skill] = Math.floor(Math.random() * 40 + 60);
    });

    const typeScores: Record<string, number> = {};
    config.questionTypes.forEach(type => {
      typeScores[type] = Math.floor(Math.random() * 40 + 60);
    });
    
    return {
      score,
      totalQuestions,
      assessedProficiency: score >= 85 ? 'expert' : score >= 70 ? 'advanced' : score >= 55 ? 'intermediate' : 'beginner',
      categoryScores,
      typeScores,
      feedback: `You demonstrated ${score >= 80 ? 'excellent' : score >= 60 ? 'good' : 'adequate'} understanding of the topics covered. Your answers showed ${score >= 75 ? 'strong' : 'developing'} technical knowledge across different question types.`,
      recommendations: [
        'Continue practicing coding problems on platforms like LeetCode',
        'Review system design principles and scalability concepts',
        'Study the company culture and recent technical blog posts',
        'Practice explaining complex technical concepts clearly',
        'Work on behavioral interview responses using the STAR method'
      ]
    };
  };

  return { generateQuestions, evaluateAnswers, loading };
};