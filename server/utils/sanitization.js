const validator = require('validator');

/**
 * Input sanitization utilities to prevent XSS and other injection attacks
 */

/**
 * Sanitize email input
 * @param {string} email - Email to sanitize
 * @returns {string|null} - Sanitized email or null if invalid
 */
function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }
  
  // Trim whitespace and convert to lowercase
  const trimmed = email.trim().toLowerCase();
  
  // Validate email format
  if (!validator.isEmail(trimmed)) {
    return null;
  }
  
  // Additional sanitization - escape HTML entities
  return validator.escape(trimmed);
}

/**
 * Sanitize text input to prevent XSS
 * @param {string} text - Text to sanitize
 * @param {object} options - Sanitization options
 * @returns {string} - Sanitized text
 */
function sanitizeText(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  const {
    maxLength = 1000,
    allowNewlines = true,
    stripTags = true
  } = options;
  
  let sanitized = text.trim();
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Remove or escape HTML tags
  if (stripTags) {
    sanitized = validator.escape(sanitized);
  }
  
  // Handle newlines
  if (!allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]/g, ' ');
  }
  
  return sanitized;
}

/**
 * Sanitize name input
 * @param {string} name - Name to sanitize
 * @returns {string} - Sanitized name
 */
function sanitizeName(name) {
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  // Trim and limit length
  let sanitized = name.trim();
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }
  
  // Allow only letters, spaces, hyphens, and apostrophes
  sanitized = sanitized.replace(/[^a-zA-Z\s\-']/g, '');
  
  // Escape HTML entities
  return validator.escape(sanitized);
}

/**
 * Sanitize company name
 * @param {string} company - Company name to sanitize
 * @returns {string} - Sanitized company name
 */
function sanitizeCompany(company) {
  if (!company || typeof company !== 'string') {
    return '';
  }
  
  // Trim and limit length
  let sanitized = company.trim();
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }
  
  // Allow letters, numbers, spaces, and common business characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-&.,()]/g, '');
  
  // Escape HTML entities
  return validator.escape(sanitized);
}

/**
 * Sanitize role/job title
 * @param {string} role - Role to sanitize
 * @returns {string} - Sanitized role
 */
function sanitizeRole(role) {
  if (!role || typeof role !== 'string') {
    return '';
  }
  
  // Trim and limit length
  let sanitized = role.trim();
  if (sanitized.length > 150) {
    sanitized = sanitized.substring(0, 150);
  }
  
  // Allow letters, numbers, spaces, and common job title characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-/()&.]/g, '');
  
  // Escape HTML entities
  return validator.escape(sanitized);
}

/**
 * Sanitize skill name
 * @param {string} skill - Skill to sanitize
 * @returns {string} - Sanitized skill
 */
function sanitizeSkill(skill) {
  if (!skill || typeof skill !== 'string') {
    return '';
  }
  
  // Trim and limit length
  let sanitized = skill.trim();
  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 50);
  }
  
  // Allow letters, numbers, spaces, and common tech characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-+#.]/g, '');
  
  // Escape HTML entities
  return validator.escape(sanitized);
}

/**
 * Sanitize array of strings
 * @param {Array} array - Array to sanitize
 * @param {Function} sanitizer - Sanitization function to apply to each element
 * @param {number} maxItems - Maximum number of items allowed
 * @returns {Array} - Sanitized array
 */
function sanitizeArray(array, sanitizer, maxItems = 50) {
  if (!Array.isArray(array)) {
    return [];
  }
  
  // Limit array size
  const limitedArray = array.slice(0, maxItems);
  
  // Sanitize each item and filter out empty ones
  return limitedArray
    .map(item => sanitizer(item))
    .filter(item => item && item.length > 0);
}

/**
 * Sanitize invitation data
 * @param {object} invitation - Invitation object to sanitize
 * @returns {object} - Sanitized invitation object
 */
