# HR Candidate Evaluation System - Deployment Guide

## 🚨 CRITICAL SECURITY WARNING

**IMMEDIATE ACTION REQUIRED:** If you cloned this repository, the previous .env file contained exposed credentials that need to be secured:

1. **Groq API Key**: An API key was previously exposed and should be **revoked immediately**
2. **Database Password**: Change any default database passwords
3. **Generate New Credentials**: Create fresh API keys and passwords before deployment

### Secure Your Environment
```powershell
# 1. Copy the template
copy .env.example .env

# 2. Get a new Groq API key from https://console.groq.com/keys
# 3. Update .env with your new credentials
# 4. Never commit .env files to version control
```

## Quick Start

### Local Development
```powershell
# Install dependencies
npm install
cd server && npm install && cd ..

# Start backend
cd server && npm run dev

# Start frontend (in new terminal)
npm run dev
```

**Access:** http://localhost:5173

### Network Access (Same Network)
```powershell
# 1. Update .env with your IP address
# Replace 192.168.32.1 with your actual IP
VITE_API_URL=http://192.168.32.1:3001/api
FRONTEND_URL=http://192.168.32.1:5173

# 2. Configure Windows Firewall (as Administrator)
New-NetFirewallRule -DisplayName "HR Eval Frontend" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
New-NetFirewallRule -DisplayName "HR Eval Backend" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow

# 3. Use the automated script
.\setup-network-access.ps1
```

**Access from other devices:** http://YOUR_IP:5173

### Internet Deployment

#### Option 1: ngrok (Quick Testing)
```powershell
# Install ngrok from ngrok.com
# Start tunnels
ngrok http 5173  # Frontend
ngrok http 3001  # Backend (in new terminal)
```

#### Option 2: Cloud Deployment (Production)
**Frontend (Vercel - Free):**
1. Go to vercel.com
2. Connect GitHub repository
3. Deploy automatically
4. Get: `https://your-app.vercel.app`

**Backend (Railway - $5/month):**
1. Go to railway.app
2. Connect GitHub repository
3. Add PostgreSQL service
4. Deploy backend
5. Get: `https://your-backend.railway.app`

#### Option 3: Router Port Forwarding
```powershell
# Use the automated script
.\quick-internet-setup.ps1
# Choose option 2 for detailed instructions
```

### Persistent Operation (Keep Running)
```powershell
# Install PM2 process manager
npm install -g pm2

# Start services with PM2
pm2 start ecosystem.config.js

# Save configuration
pm2 save

# Setup auto-start on boot
pm2 startup

# Management commands
pm2 status    # View status
pm2 logs      # View logs
pm2 restart all  # Restart services
pm2 stop all     # Stop services
```

## Production Setup

### Environment Configuration
```bash
# Production .env file
NODE_ENV=production

# Strong JWT secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-super-strong-jwt-secret-here

# Groq API key (get from console.groq.com)
VITE_GROQ_API_KEY=gsk_your_actual_api_key_here

# Production URLs
VITE_API_URL=https://yourdomain.com/api
FRONTEND_URL=https://yourdomain.com

# Managed database
POSTGRES_HOST=your-managed-db-host
POSTGRES_USER=your-db-user
POSTGRES_PASSWORD=your-strong-db-password
POSTGRES_SSL=true
```

### Security Checklist
- [ ] **Update Groq API key** - Replace placeholder in .env
- [ ] **Generate strong JWT secret** - Use `openssl rand -base64 32`
- [ ] **Enable HTTPS** - Required for internet deployment
- [ ] **Configure proper CORS** - Only allow your domain
- [ ] **Set up monitoring** - Health checks and logging
- [ ] **Database security** - Use managed database with SSL
- [ ] **Regular backups** - Automated backup strategy

### Database Setup
```powershell
# Use the provided database scripts
cd db
.\setup-windows.ps1

# Or manually:
# 1. Create database: hr_candidate_eval
# 2. Run scripts in order: 01_create_database.sql through 05_sample_data.sql
```

## Troubleshooting

### Network Access Issues
1. **Check Windows Firewall** - Allow ports 3001 and 5173
2. **Verify services running** - Check with `pm2 status` or Task Manager
3. **Test locally first** - Ensure http://localhost:5173 works
4. **Check antivirus** - May block network connections

### Common Issues
- **Database connection failed** - Verify PostgreSQL is running
- **CORS errors** - Check VITE_API_URL matches backend URL
- **API key errors** - Update Groq API key in .env file
- **Port conflicts** - Use different ports if 3001/5173 are taken

### Quick Fixes
```powershell
# Restart services
pm2 restart all

# Check logs
pm2 logs

# Test connectivity
Invoke-WebRequest -Uri "http://localhost:3001/api/health"
```

## Automation Scripts

### Available Scripts
- `setup-network-access.ps1` - Configure network access
- `quick-internet-setup.ps1` - Internet deployment options
- `start-production.ps1` - Production startup with PM2
- `start-development.ps1` - Development startup with PM2
- `cleanup-codebase.ps1` - Clean unnecessary files

### Usage
```powershell
# Make scripts executable and run
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\script-name.ps1
```

## Support Resources

### Documentation
- `README.md` - Main project documentation
- `SECURITY_FIXES_SUMMARY.md` - Security implementation details
- `INTERNET_DEPLOYMENT_GUIDE.md` - Detailed internet deployment
- `db/README.md` - Database setup instructions

### Cloud Services
- **Vercel**: https://vercel.com/docs
- **Railway**: https://docs.railway.app
- **Heroku**: https://devcenter.heroku.com
- **ngrok**: https://ngrok.com/docs

### Cost Estimates
- **Free tier**: Vercel + Railway free tiers (~$0/month)
- **Production**: Vercel Pro + Railway Pro (~$20-50/month)
- **Enterprise**: Custom pricing for high availability

Choose the deployment method that best fits your needs and technical expertise!