# 🎯 HR Candidate Evaluation System

A comprehensive full-stack web application designed for technical interview preparation and candidate assessment. This system empowers both job seekers and HR professionals with AI-powered interview tools.

##  Screenshots

### Application Overview
![Application Dashboard](screenshots/dashboard.png)
*Main dashboard showing the three available modes: Learn, Mock, and Evaluate*

### Authentication
![Login Screen](screenshots/login.png)
*Secure login interface with form validation*

![Registration](screenshots/registration.png)
*User registration form with password strength indicators*

### Learn Mode
![Learn Mode - Question Interface](screenshots/learn-mode-1.png)
*Learn Mode interface with immediate answer visibility and detailed explanations*

![Learn Mode - Answer Review](screenshots/learn-mode-2.png)
*Sample question in Learn Mode with answer feedback and explanations*

### Mock Mode
![Mock Mode Interface](screenshots/mock-mode.png)
*Mock Mode with timed questions and realistic interview simulation*

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v8.11 or higher)
- Groq API key (get from [console.groq.com](https://console.groq.com/keys))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hr-candidate-evaluation-system
   ```

2. **Install dependencies**
   ```bash
   # Frontend dependencies
   npm install
   
   # Backend dependencies
   cd server && npm install && cd ..
   ```

3. **Database setup**
   ```bash
   # Windows
   cd db && .\setup-windows.ps1
   
   # Linux/Mac
   cd db && ./setup.sh
   ```

4. **Environment configuration**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env with your actual values:
   # - Add your Groq API key
   # - Configure database credentials
   # - Set JWT secret
   ```

5. **Start the application**
   ```bash
   # Terminal 1 - Backend
   cd server && npm run dev
   
   # Terminal 2 - Frontend
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3001/api

## 📖 User Guide

### For Job Seekers

1. **Getting Started**
   - Create an account or log in
   - Choose your preparation mode (Learn or Mock)
   - Select question types relevant to your target role

2. **Learn Mode Workflow**
   - Configure your practice session
   - Answer questions at your own pace
   - Review explanations immediately
   - Track your progress over time

3. **Mock Mode Workflow**
   - Set up a timed assessment
   - Complete all questions within time limits
   - Review comprehensive results and feedback
   - Identify areas for improvement

### For HR Professionals

1. **Setting Up Assessments**
   - Log in to your HR account
   - Navigate to Evaluate Mode
   - Create custom assessment configurations
   - Generate secure invitation links

2. **Managing Candidates**
   - Send assessment invitations via email
   - Monitor candidate progress in real-time
   - Review completed assessments
   - Generate evaluation reports

3. **Analyzing Results**
   - Access detailed performance analytics
   - Compare candidates objectively
   - Export results for further analysis
   - Make data-driven hiring decisions

## 🔧 Configuration Options

### Assessment Customization
- **Question Count**: 1-50 questions per assessment
- **Time Limits**: 30 seconds to 30 minutes per question
- **Difficulty Levels**: Beginner, Intermediate, Advanced
- **Question Mix**: Customize the ratio of different question types

### User Experience
- **Voice Input**: Enable/disable speech-to-text
- **Dark Mode**: Toggle between light and dark themes
- **Accessibility**: Screen reader support and keyboard navigation
- **Mobile Optimization**: Responsive design for all devices

## 🔒 Security Features

- **Secure Authentication**: JWT tokens with configurable expiration
- **Password Protection**: bcrypt hashing with high salt rounds
- **Input Validation**: Comprehensive sanitization and validation
- **Rate Limiting**: Protection against abuse and spam
- **CORS Configuration**: Controlled cross-origin access
- **SQL Injection Prevention**: Parameterized queries and sanitization

## 📊 Analytics & Reporting

### For Candidates
- Performance trends over time
- Strengths and weakness analysis
- Question type proficiency
- Time management insights

### For HR Teams
- Candidate comparison metrics
- Assessment completion rates
- Question difficulty analysis
- Hiring funnel optimization

## 🌐 Network Access

The application supports both local and network deployment:

- **Local Development**: Access via localhost
- **Network Sharing**: Configure for same-network access
- **Production Deployment**: Cloud-ready with comprehensive guides

## 🏗️ Architecture

The HR Candidate Evaluation System follows a modern, scalable architecture with clear separation of concerns:

### System Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Layer  │    │  Frontend Layer │    │   API Gateway   │
│                 │    │                 │    │                 │
│ • Desktop       │───▶│ • React 18.3.1  │───▶│ • Express.js    │
│ • Mobile        │    │ • TypeScript    │    │ • JWT Auth      │
│ • Voice Input   │    │ • Tailwind CSS  │    │ • Rate Limiting │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌─────────────────┐             │
│ External APIs   │    │ Database Layer  │◀────────────┘
│                 │    │                 │
│ • Groq AI API   │    │ • PostgreSQL 18 │
│ • Fallback      │    │ • DBO Schema    │
│   System        │    │ • Security & RLS│
└─────────────────┘    └─────────────────┘
```

### Key Architectural Features
- **Layered Architecture**: Clear separation between presentation, business logic, and data layers
- **Component-Based Design**: Reusable React components with TypeScript
- **API-First Approach**: RESTful endpoints with comprehensive error handling
- **Security by Design**: JWT authentication, input validation, and SQL injection prevention
- **Performance Optimized**: Connection pooling, strategic indexing, and caching
- **Scalable Infrastructure**: Stateless design ready for horizontal scaling

### Data Flow
1. **Authentication**: User credentials → JWT validation → Secure session
2. **Question Generation**: Assessment config → Groq AI → Fallback system → Question delivery
3. **Assessment**: User answers → Voice input (optional) → AI evaluation → Results analytics

## 📚 Documentation

- **[Architecture Guide](ARCHITECTURE.md)**: Detailed system architecture and design patterns
- **[Visual Architecture](docs/architecture-diagram.md)**: Interactive diagrams and data flows
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)**: Complete setup instructions
- **[Security Checklist](SECURITY_CHECKLIST.md)**: Security best practices
- **[F-Secure Setup](f-secure-firewall-setup.md)**: Firewall configuration

## 🤝 Contributing

We welcome contributions! Please read our contributing guidelines and submit pull requests for any improvements.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Common Issues
- **Database Connection**: Verify PostgreSQL is running and credentials are correct
- **API Key Errors**: Ensure Groq API key is valid and properly configured
- **Network Access**: Check firewall settings and CORS configuration
- **Voice Input**: Requires HTTPS or localhost, check browser permissions

### Getting Help
- Check the troubleshooting guides in the documentation
- Review the FAQ section
- Submit issues on GitHub
- Contact support for enterprise deployments

---

**Built with ❤️ for better interviews and smarter hiring decisions.**