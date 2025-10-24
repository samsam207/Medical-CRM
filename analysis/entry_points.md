# Entry Points Analysis

## Backend Entry Points

### Main Application Entry
- **File**: `backend/run.py`
- **Purpose**: Development server entry point
- **Key Features**:
  - Creates Flask app using `create_app()`
  - Initializes SocketIO with eventlet async mode
  - Runs on host 0.0.0.0, port 5000 (configurable via env)
  - Debug mode configurable via FLASK_DEBUG env var

### Application Factory
- **File**: `backend/app/__init__.py`
- **Function**: `create_app(config_name=None)`
- **Key Features**:
  - Flask app creation and configuration
  - Extension initialization (SQLAlchemy, JWT, SocketIO, CORS, Cache, Limiter)
  - Blueprint registration for all API routes
  - SocketIO handlers registration
  - Error handlers setup
  - JWT security configuration

### Blueprint Routes (API Endpoints)
- **Auth**: `/api/auth` - Authentication routes
- **Appointments**: `/api/appointments` - Appointment management
- **Visits**: `/api/visits` - Visit management
- **Patients**: `/api/patients` - Patient management
- **Payments**: `/api/payments` - Payment processing
- **Dashboard**: `/api/dashboard` - Dashboard data
- **Doctors**: `/api/doctors` - Doctor management
- **Clinics**: `/api/clinics` - Clinic management
- **Reports**: `/api/reports` - Reporting
- **Prescriptions**: `/api/prescriptions` - Prescription management
- **Queue**: `/api/queue` - Queue management
- **Health**: `/api` - Health checks

## Frontend Entry Points

### Main Application Entry
- **File**: `frontend/src/main.jsx`
- **Purpose**: React application bootstrap
- **Key Features**:
  - React Query client setup with 5-minute stale time
  - BrowserRouter with React Router v7 features
  - Auth store initialization on startup
  - Error boundary wrapper

### HTML Entry Point
- **File**: `frontend/index.html`
- **Purpose**: HTML document root
- **Key Features**:
  - RTL support for Arabic interface
  - Medical CRM title
  - Root div for React mounting
  - Vite module script loading

### Application Component
- **File**: `frontend/src/App.jsx`
- **Purpose**: Main application routing
- **Key Features**:
  - Protected routes with role-based access
  - Route definitions for all pages
  - Error boundary wrapper
  - RTL layout with Arabic font

### Route Structure
- **Login**: `/login` - Authentication page
- **Reception**: `/reception` - Receptionist dashboard (receptionist, admin roles)
- **Doctor**: `/doctor` - Doctor dashboard (doctor, admin roles)
- **Patients**: `/patients` - Patient management (receptionist, admin roles)
- **Appointments**: `/appointments` - Appointment management (receptionist, admin roles)
- **Payments**: `/payments` - Payment management (receptionist, admin roles)
- **Reports**: `/reports` - Reporting (receptionist, admin roles)

## Startup Scripts

### PowerShell Launcher
- **File**: `start_medical_crm.ps1`
- **Purpose**: Complete environment setup and launch
- **Key Features**:
  - Python and Node.js version checks
  - Virtual environment creation and activation
  - Backend dependency installation
  - Database initialization and seeding
  - Frontend dependency installation
  - Dual server startup (backend + frontend)
  - Browser auto-launch

### Docker Support
- **File**: `docker-compose.yml`
- **Purpose**: Containerized deployment
- **Services**: Backend, Frontend, Redis, PostgreSQL

## Real-time Communication

### SocketIO Configuration
- **Backend**: Flask-SocketIO with eventlet async mode
- **Frontend**: Socket.IO client v4.6.1
- **CORS**: Configured for localhost:3000
- **Handlers**: Queue events for real-time updates

## Security Features

### JWT Authentication
- **Secret Key**: Environment variable or config fallback
- **Token Expiry**: 8 hours access, 30 days refresh
- **Blacklist**: Enabled for token revocation
- **Error Handlers**: Custom responses for expired/invalid tokens

### Role-Based Access
- **Protected Routes**: Role-based component protection
- **Allowed Roles**: Defined per route
- **Admin Override**: Admin role has access to all routes