function sanitizeInvitation(invitation) {
  if (!invitation || typeof invitation !== 'object') {
    throw new Error('Invalid invitation data');
  }
  
  const sanitized = {
    id: sanitizeText(invitation.id, { maxLength: 50, allowNewlines: false, stripTags: true }),
    requestorId: sanitizeText(invitation.requestorId, { maxLength: 50, allowNewlines: false, stripTags: true }),
    requestorName: sanitizeName(invitation.requestorName),
    requestorEmail: sanitizeEmail(invitation.requestorEmail),
    candidateEmail: sanitizeEmail(invitation.candidateEmail),
    candidateName: sanitizeName(invitation.candidateName || ''),
    role: sanitizeRole(invitation.role),
    company: sanitizeCompany(invitation.company),
    skills: sanitizeArray(invitation.skills || [], sanitizeSkill, 20),
    proficiencyLevel: sanitizeText(invitation.proficiencyLevel, { maxLength: 20, allowNewlines: false, stripTags: true }),
    numberOfQuestions: parseInt(invitation.numberOfQuestions) || 5,
    questionTypes: sanitizeArray(invitation.questionTypes || [], (type) => 
      sanitizeText(type, { maxLength: 30, allowNewlines: false, stripTags: true }), 10),
    expiresAt: invitation.expiresAt, // Date validation should be done separately
    status: sanitizeText(invitation.status || 'pending', { maxLength: 20, allowNewlines: false, stripTags: true }),
    customMessage: sanitizeText(invitation.customMessage || '', { maxLength: 500, allowNewlines: true, stripTags: true })
  };
  
  // Validate required fields
  if (!sanitized.requestorEmail || !sanitized.candidateEmail || !sanitized.role || !sanitized.company) {
    throw new Error('Missing required fields after sanitization');
  }
  
  // Validate skills and question types arrays
  if (sanitized.skills.length === 0) {
    throw new Error('At least one skill is required');
  }
  
  if (sanitized.questionTypes.length === 0) {
    throw new Error('At least one question type is required');
  }
  
  // Validate number of questions range
  if (sanitized.numberOfQuestions < 5 || sanitized.numberOfQuestions > 30) {
    throw new Error('Number of questions must be between 5 and 30');
  }
  
  return sanitized;
}

/**
 * Sanitize user registration data
 * @param {object} userData - User data to sanitize
 * @returns {object} - Sanitized user data
 */
function sanitizeUserData(userData) {
  if (!userData || typeof userData !== 'object') {
    throw new Error('Invalid user data');
  }
  
  const sanitized = {
    email: sanitizeEmail(userData.email),
    name: sanitizeName(userData.name || ''),
    password: userData.password // Password should not be sanitized, only validated
  };
  
  // Validate required fields
  if (!sanitized.email) {
    throw new Error('Valid email is required');
  }
  
  if (!userData.password || typeof userData.password !== 'string') {
    throw new Error('Password is required');
  }
  
  if (userData.password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }
  
  return sanitized;
}

/**
 * Validate and sanitize proficiency level
 * @param {string} level - Proficiency level to validate
 * @returns {string} - Valid proficiency level
 */
function validateProficiencyLevel(level) {
  const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
  const sanitized = sanitizeText(level, { maxLength: 20, allowNewlines: false, stripTags: true }).toLowerCase();
  
  if (!validLevels.includes(sanitized)) {
    throw new Error('Invalid proficiency level');
  }
  
  return sanitized;
}

/**
 * Validate and sanitize question types
 * @param {Array} types - Question types to validate
 * @returns {Array} - Valid question types
 */
function validateQuestionTypes(types) {
  const validTypes = [
    'technical-coding',
    'technical-concepts', 
    'system-design',
    'behavioral',
    'problem-solving',
    'case-study',
    'architecture',
    'debugging'
  ];
  
  if (!Array.isArray(types)) {
    throw new Error('Question types must be an array');
  }
  
  const sanitizedTypes = types
    .map(type => sanitizeText(type, { maxLength: 30, allowNewlines: false, stripTags: true }).toLowerCase())
    .filter(type => validTypes.includes(type));
  
  if (sanitizedTypes.length === 0) {
    throw new Error('At least one valid question type is required');
  }
  
  return sanitizedTypes;
}

module.exports = {
  sanitizeEmail,
  sanitizeText,
  sanitizeName,
  sanitizeCompany,
  sanitizeRole,
  sanitizeSkill,
  sanitizeArray,
  sanitizeInvitation,
  sanitizeUserData,
  validateProficiencyLevel,
  validateQuestionTypes
};