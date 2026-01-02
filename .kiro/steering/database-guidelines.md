---
inclusion: fileMatch
fileMatchPattern: "**/lib/postgres.ts"
---

# Database Integration Guidelines

## Overview

This project uses PostgreSQL for data persistence with a custom API client in `src/lib/postgres.ts` and backend API in `server/index.js`.

## Database Schema

### Tables

#### users
```sql
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  email_verified boolean DEFAULT false,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb
);
```

#### profiles
```sql
CREATE TABLE profiles (
  id uuid REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### user_sessions
```sql
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

#### invitations
```sql
CREATE TABLE invitations (
  id text PRIMARY KEY,
  requestor_id uuid REFERENCES users(id) ON DELETE CASCADE,
  requestor_name text NOT NULL,
  requestor_email text NOT NULL,
  candidate_email text NOT NULL,
  candidate_name text,
  role text NOT NULL,
  company text NOT NULL,
  skills jsonb NOT NULL,
  proficiency_level text NOT NULL,
  number_of_questions integer NOT NULL,
  question_types jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending',
  custom_message text
);
```

## API Client (Frontend)

### Base Configuration

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
```

### API Call Helper

```typescript
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || errorData.message || response.statusText);
  }
  
  return response.json();
};
```

### Authentication Methods

#### Sign Up
```typescript
async signUp(email: string, password: string, name?: string) {
  try {
    const result = await apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    return { user: result.user, error: null };
  } catch (error: any) {
    return { user: null, error: { message: error.message } };
  }
}
```

#### Sign In
```typescript
async signIn(email: string, password: string) {
  try {
    const result = await apiCall('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return { data: result, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
}
```

#### Get User
```typescript
async getUser(token: string) {
  try {
    const result = await apiCall('/auth/user', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { data: { user: result.user }, error: null };
  } catch (error: any) {
    return { data: { user: null }, error: { message: error.message } };
  }
}
```

### Direct Database Queries

```typescript
export async function query(text: string, params?: any[]) {
  try {
    const result = await apiCall('/db/query', {
      method: 'POST',
      body: JSON.stringify({ query: text, params }),
    });
    return { rows: result.rows };
  } catch (error) {
    throw error;
  }
}
```

## Backend API (server/index.js)

### Database Connection

```javascript
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'hr_candidate_eval',
  password: process.env.POSTGRES_PASSWORD || 'password',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
});
```

### Connection Testing

```javascript
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Database connected successfully');
    release();
  }
});
```

### Authentication Endpoints

#### POST /api/auth/signup
```javascript
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;
  
  // Validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  
  // Check existing user
  const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length > 0) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  // Hash password and insert
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO users (email, password_hash, raw_user_meta_data) VALUES ($1, $2, $3) RETURNING id, email, created_at, updated_at',
    [email, hashedPassword, JSON.stringify({ name: name || '' })]
  );
  
  res.json({ user: result.rows[0] });
});
```

#### POST /api/auth/signin
```javascript
app.post('/api/auth/signin', async (req, res) => {
  const { email, password } = req.body;
  
  // Get user
  const result = await pool.query(
    'SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1',
    [email]
  );
  
  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Verify password
  const user = result.rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Create session
  const token = generateToken();
  await pool.query(
    'INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, token, new Date(Date.now() + 24 * 60 * 60 * 1000)]
  );
  
  res.json({
    session: {
      user: { id: user.id, email: user.email },
      access_token: token
    }
  });
});
```

### Invitation Endpoints

#### POST /api/invitations
```javascript
app.post('/api/invitations', async (req, res) => {
  const { invitation } = req.body;
  
  const result = await pool.query(`
    INSERT INTO invitations (
      id, requestor_id, requestor_name, requestor_email, candidate_email, 
      candidate_name, role, company, skills, proficiency_level, 
      number_of_questions, question_types, expires_at, status, custom_message
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `, [
    invitation.id, invitation.requestorId, invitation.requestorName, 
    invitation.requestorEmail, invitation.candidateEmail, invitation.candidateName,
    invitation.role, invitation.company, JSON.stringify(invitation.skills),
    invitation.proficiencyLevel, invitation.numberOfQuestions,
    JSON.stringify(invitation.questionTypes), invitation.expiresAt,
    invitation.status, invitation.customMessage
  ]);
  
  res.json({ invitation: result.rows[0] });
});
```

#### GET /api/invitations/:id
```javascript
app.get('/api/invitations/:id', async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query('SELECT * FROM invitations WHERE id = $1', [id]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Invitation not found' });
  }
  
  const invitation = result.rows[0];
  
  // Parse JSON fields
  invitation.skills = JSON.parse(invitation.skills);
  invitation.question_types = JSON.parse(invitation.question_types);
  
  res.json({ invitation });
});
```

## Error Handling

### Database Connection Errors

```javascript
try {
  const result = await pool.query(query, params);
  return result.rows;
} catch (error) {
  console.error('Database error:', error);
  throw new Error('Database operation failed');
}
```

### Validation Errors

```javascript
if (!email || !password) {
  return res.status(400).json({ error: 'Email and password are required' });
}

if (password.length < 6) {
  return res.status(400).json({ error: 'Password must be at least 6 characters' });
}
```

### Authentication Errors

```javascript
if (result.rows.length === 0) {
  return res.status(401).json({ error: 'Invalid credentials' });
}

const isValid = await bcrypt.compare(password, user.password_hash);
if (!isValid) {
  return res.status(401).json({ error: 'Invalid credentials' });
}
```

## Security Best Practices

### Password Hashing

Always use bcrypt with appropriate salt rounds:
```javascript
const hashedPassword = await bcrypt.hash(password, 10);
```

### SQL Injection Prevention

Always use parameterized queries:
```javascript
// GOOD
pool.query('SELECT * FROM users WHERE email = $1', [email]);

// BAD - Never do this!
pool.query(`SELECT * FROM users WHERE email = '${email}'`);
```

### Session Token Generation

Generate secure random tokens:
```javascript
function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
```

### Session Expiration

Set reasonable expiration times:
```javascript
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
```

## Database Triggers

### Auto-update timestamps

```sql
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Auto-create profiles

```sql
CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## Testing Database Operations

### Test Connection

```javascript
app.get('/api/db/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({ status: 'OK', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', error: error.message });
  }
});
```

### Test Queries

```javascript
test('should create user successfully', async () => {
  const result = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
    ['test@example.com', 'hashed_password']
  );
  
  expect(result.rows[0].email).toBe('test@example.com');
});
```

## Common Issues

### Issue: Connection Refused
- Check PostgreSQL is running
- Verify host and port in environment variables
- Check firewall settings

### Issue: Authentication Failed
- Verify database credentials
- Check user permissions
- Ensure database exists

### Issue: Table Does Not Exist
- Run postgres_setup.sql script
- Verify schema is created
- Check database name

### Issue: UUID Extension Not Found
- Install uuid-ossp extension
- Run: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
