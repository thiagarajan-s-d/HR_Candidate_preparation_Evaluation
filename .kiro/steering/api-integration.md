---
inclusion: fileMatch
fileMatchPattern: "**/hooks/useLLM.ts"
---

# Groq LLM API Integration Guidelines

## Overview

This project uses Groq's LLM API for AI-powered question generation and answer evaluation. The integration is handled in `src/hooks/useLLM.ts`.

## API Configuration

### Model Selection
- **Model**: `meta-llama/llama-4-scout-17b-16e-instruct`
- **Provider**: Groq
- **SDK**: groq-sdk v0.7.0

### API Key Management
```typescript
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true  // Required for client-side usage
});
```

**Important**: Always check if API key is configured before making requests:
```typescript
if (!import.meta.env.VITE_GROQ_API_KEY || 
    import.meta.env.VITE_GROQ_API_KEY === 'your-groq-api-key-here') {
  throw new Error('Groq API key not configured');
}
```

## Question Generation

### Prompt Engineering Best Practices

1. **Be Specific About Requirements**
   - Specify exact number of questions needed
   - Define proficiency level clearly
   - List all required skills and question types
   - Emphasize uniqueness and diversity

2. **Provide Clear Formatting Instructions**
   - Request JSON response format
   - Specify exact structure needed
   - Include examples of desired output
   - Request proper line breaks with `\n` in JSON strings

3. **Use System and User Messages**
   ```typescript
   const completion = await groq.chat.completions.create({
     messages: [
       {
         role: "system",
         content: "You are an expert technical interviewer..."
       },
       {
         role: "user",
         content: prompt
       }
     ],
     model: "meta-llama/llama-4-scout-17b-16e-instruct",
     temperature: 0.9,  // Higher for more variety
     max_tokens: 8000,
     response_format: { type: "json_object" }
   });
   ```

### Temperature Settings

- **Question Generation**: 0.9 (high diversity)
- **Answer Evaluation**: 0.3 (more consistent scoring)

### Response Parsing

Always handle multiple response formats:
```typescript
let questionsData;
if (Array.isArray(parsedResponse)) {
  questionsData = parsedResponse;
} else if (parsedResponse.questions) {
  questionsData = parsedResponse.questions;
} else if (parsedResponse.data) {
  questionsData = parsedResponse.data;
}
```

### Duplicate Detection

Implement case-insensitive duplicate detection:
```typescript
const usedQuestions = new Set<string>();
const normalizedQuestion = q.question?.toLowerCase().trim();

if (!normalizedQuestion || usedQuestions.has(normalizedQuestion)) {
  continue;  // Skip duplicate
}

usedQuestions.add(normalizedQuestion);
```

## Answer Evaluation

### Evaluation Prompt Structure

Include:
1. Question text and type
2. Expected answer
3. User's answer
4. Time spent on question
5. Clear scoring criteria
6. Required response format

### Response Format

Request structured JSON with:
```typescript
{
  score: number,              // 0-100
  assessedProficiency: string, // beginner/intermediate/advanced/expert
  categoryScores: Record<string, number>,
  typeScores: Record<string, number>,
  feedback: string,
  recommendations: string[]
}
```

## Error Handling

### API Failures

Always implement fallback mechanisms:
```typescript
try {
  const completion = await groq.chat.completions.create({...});
  // Process response
} catch (error) {
  console.error('API error:', error);
  // Fall back to template-based generation
  return generateMockQuestions(config);
}
```

### Common Error Scenarios

1. **API Key Invalid**: Check configuration and display user-friendly message
2. **Rate Limiting**: Implement exponential backoff (future enhancement)
3. **Timeout**: Set reasonable timeout values
4. **Invalid Response**: Validate response structure before parsing
5. **Network Errors**: Catch and log, then use fallback

## Fallback Mechanisms

### Fallback Question Generation

When API fails, generate questions using templates:
```typescript
const generateFallbackQuestion = (index, config, usedQuestions) => {
  // Create unique variations
  const variations = ['implement', 'design', 'optimize', 'debug', ...];
  const variation = variations[index % variations.length];
  
  // Generate question based on type
  switch (type) {
    case 'technical-coding':
      // Generate coding question
      break;
    case 'system-design':
      // Generate design question
      break;
    // ... other types
  }
};
```

### Fallback Evaluation

Use heuristic scoring when API fails:
```typescript
const generateMockEvaluation = (questions, answers, config) => {
  // Score based on:
  // - Answer length
  // - Time spent
  // - Presence of code patterns
  // - Keyword matching
  
  let questionScore = 0;
  const answerLength = userAnswer.answer.trim().length;
  
  if (answerLength < 10) questionScore = 10;
  else if (answerLength < 50) questionScore = 25;
  else if (answerLength < 100) questionScore = 45;
  else if (answerLength < 200) questionScore = 65;
  else questionScore = 80;
  
  // Adjust for code patterns in technical questions
  if (question.type.includes('technical')) {
    if (answer.includes('function') || answer.includes('class')) {
      questionScore += 15;
    }
  }
  
  return Math.min(questionScore, 100);
};
```

## Logging and Debugging

### Comprehensive Logging

Log all API interactions:
```typescript
console.log('🚀 Starting question generation...');
console.log('📋 Config:', config);
console.log('✅ API key configured');
console.log('🌐 Making API call...');
console.log('⏱️ API call duration:', duration + 'ms');
console.log('✅ API call completed');
console.log('📄 Response length:', response.length);
```

### Error Logging

Log detailed error information:
```typescript
console.error('❌ Error in generateQuestions:', error);
console.error('Error name:', error.name);
console.error('Error message:', error.message);
console.error('Error stack:', error.stack);
```

## Performance Optimization

### Token Limits

- Question Generation: 8000 max tokens
- Answer Evaluation: 2000 max tokens

### Response Time

- Log API call duration for monitoring
- Consider caching for repeated requests (future enhancement)
- Implement timeout handling

## Testing API Integration

### Mock API Responses

For testing without API calls:
```typescript
const mockApiResponse = {
  questions: [
    {
      question: "Test question",
      type: "technical-coding",
      category: "JavaScript",
      difficulty: "intermediate",
      answer: "Test answer",
      explanation: "Test explanation",
      links: []
    }
  ]
};
```

### Test API Key Validation

```typescript
test('should throw error when API key not configured', async () => {
  // Temporarily unset API key
  const originalKey = import.meta.env.VITE_GROQ_API_KEY;
  import.meta.env.VITE_GROQ_API_KEY = '';
  
  await expect(generateQuestions(config)).rejects.toThrow('API key not configured');
  
  // Restore API key
  import.meta.env.VITE_GROQ_API_KEY = originalKey;
});
```

## Best Practices

1. **Always validate API key before requests**
2. **Implement comprehensive error handling**
3. **Provide fallback mechanisms**
4. **Log all API interactions for debugging**
5. **Parse responses defensively**
6. **Validate response structure**
7. **Handle rate limiting gracefully**
8. **Use appropriate temperature settings**
9. **Request structured JSON responses**
10. **Implement duplicate detection**
