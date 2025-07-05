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
      const questionTypesDescription = config.questionTypes
        .map(type => `${type}: ${getQuestionTypeDescription(type)}`)
        .join(', ');

      const prompt = `Generate exactly ${config.numberOfQuestions} UNIQUE and DIFFERENT interview questions for a ${config.role} position at ${config.company}. 
      Focus on these skills: ${config.skills.join(', ')}. 
      Proficiency level: ${config.proficiencyLevel}.
      
      Question types to include: ${questionTypesDescription}
      
      IMPORTANT: 
      - Each question must be completely different and unique. Do not repeat or rephrase the same question.
      - For coding questions, provide properly formatted code with correct indentation and line breaks
      - For technical answers, use proper formatting with bullet points, code blocks, and clear structure
      - Use \\n for line breaks and proper spacing in answers
      
      Distribute questions evenly across the selected question types: ${config.questionTypes.join(', ')}.
      
      For each question, provide:
      1. A unique question text (no duplicates)
      2. The question type (one of: ${config.questionTypes.join(', ')})
      3. A comprehensive, well-formatted sample answer with proper indentation for code
      4. An explanation of what the question tests
      5. Relevant learning resources (as URLs)
      
      For coding questions, format answers like this example:
      "Here's a solution:\\n\\n\`\`\`javascript\\nfunction findMax(arr) {\\n  if (arr.length === 0) return -1;\\n  \\n  let maxValue = arr[0];\\n  let maxIndex = 0;\\n  \\n  for (let i = 1; i < arr.length; i++) {\\n    if (arr[i] > maxValue) {\\n      maxValue = arr[i];\\n      maxIndex = i;\\n    }\\n  }\\n  \\n  return maxIndex;\\n}\\n\`\`\`\\n\\nTime Complexity: O(n)\\nSpace Complexity: O(1)"
      
      Return ONLY a valid JSON array with exactly ${config.numberOfQuestions} question objects:
      [
        {
          "question": "unique question text 1",
          "type": "question-type",
          "category": "skill category",
          "difficulty": "${config.proficiencyLevel}",
          "answer": "comprehensive, well-formatted sample answer with proper line breaks and indentation",
          "explanation": "detailed explanation text",
          "links": ["https://example.com/resource1", "https://example.com/resource2"]
        }
      ]`;

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert technical interviewer. Generate high-quality, UNIQUE interview questions with comprehensive, properly formatted answers. For coding questions, always include properly indented code with line breaks. Use \\n for line breaks in JSON strings. Each question must be completely different from the others. You must respond with a valid JSON array only, no additional text or explanations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.8,
        max_tokens: 6000, // Increased for longer, well-formatted answers
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from Groq API');
      }

      console.log('Raw API response:', response);

      // Parse the JSON response with better error handling
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

      // Validate we have the right number of questions
      if (!Array.isArray(questionsData) || questionsData.length === 0) {
        console.error('No questions in response:', questionsData);
        throw new Error('No questions received from API');
      }

      console.log(`Generated ${questionsData.length} questions:`, questionsData);
      
      // Transform to our Question format with unique IDs
      const questions: Question[] = questionsData.slice(0, config.numberOfQuestions).map((q: any, index: number) => {
        const question: Question = {
          id: `q-${Date.now()}-${index}`,
          question: q.question || `Question ${index + 1}: What is your experience with ${config.skills[index % config.skills.length]}?`,
          type: q.type || config.questionTypes[index % config.questionTypes.length],
          category: q.category || config.skills[index % config.skills.length],
          difficulty: config.proficiencyLevel,
          answer: q.answer || `Sample answer for question ${index + 1}`,
          explanation: q.explanation || `This question tests your knowledge and experience.`,
          links: Array.isArray(q.links) ? q.links : []
        };
        
        console.log(`Question ${index + 1}:`, question.question);
        return question;
      });

      // Ensure we have exactly the requested number of questions
      if (questions.length < config.numberOfQuestions) {
        console.warn(`Only generated ${questions.length} questions, requested ${config.numberOfQuestions}`);
        // Fill remaining with fallback questions
        while (questions.length < config.numberOfQuestions) {
          const index = questions.length;
          questions.push(generateFallbackQuestion(index, config));
        }
      }

      console.log(`Final questions array (${questions.length} questions):`, questions.map(q => q.question));
      
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

  const generateFallbackQuestion = (index: number, config: InterviewConfig): Question => {
    const skillIndex = index % config.skills.length;
    const typeIndex = index % config.questionTypes.length;
    const skill = config.skills[skillIndex];
    const type = config.questionTypes[typeIndex];
    
    let questionText = '';
    let answer = '';
    let explanation = '';
    
    // Generate different questions based on type with proper formatting
    switch (type) {
      case 'technical-coding':
        questionText = `Write a function in ${skill} to find the ${index % 2 === 0 ? 'maximum' : 'minimum'} element in an array and return its index.`;
        answer = `Here's a solution:\n\n\`\`\`javascript\nfunction find${index % 2 === 0 ? 'Max' : 'Min'}Index(arr) {\n  if (arr.length === 0) return -1;\n  \n  let ${index % 2 === 0 ? 'max' : 'min'}Value = arr[0];\n  let ${index % 2 === 0 ? 'max' : 'min'}Index = 0;\n  \n  for (let i = 1; i < arr.length; i++) {\n    if (arr[i] ${index % 2 === 0 ? '>' : '<'} ${index % 2 === 0 ? 'max' : 'min'}Value) {\n      ${index % 2 === 0 ? 'max' : 'min'}Value = arr[i];\n      ${index % 2 === 0 ? 'max' : 'min'}Index = i;\n    }\n  }\n  \n  return ${index % 2 === 0 ? 'max' : 'min'}Index;\n}\n\`\`\`\n\n**Time Complexity:** O(n)\n**Space Complexity:** O(1)\n\nThis solution iterates through the array once, keeping track of the ${index % 2 === 0 ? 'maximum' : 'minimum'} value and its index.`;
        explanation = `This question tests your ability to write efficient algorithms and understand time/space complexity analysis.`;
        break;
        
      case 'technical-concepts':
        questionText = `Explain the concept of ${skill} and its key principles. How does it apply to ${config.role} responsibilities?`;
        answer = `${skill} is a fundamental concept in ${config.role} work. Here are the key principles:\n\n• **Core Concept:** ${skill} enables efficient development and maintainable code architecture\n• **Key Benefits:**\n  - Improved code organization\n  - Better maintainability\n  - Enhanced performance\n  - Easier testing and debugging\n\n• **Application in ${config.role}:**\n  - Used for building scalable applications\n  - Helps in creating reusable components\n  - Facilitates team collaboration\n  - Ensures code quality standards\n\n• **Best Practices:**\n  - Follow established patterns\n  - Write clean, readable code\n  - Implement proper error handling\n  - Use appropriate design patterns`;
        explanation = `This question evaluates your theoretical understanding of core concepts and ability to explain technical topics clearly.`;
        break;
        
      case 'system-design':
        questionText = `Design a ${index % 2 === 0 ? 'scalable web application' : 'distributed system'} that handles ${skill}. Consider performance, scalability, and reliability.`;
        answer = `Here's a high-level system design:\n\n**Architecture Overview:**\n• **Frontend:** React/Vue.js application\n• **API Gateway:** Routes requests and handles authentication\n• **Microservices:** Separate services for different functionalities\n• **Database:** Distributed database with read replicas\n• **Caching:** Redis for session management and data caching\n• **Message Queue:** For asynchronous processing\n\n**Scalability Considerations:**\n• **Horizontal Scaling:** Auto-scaling groups for services\n• **Load Balancing:** Distribute traffic across multiple instances\n• **Database Sharding:** Partition data across multiple databases\n• **CDN:** Content delivery network for static assets\n\n**Reliability Measures:**\n• **Health Checks:** Monitor service availability\n• **Circuit Breakers:** Prevent cascade failures\n• **Backup Strategy:** Regular automated backups\n• **Monitoring:** Comprehensive logging and alerting`;
        explanation = `This tests your ability to design large-scale systems and consider trade-offs between different architectural decisions.`;
        break;
        
      case 'behavioral':
        questionText = `Tell me about a time when you had to ${index % 2 === 0 ? 'overcome a technical challenge' : 'work with a difficult team member'} while working with ${skill}.`;
        answer = `I'll use the STAR method to answer this:\n\n**Situation:**\nDescribe the specific context and background of the situation.\n\n**Task:**\nExplain what needed to be accomplished and your role in it.\n\n**Action:**\nDetail the specific steps you took to address the challenge:\n• Analyzed the problem thoroughly\n• Researched potential solutions\n• Collaborated with team members\n• Implemented the chosen approach\n• Monitored the results\n\n**Result:**\nShare the positive outcome and what you learned:\n• Successfully resolved the issue\n• Improved team processes\n• Gained valuable experience\n• Applied lessons to future projects`;
        explanation = `This evaluates your soft skills, problem-solving approach, and ability to work effectively in team environments.`;
        break;
        
      default:
        questionText = `How would you approach ${index % 2 === 0 ? 'debugging' : 'optimizing'} a ${config.role} application that uses ${skill}?`;
        answer = `Here's my systematic approach:\n\n**1. Problem Identification:**\n• Reproduce the issue consistently\n• Gather relevant logs and error messages\n• Identify the scope and impact\n\n**2. Analysis:**\n• Use debugging tools and profilers\n• Check recent code changes\n• Review system metrics and performance data\n\n**3. Solution Implementation:**\n• Start with the most likely cause\n• Make incremental changes\n• Test each change thoroughly\n• Document the solution\n\n**4. Verification:**\n• Confirm the fix resolves the issue\n• Run comprehensive tests\n• Monitor for any side effects\n• Update documentation and processes`;
        explanation = `This tests your problem-solving methodology and practical experience with debugging and optimization techniques.`;
    }
    
    return {
      id: `fallback-q-${Date.now()}-${index}`,
      question: questionText,
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
    
    for (let i = 0; i < config.numberOfQuestions; i++) {
      mockQuestions.push(generateFallbackQuestion(i, config));
    }
    
    console.log(`Generated ${mockQuestions.length} mock questions:`, mockQuestions.map(q => q.question));
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