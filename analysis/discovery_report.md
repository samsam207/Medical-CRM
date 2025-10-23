# Medical CRM - Code & Flow Discovery Report

## Project Structure Overview

### Backend (Flask + SocketIO)
- **Entry Point**: `backend/run.py` - Flask app with SocketIO support
- **Main App**: `backend/app/__init__.py` - Flask app factory with SocketIO initialization
- **Database**: SQLite at `backend/instance/medical_crm.db` (backup created: `medical_crm_backup_20241220.db`)

### Frontend (React + Vite)
- **Entry Point**: `frontend/src/main.jsx` - React app with QueryClient and Router
- **Main App**: `frontend/src/App.jsx` - Route definitions with ProtectedRoute components
- **State Management**: Zustand stores for auth, queue, notifications

## Key Endpoints Analysis

### Authentication
- `POST /api/auth/login` - User login with JWT token
- `POST /api/auth/logout` - Token blacklisting
- `POST /api/auth/refresh` - Token refresh

### Appointments (Reception)
- `GET /api/appointments` - List appointments with filters
- `POST /api/appointments` - Create new appointment
- `PUT /api/appointments/<id>` - Update appointment
- `DELETE /api/appointments/<id>` - Cancel appointment
- `GET /api/appointments/available-slots` - Get available time slots

### Visits (Queue Management)
- `GET /api/visits` - List visits with filters
- `POST /api/visits/check-in` - Check in patient for appointment
- `POST /api/visits/walk-in` - Create walk-in visit
- `GET /api/visits/queue` - Get live queue for clinic/doctor
- `PUT /api/visits/<id>/status` - Update visit status
- `POST /api/visits/<id>/call` - Call next patient

### Queue Management
- `GET /api/queue/clinic/<id>` - Get clinic queue
- `GET /api/queue/doctor/<id>` - Get doctor queue
- `POST /api/queue/check-in` - Check in patient
- `POST /api/queue/walk-in` - Create walk-in
- `PUT /api/queue/<id>/status` - Update visit status
- `POST /api/queue/<id>/call` - Call patient

## SocketIO Events Analysis

### Backend Emits (Server → Client)
1. **`appointment_created`** - When new appointment is created
2. **`appointment_updated`** - When appointment is modified
3. **`appointment_cancelled`** - When appointment is cancelled
4. **`queue_updated`** - When queue state changes (sent to specific rooms)
5. **`new_checkin`** - When patient checks in
6. **`visit_status_changed`** - When visit status changes
7. **`connected`** - Authentication confirmation
8. **`error`** - Error messages

### Frontend Listeners (Client ← Server)
1. **`queue_updated`** - Updates queue display
2. **`new_checkin`** - Shows new check-in notification
3. **`visit_status_changed`** - Updates visit status in UI
4. **`appointment_created`** - Refreshes appointment list
5. **`appointment_updated`** - Updates appointment in UI
6. **`appointment_cancelled`** - Removes appointment from UI
7. **`connected`** - Confirms socket connection
8. **`error`** - Shows error messages

### SocketIO Rooms
- **`clinic_{clinic_id}`** - All users in specific clinic
- **`doctor_{doctor_id}`** - All users following specific doctor

## Flow Chart Analysis

```
Reception Action → API Call → DB Change → SocketIO Emit → Doctor Listener → UI Update

1. Create Appointment:
   Reception → POST /api/appointments → DB INSERT → emit('appointment_created') → Doctor Dashboard → refetch()

2. Check-in Patient:
   Reception → POST /api/visits/check-in → DB UPDATE → emit('queue_updated') → Doctor Queue → UI update

3. Update Visit Status:
   Doctor → PUT /api/visits/<id>/status → DB UPDATE → emit('queue_updated') → Reception Dashboard → refetch()

4. Cancel Appointment:
   Reception → DELETE /api/appointments/<id> → DB UPDATE → emit('appointment_cancelled') → Doctor Dashboard → refetch()
```

## Issues Identified

### 1. SocketIO Event Mismatches
- **Issue**: Backend emits `appointment_created` but frontend listens for it
- **Status**: ✅ MATCHED - Events are properly aligned

### 2. Room Management
- **Issue**: Reception joins `clinic_{clinic_id}` room, Doctor joins `doctor_{doctor_id}` room
- **Status**: ✅ PROPER - Different rooms for different user types

### 3. Authentication Flow
- **Issue**: SocketIO requires JWT token for connection
- **Status**: ✅ IMPLEMENTED - Token passed in auth object and query params

### 4. State Synchronization
- **Issue**: Frontend uses `refetch()` to update data after socket events
- **Status**: ⚠️ POTENTIAL ISSUE - May cause unnecessary API calls

### 5. Error Handling
- **Issue**: SocketIO error events are emitted but not consistently handled
- **Status**: ⚠️ PARTIAL - Some error handling present

### 6. CORS Configuration
- **Issue**: SocketIO CORS configured for localhost:3000 only
- **Status**: ✅ CORRECT - Matches frontend port

## Real-time Communication Status

### ✅ Working Components
1. SocketIO server initialization with CORS
2. JWT authentication for socket connections
3. Room-based broadcasting (clinic/doctor specific)
4. Event emission after database changes
5. Frontend socket connection and event listening
6. Automatic refetch on socket events

### ⚠️ Potential Issues
1. **Excessive Refetching**: Every socket event triggers `refetch()` which may cause performance issues
2. **Missing Error Recovery**: No retry logic for failed socket connections
3. **State Inconsistency**: Socket events only trigger refetch, not direct state updates
4. **No Connection Status**: Limited feedback on socket connection health

### 🔍 Areas for Investigation
1. **Queue Service**: Verify queue data structure matches frontend expectations
2. **Visit Status Flow**: Check if all status transitions emit proper events
3. **Concurrent Updates**: Test multiple users updating same data simultaneously
4. **Network Resilience**: Test behavior during connection drops

## Next Steps
1. Verify SocketIO event payloads match frontend expectations
2. Test live browser simulation with 2 sessions
3. Check for any missing event emissions
4. Validate queue data consistency between backend and frontend
