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
      
      IMPORTANT: Each question must be completely different and unique. Do not repeat or rephrase the same question.
      Distribute questions evenly across the selected question types: ${config.questionTypes.join(', ')}.
      
      For each question, provide:
      1. A unique question text (no duplicates)
      2. The question type (one of: ${config.questionTypes.join(', ')})
      3. A comprehensive sample answer
      4. An explanation of what the question tests
      5. Relevant learning resources (as URLs)
      
      Return ONLY a valid JSON array with exactly ${config.numberOfQuestions} question objects:
      [
        {
          "question": "unique question text 1",
          "type": "question-type",
          "category": "skill category",
          "difficulty": "${config.proficiencyLevel}",
          "answer": "comprehensive sample answer",
          "explanation": "detailed explanation text",
          "links": ["https://example.com/resource1", "https://example.com/resource2"]
        },
        {
          "question": "unique question text 2",
          "type": "question-type",
          "category": "skill category", 
          "difficulty": "${config.proficiencyLevel}",
          "answer": "comprehensive sample answer",
          "explanation": "detailed explanation text",
          "links": ["https://example.com/resource3", "https://example.com/resource4"]
        }
      ]`;

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert technical interviewer. Generate high-quality, UNIQUE interview questions with comprehensive answers and explanations. Each question must be completely different from the others. Ensure questions are diverse and match the specified types. You must respond with a valid JSON array only, no additional text or explanations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.8, // Increased temperature for more variety
        max_tokens: 4000,
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
          id: `q-${Date.now()}-${index}`, // More unique ID generation
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
          questions.push({
            id: `q-fallback-${Date.now()}-${index}`,
            question: `${config.role} question ${index + 1}: Describe your experience with ${config.skills[index % config.skills.length]} and how you would apply it at ${config.company}.`,
            type: config.questionTypes[index % config.questionTypes.length],
            category: config.skills[index % config.skills.length],
            difficulty: config.proficiencyLevel,
            answer: `A comprehensive answer would cover practical experience, theoretical knowledge, and specific examples of how ${config.skills[index % config.skills.length]} can be applied in a ${config.role} role.`,
            explanation: `This question evaluates your practical experience and understanding of ${config.skills[index % config.skills.length]}.`,
            links: []
          });
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
      const skillIndex = i % config.skills.length;
      const typeIndex = i % config.questionTypes.length;
      const skill = config.skills[skillIndex];
      const type = config.questionTypes[typeIndex];
      
      let questionText = '';
      let answer = '';
      let explanation = '';
      
      // Generate different questions based on type
      switch (type) {
        case 'technical-coding':
          questionText = `Write a function to solve the following problem using ${skill}: Given an array of integers, find the ${i % 2 === 0 ? 'maximum' : 'minimum'} element and return its index.`;
          answer = `Here's a solution that iterates through the array once, keeping track of the ${i % 2 === 0 ? 'maximum' : 'minimum'} value and its index. Time complexity: O(n), Space complexity: O(1).`;
          explanation = `This question tests your ability to write efficient algorithms and understand time/space complexity.`;
          break;
          
        case 'technical-concepts':
          questionText = `Explain the concept of ${skill} and how it applies to ${config.role} responsibilities. What are the key principles?`;
          answer = `${skill} is fundamental to ${config.role} work because it enables efficient development and maintainable code architecture.`;
          explanation = `This question evaluates your theoretical understanding of core concepts.`;
          break;
          
        case 'system-design':
          questionText = `Design a ${i % 2 === 0 ? 'scalable web application' : 'distributed system'} that handles ${skill}. Consider performance, scalability, and reliability.`;
          answer = `The system would use microservices architecture with load balancing, caching layers, and database sharding for scalability.`;
          explanation = `This tests your ability to design large-scale systems and consider trade-offs.`;
          break;
          
        case 'behavioral':
          questionText = `Tell me about a time when you had to ${i % 2 === 0 ? 'overcome a technical challenge' : 'work with a difficult team member'} while working with ${skill}.`;
          answer = `I would use the STAR method to describe the Situation, Task, Action, and Result of a specific example.`;
          explanation = `This evaluates your soft skills and ability to work in team environments.`;
          break;
          
        default:
          questionText = `How would you approach ${i % 2 === 0 ? 'debugging' : 'optimizing'} a ${config.role} application that uses ${skill}?`;
          answer = `I would start by identifying the root cause through systematic analysis and then implement targeted solutions.`;
          explanation = `This tests your problem-solving methodology and practical experience.`;
      }
      
      mockQuestions.push({
        id: `mock-q-${Date.now()}-${i}`,
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
      });
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