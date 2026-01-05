# HR Candidate Evaluation System - Visual Architecture

## 🎨 System Architecture Diagram

```mermaid
graph TB
    %% Client Layer
    subgraph "Client Layer"
        Desktop[🖥️ Desktop Browsers<br/>Chrome, Firefox, Edge]
        Mobile[📱 Mobile Browsers<br/>Safari, Chrome Mobile]
        Voice[🎤 Voice Input<br/>Web Speech API]
    end

    %% Frontend Layer
    subgraph "Frontend Layer (React + TypeScript)"
        subgraph "UI Components"
            Auth[🔐 AuthForm<br/>Login/Register]
            Config[⚙️ ConfigForm<br/>Assessment Setup]
            Question[❓ QuestionView<br/>Q&A Interface]
            Results[📊 Results<br/>Analytics]
            Invite[📧 InviteForm<br/>HR Tools]
        end
        
        subgraph "Custom Hooks"
            UseAuth[🔑 useAuth<br/>JWT Management]
            UseLLM[🤖 useLLM<br/>AI Integration]
            UseVoice[🎙️ useVoice<br/>Speech API]
        end
        
        subgraph "Build Tools"
            Vite[⚡ Vite<br/>Dev Server & Build]
            Tailwind[🎨 Tailwind CSS<br/>Styling]
            Motion[✨ Framer Motion<br/>Animations]
        end
    end

    %% API Gateway
    subgraph "API Gateway (Express.js)"
        subgraph "Middleware Stack"
            CORS[🌐 CORS<br/>Cross-Origin]
            RateLimit[🚦 Rate Limiting<br/>IP Protection]
            Helmet[🛡️ Helmet<br/>Security Headers]
            JWT[🎫 JWT Auth<br/>Token Validation]
            Validation[✅ Input Validation<br/>Sanitization]
        end
        
        subgraph "API Endpoints"
            AuthAPI[🔐 /auth<br/>signup, signin, signout]
            InviteAPI[📧 /invitations<br/>CRUD Operations]
            HealthAPI[❤️ /health<br/>System Status]
        end
    end

    %% Database Layer
    subgraph "Database Layer (PostgreSQL 18)"
        subgraph "DBO Schema"
            Users[👥 users<br/>Authentication]
            Profiles[👤 profiles<br/>User Info]
            Sessions[🎫 user_sessions<br/>JWT Tokens]
            Invitations[📧 invitations<br/>Assessments]
            Security[🔒 security_log<br/>Audit Trail]
        end
        
        subgraph "Database Features"
            Indexes[📇 Indexes<br/>B-tree, GIN, Partial]
            Triggers[⚡ Triggers<br/>Auto-updates]
            Functions[🔧 Functions<br/>Cleanup, Stats]
            RLS[🛡️ Row Level Security<br/>Access Control]
        end
    end

    %% External Services
    subgraph "External Services"
        GroqAPI[🤖 Groq AI API<br/>LLaMA-4 Scout<br/>Question Generation<br/>Answer Evaluation]
        Fallback[📚 Fallback System<br/>Local Question Banks<br/>Template Engine]
    end

    %% Infrastructure
    subgraph "Infrastructure & Deployment"
        Dev[🛠️ Development<br/>Vite HMR + Nodemon]
        Prod[🚀 Production<br/>PM2 + Nginx]
        Monitor[📊 Monitoring<br/>Health Checks<br/>Performance Metrics]
    end

    %% Connections
    Desktop --> Auth
    Mobile --> Auth
    Voice --> UseVoice
    
    Auth --> UseAuth
    Config --> UseLLM
    Question --> UseVoice
    Results --> UseLLM
    Invite --> UseAuth
    
    UseAuth --> AuthAPI
    UseLLM --> GroqAPI
    UseLLM --> Fallback
    
    AuthAPI --> Users
    AuthAPI --> Sessions
    InviteAPI --> Invitations
    HealthAPI --> Monitor
    
    Users --> Profiles
    Sessions --> Security
    
    JWT --> Sessions
    Validation --> Security
    
    GroqAPI -.-> Fallback
    
    Dev --> Vite
    Prod --> Monitor

    %% Styling
    classDef clientLayer fill:#e1f5fe
    classDef frontendLayer fill:#f3e5f5
    classDef apiLayer fill:#e8f5e8
    classDef dbLayer fill:#fff3e0
    classDef externalLayer fill:#fce4ec
    classDef infraLayer fill:#f1f8e9

    class Desktop,Mobile,Voice clientLayer
    class Auth,Config,Question,Results,Invite,UseAuth,UseLLM,UseVoice,Vite,Tailwind,Motion frontendLayer
    class CORS,RateLimit,Helmet,JWT,Validation,AuthAPI,InviteAPI,HealthAPI apiLayer
    class Users,Profiles,Sessions,Invitations,Security,Indexes,Triggers,Functions,RLS dbLayer
    class GroqAPI,Fallback externalLayer
    class Dev,Prod,Monitor infraLayer
```

## 🔄 Data Flow Diagrams

### Authentication Flow
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API Gateway
    participant D as Database
    participant J as JWT Service

    U->>F: Enter credentials
    F->>F: Validate input
    F->>A: POST /auth/signin
    A->>A: Rate limit check
    A->>A: Input sanitization
    A->>D: Query user
    D->>A: User data
    A->>A: Verify password (bcrypt)
    A->>J: Generate JWT token
    J->>A: Signed token
    A->>D: Store session
    A->>F: Return token + user
    F->>F: Store in secure storage
    F->>U: Redirect to dashboard
