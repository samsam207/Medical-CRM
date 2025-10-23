# Phase 1: Code & Flow Discovery Report

## 🗂️ Project Structure Analysis

### Backend Structure
```
backend/
├── app/
│   ├── __init__.py          # Flask app initialization with SocketIO
│   ├── models/              # Database models (12 files)
│   ├── routes/              # API endpoints (13 files)
│   ├── services/            # Business logic (5 files)
│   ├── socketio_handlers/   # Real-time event handlers (2 files)
│   ├── tasks/               # Background tasks (2 files)
│   └── utils/               # Utilities (3 files)
├── instance/                # SQLite database files
├── requirements.txt         # Python dependencies
└── run.py                   # Application entry point
```

### Frontend Structure
```
frontend/
├── src/
│   ├── App.jsx              # Main app component with routing
│   ├── pages/               # Page components (7 files)
│   ├── components/          # Reusable components (10 files)
│   ├── hooks/               # Custom hooks (3 files)
│   ├── stores/              # State management (3 files)
│   ├── api/                 # API client functions (10 files)
│   └── utils/               # Utility functions (3 files)
├── package.json             # Node dependencies
└── vite.config.js           # Build configuration
```

## 🚪 Entry Points Identified

### Backend Entry Points
- **Main App**: `backend/app/__init__.py` - Flask app with SocketIO initialization
- **Run Script**: `backend/run.py` - Application startup
- **Routes**: All API endpoints in `backend/app/routes/`

### Frontend Entry Points
- **Main App**: `frontend/src/App.jsx` - React routing and protected routes
- **Entry Point**: `frontend/src/main.jsx` - React app initialization
- **Dashboards**: 
  - `frontend/src/pages/ReceptionDashboard.jsx`
  - `frontend/src/pages/DoctorDashboard.jsx`

## 🔌 API Endpoints Collected

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/users` - Create user

### Appointment Endpoints
- `GET /api/appointments` - Get appointments with filters
- `GET /api/appointments/<id>` - Get specific appointment
- `POST /api/appointments` - Create new appointment
- `PUT /api/appointments/<id>` - Update appointment
- `DELETE /api/appointments/<id>` - Cancel appointment
- `GET /api/appointments/available-slots` - Get available time slots

### Visit & Queue Endpoints
- `GET /api/visits` - Get visits with filters
- `POST /api/visits/check-in` - Check in patient
- `POST /api/visits/walk-in` - Create walk-in visit
- `GET /api/visits/queue` - Get live queue
- `GET /api/visits/<id>` - Get visit details
- `PUT /api/visits/<id>/status` - Update visit status
- `POST /api/visits/<id>/call` - Call patient

### Queue Management Endpoints
- `GET /api/queue/clinic/<clinic_id>` - Get clinic queue
- `GET /api/queue/doctor/<user_id>` - Get doctor queue
- `POST /api/queue/checkin` - Check in patient
- `POST /api/queue/call` - Call patient
- `POST /api/queue/start` - Start consultation
- `POST /api/queue/complete` - Complete consultation
- `POST /api/queue/skip` - Skip patient

### Other Endpoints
- Dashboard, patients, payments, clinics, doctors, reports, prescriptions, health

## 📡 SocketIO Events Analysis

### Backend Emitted Events
1. **`appointment_created`** - When appointment is created
2. **`appointment_updated`** - When appointment is updated
3. **`appointment_cancelled`** - When appointment is cancelled
4. **`queue_updated`** - When queue state changes
5. **`new_checkin`** - When patient checks in
6. **`visit_status_changed`** - When visit status changes

### Frontend Event Listeners
Both ReceptionDashboard and DoctorDashboard listen for:
- `queue_updated`
- `new_checkin`
- `visit_status_changed`
- `appointment_created`
- `appointment_updated`
- `appointment_cancelled`

### SocketIO Room Management
- **Clinic Rooms**: `clinic_{clinic_id}` - For clinic-wide updates
- **Doctor Rooms**: `doctor_{doctor_id}` - For doctor-specific updates
- **Room Events**: `join_queue_room`, `leave_queue_room`, `join_doctor_room`, `leave_doctor_room`

## 🔄 Reception → Doctor → Database Flow Mapping

### 1. Appointment Creation Flow
```
Reception Dashboard → POST /api/appointments → Database Save → 
SocketIO emit('appointment_created') → Doctor Dashboard Updates
```

### 2. Patient Check-in Flow
```
Reception Dashboard → POST /api/queue/checkin → Database Update → 
SocketIO emit('queue_updated') + emit('new_checkin') → Doctor Dashboard Updates
```

### 3. Queue Management Flow
```
Doctor Dashboard → POST /api/queue/call → Database Update → 
SocketIO emit('queue_updated') → Reception Dashboard Updates
```

### 4. Visit Status Changes Flow
```
Doctor Dashboard → POST /api/queue/start|complete|skip → Database Update → 
SocketIO emit('queue_updated') + emit('visit_status_changed') → Reception Dashboard Updates
```

## ⚠️ Potential Weak Points Identified

### 1. **Real-time Synchronization Issues**
- **Missing Emits**: Some database operations may not emit SocketIO events
- **Event Timing**: SocketIO emits happen after DB commit, but race conditions possible
- **Room Management**: Users may not be properly joined to rooms

### 2. **Authentication & Authorization**
- **JWT Token Validation**: SocketIO authentication relies on JWT verification
- **Role-based Access**: Different permissions for receptionist vs doctor
- **Token Expiration**: No automatic token refresh for SocketIO connections

### 3. **State Management Issues**
- **React Query Invalidation**: Multiple query invalidations may cause race conditions
- **Debounced Refetch**: 500ms debounce may cause stale data
- **Cache Inconsistency**: Manual cache clearing vs automatic invalidation

### 4. **Queue Management Logic**
- **Queue Number Generation**: Potential conflicts in concurrent check-ins
- **Status Transitions**: Missing validation for invalid status changes
- **Doctor Access Control**: Doctor may access wrong clinic's queue

### 5. **Error Handling**
- **SocketIO Connection Failures**: Limited retry logic
- **Database Transaction Failures**: Some operations lack proper rollback
- **API Error Propagation**: Frontend may not handle all error cases

### 6. **Performance Issues**
- **Frequent Polling**: React Query refetch intervals may be too aggressive
- **Large Data Sets**: No pagination for queue data
- **Memory Leaks**: SocketIO listeners may not be properly cleaned up

### 7. **Data Consistency**
- **Appointment vs Visit Sync**: Appointment creation creates visit automatically
- **Payment Integration**: Payment status not always synced with visit status
- **Queue State**: Multiple sources of truth for queue data

## 🎯 Critical Areas Requiring Investigation

1. **SocketIO Connection Stability** - Test connection drops and reconnection
2. **Real-time Event Propagation** - Verify events reach all intended recipients
3. **Queue State Synchronization** - Ensure both dashboards show identical data
4. **Role-based Access Control** - Verify users can only access their authorized data
5. **Error Recovery** - Test system behavior under various failure scenarios
6. **Performance Under Load** - Test with multiple concurrent users

## 📊 Flow Diagram Summary

```
Reception Dashboard ←→ SocketIO ←→ Doctor Dashboard
        ↓                              ↓
    API Calls                    API Calls
        ↓                              ↓
    Database ←→ Queue Service ←→ Database
```

**Key Integration Points:**
- Appointment creation triggers visit creation and payment setup
- Queue updates broadcast to both clinic and doctor rooms
- Real-time events trigger React Query refetches with debouncing
- Status changes propagate through multiple database tables