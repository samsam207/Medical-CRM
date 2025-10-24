# Entry Points Analysis

## Backend Entry Points

### Main Application Entry
- **File**: `backend/run.py`
- **Purpose**: Development server entry point
- **Features**: 
  - Flask app creation via `create_app()`
  - SocketIO support enabled
  - Runs on port 5000 (configurable via FLASK_PORT env var)
  - Debug mode configurable via FLASK_DEBUG env var

### Application Factory
- **File**: `backend/app/__init__.py`
- **Function**: `create_app(config_name=None)`
- **Purpose**: Flask application factory pattern
- **Key Components**:
  - SQLAlchemy database initialization
  - JWT authentication setup
  - SocketIO configuration
  - CORS setup
  - Blueprint registration for all API routes
  - Error handlers
  - Upload directory creation

### Blueprint Routes Registered
1. `/api/auth` - Authentication routes
2. `/api/appointments` - Appointment management
3. `/api/visits` - Visit management
4. `/api/patients` - Patient management
5. `/api/payments` - Payment processing
6. `/api/dashboard` - Dashboard data
7. `/api/doctors` - Doctor management
8. `/api/clinics` - Clinic management
9. `/api/reports` - Reporting
10. `/api/prescriptions` - Prescription management
11. `/api/queue` - Queue management
12. `/api` - Health check

## Frontend Entry Points

### Main Application Entry
- **File**: `frontend/src/main.jsx`
- **Purpose**: React application bootstrap
- **Features**:
  - React Query client setup
  - Browser router configuration
  - Auth store initialization
  - Error boundary setup

### Application Component
- **File**: `frontend/src/App.jsx`
- **Purpose**: Main routing and layout
- **Routes**:
  - `/login` - Authentication page
  - `/reception` - Receptionist dashboard (receptionist, admin roles)
  - `/doctor` - Doctor dashboard (doctor, admin roles)
  - `/patients` - Patient management (receptionist, admin roles)
  - `/appointments` - Appointment management (receptionist, admin roles)
  - `/payments` - Payment management (receptionist, admin roles)
  - `/reports` - Reports (receptionist, admin roles)
  - `/` - Redirects to login
  - `*` - Fallback redirects to login

### Development Server
- **Script**: `npm run dev` (Vite)
- **Port**: 3000 (default Vite port)
- **Features**: Hot reload, development server

## State Management

### Frontend State
- **Auth Store**: Zustand store for authentication state
- **React Query**: Server state management and caching
- **Local Storage**: Auth token persistence

### Backend State
- **Database**: SQLAlchemy with SQLite (development)
- **Session**: Flask session management
- **JWT**: Token-based authentication
- **SocketIO**: Real-time communication state

## Key Dependencies

### Backend
- Flask + Flask-SocketIO
- SQLAlchemy + Flask-Migrate
- JWT Extended
- Flask-CORS
- Flask-Caching
- Flask-Limiter

### Frontend
- React 18
- React Router DOM
- React Query (TanStack Query)
- Zustand (state management)
- Socket.IO Client
- Tailwind CSS
- Lucide React (icons)

---
**Status**: Entry points mapped and documented
