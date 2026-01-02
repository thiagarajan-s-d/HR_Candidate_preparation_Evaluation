const { body, param, validationResult } = require('express-validator');
const { 
  sanitizeEmail, 
  sanitizeText, 
  sanitizeName, 
  sanitizeCompany, 
  sanitizeRole,
  validateProficiencyLevel,
  validateQuestionTypes
} = require('../utils/sanitization');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * Validation rules for user registration
 */
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
    .customSanitizer(sanitizeEmail),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),
  
  body('name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Name must be less than 100 characters')
    .customSanitizer(sanitizeName),
  
  handleValidationErrors
];

/**
 * Validation rules for user login
 */
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
    .customSanitizer(sanitizeEmail),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

/**
 * Validation rules for invitation creation
 */
const validateInvitationCreation = [
  body('invitation.requestorEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid requestor email is required')
    .customSanitizer(sanitizeEmail),
  
  body('invitation.candidateEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid candidate email is required')
    .customSanitizer(sanitizeEmail),
  
  body('invitation.requestorName')
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage('Requestor name is required and must be less than 100 characters')
    .customSanitizer(sanitizeName),
  
  body('invitation.candidateName')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Candidate name must be less than 100 characters')
    .customSanitizer(sanitizeName),
  
  body('invitation.role')
    .notEmpty()
    .isLength({ max: 150 })
    .withMessage('Role is required and must be less than 150 characters')
    .customSanitizer(sanitizeRole),
  
  body('invitation.company')
    .notEmpty()
    .isLength({ max: 200 })
    .withMessage('Company is required and must be less than 200 characters')
    .customSanitizer(sanitizeCompany),
  
  body('invitation.skills')
    .isArray({ min: 1, max: 20 })
    .withMessage('Skills must be an array with 1-20 items')
    .custom((skills) => {
      if (!Array.isArray(skills)) return false;
      return skills.every(skill => 
        typeof skill === 'string' && 
        skill.trim().length > 0 && 
        skill.length <= 50
      );
    })
    .withMessage('Each skill must be a non-empty string with max 50 characters'),
  
  body('invitation.proficiencyLevel')
    .custom((level) => {
      const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
      return validLevels.includes(level);
    })
    .withMessage('Proficiency level must be one of: beginner, intermediate, advanced, expert'),
  
  body('invitation.numberOfQuestions')
    .isInt({ min: 5, max: 30 })
    .withMessage('Number of questions must be between 5 and 30'),
  
  body('invitation.questionTypes')
    .isArray({ min: 1, max: 8 })
    .withMessage('Question types must be an array with 1-8 items')
    .custom((types) => {
      const validTypes = [
        'technical-coding', 'technical-concepts', 'system-design',
        'behavioral', 'problem-solving', 'case-study', 'architecture', 'debugging'
      ];
      if (!Array.isArray(types)) return false;
      return types.every(type => validTypes.includes(type));
    })
    .withMessage('Invalid question type provided'),
  
  body('invitation.customMessage')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Custom message must be less than 500 characters')
    .customSanitizer((value) => sanitizeText(value, { maxLength: 500, allowNewlines: true })),
  
  handleValidationErrors
];

/**
 * Validation rules for invitation ID parameter
 */
const validateInvitationId = [
  param('id')
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .withMessage('Invalid invitation ID format')
    .customSanitizer((value) => sanitizeText(value, { maxLength: 50, allowNewlines: false })),
  
  handleValidationErrors
];

/**
 * Validation rules for database queries (admin only)
 */
const validateDatabaseQuery = [
  body('query')
    .notEmpty()
    .withMessage('Query is required')
    .custom((query) => {
      // Prevent dangerous SQL operations
      const dangerousPatterns = [
        /DROP\s+TABLE/i,
        /DELETE\s+FROM\s+(?!user_sessions)/i, // Allow deleting from user_sessions only
        /TRUNCATE/i,
        /ALTER\s+TABLE/i,
        /CREATE\s+TABLE/i,
        /UPDATE\s+(?!user_sessions)/i // Allow updating user_sessions only
      ];
      
      return !dangerousPatterns.some(pattern => pattern.test(query));
    })
    .withMessage('Query contains potentially dangerous operations'),
  
  body('params')
    .optional()
    .isArray()
    .withMessage('Parameters must be an array'),
  
  handleValidationErrors
];

/**
 * Rate limiting middleware
 */
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [id, timestamps] of requests.entries()) {
      const validTimestamps = timestamps.filter(time => time > windowStart);
      if (validTimestamps.length === 0) {
        requests.delete(id);
      } else {
        requests.set(id, validTimestamps);
      }
    }
    
    // Check current client
    const clientRequests = requests.get(clientId) || [];
    const recentRequests = clientRequests.filter(time => time > windowStart);
    
    if (recentRequests.length >= max) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil(windowMs / 1000)} seconds.`
      });
    }
    
    // Add current request
    recentRequests.push(now);
    requests.set(clientId, recentRequests);
    
    next();
  };
};

/**
 * Content Security Policy middleware
 */
const setSecurityHeaders = (req, res, next) => {
  // Prevent XSS attacks
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self'; " +
    "font-src 'self'; " +
    "object-src 'none'; " +
    "media-src 'self'; " +
    "frame-src 'none';"
  );
  
  next();
};

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateInvitationCreation,
  validateInvitationId,
  validateDatabaseQuery,
  createRateLimiter,
  setSecurityHeaders,
  handleValidationErrors
};