```

### Question Generation Flow
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API Gateway
    participant G as Groq API
    participant FB as Fallback System
    participant D as Database

    U->>F: Start assessment
    F->>A: Request questions
    A->>A: Validate JWT
    A->>G: Generate questions
    
    alt Groq API Success
        G->>A: AI-generated questions
    else Groq API Failure
        A->>FB: Use fallback system
        FB->>A: Template questions
    end
    
    A->>D: Log question request
    A->>F: Return questions
    F->>U: Display questions
```

### Assessment Evaluation Flow
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant V as Voice API
    participant A as API Gateway
    participant G as Groq API
    participant D as Database

    U->>F: Answer question
    
    alt Voice Input
        U->>V: Speak answer
        V->>F: Transcribed text
    end
    
    F->>A: Submit answer
    A->>A: Validate & sanitize
    A->>D: Store answer
    A->>G: Evaluate answer
    G->>A: Score & feedback
    A->>D: Store evaluation
    A->>F: Return results
    F->>U: Show feedback
```

## 🏗️ Component Architecture

### Frontend Component Hierarchy
```mermaid
graph TD
    App[🏠 App.tsx<br/>Main Application]
    
    App --> Router[🧭 Router<br/>Route Management]
    App --> Auth[🔐 AuthProvider<br/>Global Auth State]
    App --> Theme[🎨 ThemeProvider<br/>UI Theming]
    
    Router --> Login[📝 Login Page]
    Router --> Dashboard[📊 Dashboard]
    Router --> Assessment[📋 Assessment]
    Router --> Results[📈 Results]
    Router --> Admin[👑 Admin Panel]
    
    Dashboard --> ModeSelect[🎯 Mode Selection<br/>Learn/Mock/Evaluate]
    
    Assessment --> QuestionView[❓ Question Display]
    Assessment --> Timer[⏱️ Timer Component]
    Assessment --> Progress[📊 Progress Bar]
    Assessment --> VoiceInput[🎤 Voice Input]
    
    Results --> Analytics[📈 Performance Analytics]
    Results --> Feedback[💬 AI Feedback]
    Results --> Export[📤 Export Results]
    
    Admin --> UserMgmt[👥 User Management]
    Admin --> InviteMgmt[📧 Invitation Management]
    Admin --> Analytics[📊 System Analytics]

    %% Styling
    classDef appLevel fill:#ffebee
    classDef pageLevel fill:#e8f5e8
    classDef componentLevel fill:#e1f5fe
    
    class App,Router,Auth,Theme appLevel
    class Login,Dashboard,Assessment,Results,Admin pageLevel
    class ModeSelect,QuestionView,Timer,Progress,VoiceInput,Analytics,Feedback,Export,UserMgmt,InviteMgmt componentLevel
```

## 🔐 Security Architecture

### Security Layers
```mermaid
graph TB
    subgraph "Security Perimeter"
        subgraph "Frontend Security"
            InputVal[✅ Input Validation]
            XSSPrev[🛡️ XSS Prevention]
            CSRFProt[🔒 CSRF Protection]
            SecureStore[💾 Secure Token Storage]
        end
        
        subgraph "API Security"
            JWTAuth[🎫 JWT Authentication]
            RateLimit[🚦 Rate Limiting]
            InputSan[🧹 Input Sanitization]
            SQLInj[🛡️ SQL Injection Prevention]
            SecHeaders[🔒 Security Headers]
        end
        
        subgraph "Database Security"
            RLS[🛡️ Row Level Security]
            EncryptPass[🔐 Password Encryption]
            ConnPool[🏊 Connection Pooling]
            AuditLog[📝 Audit Logging]
        end
        
        subgraph "Infrastructure Security"
            Firewall[🔥 Firewall Rules]
            SSL[🔒 SSL/TLS Encryption]
            VPN[🌐 VPN Access]
            Monitoring[👁️ Security Monitoring]
        end
    end

    InputVal --> JWTAuth
    XSSPrev --> InputSan
    CSRFProt --> SecHeaders
    SecureStore --> JWTAuth
    
    JWTAuth --> RLS
    RateLimit --> ConnPool
    InputSan --> SQLInj
    SQLInj --> EncryptPass
    SecHeaders --> AuditLog
    
    RLS --> Firewall
    EncryptPass --> SSL
    ConnPool --> VPN
    AuditLog --> Monitoring
```

## 📊 Performance Architecture

### Performance Optimization Strategy
```mermaid
graph LR
    subgraph "Frontend Performance"
        CodeSplit[📦 Code Splitting]
        LazyLoad[⏳ Lazy Loading]
        Caching[💾 Browser Caching]
        Compression[🗜️ Asset Compression]
    end
    
    subgraph "Backend Performance"
        ConnPool[🏊 Connection Pooling]
        QueryOpt[🔍 Query Optimization]
        MemCache[💾 Memory Caching]
        RateLimit[🚦 Rate Limiting]
    end
    
    subgraph "Database Performance"
        Indexing[📇 Strategic Indexing]
        QueryPlan[📋 Query Planning]
        Maintenance[🔧 Auto Maintenance]
        Monitoring[📊 Performance Monitoring]
    end
    
    CodeSplit --> ConnPool
    LazyLoad --> QueryOpt
    Caching --> MemCache
    Compression --> RateLimit
    
    ConnPool --> Indexing
    QueryOpt --> QueryPlan
    MemCache --> Maintenance
    RateLimit --> Monitoring
```

This comprehensive architecture documentation provides a complete view of the HR Candidate Evaluation System's design, from high-level system architecture to detailed component interactions and security considerations.