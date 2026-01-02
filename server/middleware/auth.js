const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

// JWT secret - MUST be provided via environment variable for security
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET environment variable is required for security!');
  console.error('💡 Generate one with: openssl rand -base64 32');
  process.exit(1);
}

// PostgreSQL connection (reuse from main server)
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'hr_eval_app',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'hr_candidate_eval',
  password: process.env.POSTGRES_PASSWORD || 'password',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

/**
 * Generate JWT token for authenticated user
 * @param {object} user - User object with id and email
 * @returns {string} - JWT token
 */
function generateToken(user) {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email 
    },
    JWT_SECRET,
    { 
      expiresIn: '24h',
      issuer: 'hr-eval-system',
      audience: 'hr-eval-users'
    }
  );
}

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {object|null} - Decoded token payload or null if invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'hr-eval-system',
      audience: 'hr-eval-users'
    });
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
}

/**
 * Authentication middleware
 * Checks for valid JWT token in Authorization header
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Please provide a valid authentication token'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ 
      error: 'Invalid or expired token',
      message: 'Please log in again'
    });
  }

  // Verify user still exists in database
  try {
    const userResult = await pool.query(
      'SELECT id, email FROM dbo.users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(403).json({ 
        error: 'User not found',
        message: 'User account no longer exists'
      });
    }

    // Add user info to request object
    req.user = {
      id: decoded.userId,
      email: decoded.email
    };

    next();
  } catch (error) {
    console.error('Database error during authentication:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      message: 'Unable to verify user credentials'
    });
  }
};

/**
 * Optional authentication middleware
 * Adds user info to request if token is provided and valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    req.user = null;
    return next();
  }

  try {
    const userResult = await pool.query(
      'SELECT id, email FROM dbo.users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length > 0) {
      req.user = {
        id: decoded.userId,
        email: decoded.email
      };
    } else {
      req.user = null;
    }
  } catch (error) {
    console.error('Database error during optional authentication:', error);
    req.user = null;
  }

  next();
};

/**
 * Admin role middleware
 * Requires authentication and checks if user has admin privileges
 */
const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }

  try {
    // Check if user has admin role (you can implement role-based access control)
    const adminResult = await pool.query(
      'SELECT role FROM dbo.user_roles WHERE user_id = $1 AND role = $2',
      [req.user.id, 'admin']
    );

    if (adminResult.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Admin access required',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  } catch (error) {
    console.error('Database error during admin check:', error);
    return res.status(500).json({ 
      error: 'Authorization failed',
      message: 'Unable to verify admin privileges'
    });
  }
};

/**
 * Rate limiting for sensitive operations
 */
const sensitiveOperationLimiter = (req, res, next) => {
  // This is a simple in-memory rate limiter
  // In production, use Redis or a proper rate limiting service
  const clientId = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 3; // 3 requests per minute

  if (!global.sensitiveOpRequests) {
    global.sensitiveOpRequests = new Map();
  }

  const clientRequests = global.sensitiveOpRequests.get(clientId) || [];
  const recentRequests = clientRequests.filter(time => now - time < windowMs);

  if (recentRequests.length >= maxRequests) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many sensitive operations. Please wait before trying again.'
    });
  }

  recentRequests.push(now);
  global.sensitiveOpRequests.set(clientId, recentRequests);

  next();
};

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  optionalAuth,
  requireAdmin,
  sensitiveOperationLimiter
};