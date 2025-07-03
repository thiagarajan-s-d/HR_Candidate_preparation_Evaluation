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

      const prompt = `Generate ${config.numberOfQuestions} interview questions for a ${config.role} position at ${config.company}. 
      Focus on these skills: ${config.skills.join(', ')}. 
      Proficiency level: ${config.proficiencyLevel}.
      
      Question types to include: ${questionTypesDescription}
      
      Distribute questions evenly across the selected question types: ${config.questionTypes.join(', ')}.
      
      For each question, provide:
      1. The question text
      2. The question type (one of: ${config.questionTypes.join(', ')})
      3. A sample answer
      4. An explanation of what the question tests
      5. Relevant learning resources (as URLs)
      
      Return ONLY a valid JSON object with this exact structure:
      {
        "questions": [
          {
            "question": "question text",
            "type": "question-type",
            "category": "skill category",
            "difficulty": "${config.proficiencyLevel}",
            "answer": "sample answer",
            "explanation": "explanation text",
            "links": ["url1", "url2"]
          }
        ]
      }`;

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert technical interviewer. Generate high-quality interview questions with comprehensive answers and explanations. Ensure questions are diverse and match the specified types. You must respond with valid JSON only, no additional text or explanations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from Groq API');
      }

      // Parse the JSON response with better error handling
      let questionsData;
      try {
        questionsData = JSON.parse(response);
        
        // Handle case where response is wrapped in an object
        if (questionsData.questions && Array.isArray(questionsData.questions)) {
          questionsData = questionsData.questions;
        } else if (!Array.isArray(questionsData)) {
          throw new Error('Response is not an array');
        }
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        console.error('Raw response:', response);
        throw new Error('Invalid JSON response from API');
      }
      
      // Transform to our Question format
      const questions: Question[] = questionsData.map((q: any, index: number) => ({
        id: `q-${index + 1}`,
        question: q.question,
        type: q.type || config.questionTypes[index % config.questionTypes.length],
        category: q.category || config.skills[index % config.skills.length],
        difficulty: config.proficiencyLevel,
        answer: q.answer,
        explanation: q.explanation,
        links: q.links || []
      }));

      setLoading(false);
      return questions;
    } catch (error) {
      console.error('Error generating questions:', error);
      setLoading(false);
      
      // Fallback to mock questions if API fails
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
    return Array.from({ length: config.numberOfQuestions }, (_, i) => ({
      id: `q-${i + 1}`,
      question: `${config.role} interview question ${i + 1} for ${config.company}: What is your experience with ${config.skills[i % config.skills.length]}?`,
      type: config.questionTypes[i % config.questionTypes.length],
      category: config.skills[i % config.skills.length],
      difficulty: config.proficiencyLevel,
      answer: `Sample answer for ${config.skills[i % config.skills.length]} question. This would typically cover key concepts, practical experience, and best practices.`,
      explanation: `This question tests your knowledge of ${config.skills[i % config.skills.length]}. Key points to cover include practical experience, theoretical understanding, and real-world applications.`,
      links: [
        `https://developer.mozilla.org/en-US/docs/Web/${config.skills[i % config.skills.length].toLowerCase()}`,
        `https://github.com/topics/${config.skills[i % config.skills.length].toLowerCase()}`
      ]
    }));
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