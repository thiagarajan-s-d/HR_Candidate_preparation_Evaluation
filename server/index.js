const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config({ path: '../.env' });

// Import validation and sanitization middleware
const {
  validateUserRegistration,
  validateUserLogin,
  validateInvitationCreation,
  validateInvitationId,
  setSecurityHeaders,
  createRateLimiter
} = require('./middleware/validation');

const {
  generateToken,
  authenticateToken,
  optionalAuth,
  requireAdmin,
  sensitiveOperationLimiter
} = require('./middleware/auth');

const app = express();
const port = process.env.PORT || 3001;
const host = process.env.HOST || '0.0.0.0';

// PostgreSQL connection with connection pooling
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'hr_eval_app',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'hr_candidate_eval',
  password: process.env.POSTGRES_PASSWORD || 'password',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
});

// Test database connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection error:', err.message);
    console.error('Check your PostgreSQL server and credentials');
  } else {
    console.log('Database connected successfully');
    release();
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));

app.use(setSecurityHeaders);

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// CORS configuration - Support multiple origins for network access
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      console.log('Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'Connected'
  });
});

// Database test endpoint
app.get('/api/db/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    res.json({ 
      status: 'Database connection successful',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Database connection failed',
      error: error.message 
    });
  }
});

// User registration endpoint
app.post('/api/auth/register', validateUserRegistration, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { email, password, name } = req.body;
    
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM dbo.users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Hash password with high salt rounds
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Insert user
    const userResult = await client.query(
      'INSERT INTO dbo.users (email, password_hash, raw_user_meta_data) VALUES ($1, $2, $3) RETURNING id, email, created_at',
      [email, passwordHash, JSON.stringify({ name: name || '' })]
    );
    
    await client.query('COMMIT');
    
    const user = userResult.rows[0];
    res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: name || '',
        created_at: user.created_at
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  } finally {
    client.release();
  }
});

// User login endpoint
app.post('/api/auth/login', validateUserLogin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password } = req.body;
    
    // Get user with prepared statement to prevent SQL injection
    const userResult = await client.query(
      'SELECT u.id, u.email, u.password_hash, u.raw_user_meta_data, p.name FROM dbo.users u LEFT JOIN dbo.profiles p ON u.id = p.id WHERE u.email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = userResult.rows[0];
    
    // Verify password with timing attack protection
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Parse user metadata safely
    let userData = {};
    try {
      userData = user.raw_user_meta_data ? JSON.parse(user.raw_user_meta_data) : {};
    } catch (parseError) {
      console.warn('Failed to parse user metadata:', parseError);
      userData = {};
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email
    });
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name || userData.name || '',
      },
      token: token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  } finally {
    client.release();
  }
});

// Get all users endpoint (for admin) - Protected with admin authentication
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT u.id, u.email, u.created_at, p.name FROM dbo.users u LEFT JOIN dbo.profiles p ON u.id = p.id ORDER BY u.created_at DESC LIMIT 100'
    );
    
    res.json({
      users: result.rows.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name || '',
        created_at: user.created_at
      }))
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  } finally {
    client.release();
  }
});

// Create invitation endpoint - Protected with authentication
app.post('/api/invitations', authenticateToken, validateInvitationCreation, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const invitation = req.body.invitation;
    
    // Check if invitation ID already exists
    const existingInvitation = await client.query(
      'SELECT id FROM dbo.invitations WHERE id = $1',
      [invitation.id]
    );
    
    if (existingInvitation.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invitation ID already exists' });
    }
    
    const result = await client.query(
      `INSERT INTO dbo.invitations (
        id, requestor_id, requestor_name, requestor_email, candidate_email, candidate_name,
        role, company, skills, proficiency_level, number_of_questions, question_types,
        expires_at, custom_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        invitation.id, invitation.requestorId, invitation.requestorName, invitation.requestorEmail,
        invitation.candidateEmail, invitation.candidateName, invitation.role, invitation.company,
        JSON.stringify(invitation.skills), invitation.proficiencyLevel, invitation.numberOfQuestions,
        JSON.stringify(invitation.questionTypes), invitation.expiresAt, invitation.customMessage
      ]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Invitation created successfully',
      invitation: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create invitation error:', error);
    res.status(500).json({ error: 'Failed to create invitation' });
  } finally {
    client.release();
  }
});

// Get invitation endpoint
app.get('/api/invitations/:id', validateInvitationId, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    const result = await client.query(
      'SELECT * FROM dbo.invitations WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    
    const invitation = result.rows[0];
    
    // Check if invitation has expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Invitation has expired' });
    }
    
    res.json({
      invitation: invitation
    });
  } catch (error) {
    console.error('Get invitation error:', error);
    res.status(500).json({ error: 'Failed to fetch invitation' });
  } finally {
    client.release();
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(port, host, () => {
  console.log(`Server running on ${host}:${port}`);
  console.log(`Health check: http://${host}:${port}/api/health`);
  console.log(`Database test: http://${host}:${port}/api/db/test`);
});