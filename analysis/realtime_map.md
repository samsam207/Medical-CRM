# Real-time Communication Map

## Backend SocketIO Configuration

### Flask-SocketIO Setup
- **File**: `backend/app/__init__.py` (lines 62-64)
- **Configuration**:
  - Async mode: `eventlet`
  - CORS origins: `['http://localhost:3000']`
  - Initialized with Flask app

### SocketIO Handlers
- **File**: `backend/app/socketio_handlers/queue_events.py`
- **Authentication**: JWT token verification
- **Room Management**: Clinic and doctor-specific rooms

## Backend SocketIO Events

### Connection Events
- **`connect`**: Client connection with JWT authentication
- **`disconnect`**: Client disconnection logging
- **`connected`**: Authentication confirmation

### Room Management Events
- **`join_queue_room`**: Join clinic queue room for real-time updates
- **`leave_queue_room`**: Leave clinic queue room
- **`join_doctor_room`**: Join doctor-specific queue room
- **`leave_doctor_room`**: Leave doctor-specific queue room

### Emitted Events (from API routes)
- **`appointment_created`** → `clinic_{clinic_id}`, `doctor_{doctor_id}`
- **`appointment_updated`** → `clinic_{clinic_id}`, `doctor_{doctor_id}`
- **`appointment_cancelled`** → `clinic_{clinic_id}`, `doctor_{doctor_id}`
- **`queue_updated`** → `clinic_{clinic_id}`, `doctor_{doctor_id}`
- **`visit_status_changed`** → `clinic_{clinic_id}`, `doctor_{doctor_id}`
- **`payment_processed`** → broadcast
- **`patient_created`** → broadcast
- **`patient_updated`** → broadcast
- **`new_checkin`** → `clinic_{clinic_id}`

## Frontend SocketIO Configuration

### Socket Hook
- **File**: `frontend/src/hooks/useSocket.js`
- **Connection**: `http://localhost:5000`
- **Authentication**: JWT token in auth object
- **Transports**: WebSocket and polling fallback
- **Reconnection**: Exponential backoff (max 5 attempts)

### Connection Management
- **Auto-connect**: When authenticated
- **Auto-disconnect**: When logged out
- **Reconnection**: Automatic with exponential backoff
- **Error handling**: Connection error states

### Room Management Functions
- **`joinQueueRoom(clinicId)`**: Join clinic queue room
- **`leaveQueueRoom(clinicId)`**: Leave clinic queue room
- **`joinDoctorRoom(doctorId)`**: Join doctor queue room
- **`leaveDoctorRoom(doctorId)`**: Leave doctor queue room

### Event Listeners
- **`onQueueUpdate(callback)`**: Queue update events
- **`onNewCheckin(callback)`**: New check-in events
- **`onVisitStatusChange(callback)`**: Visit status changes
- **`onAppointmentCreated(callback)`**: Appointment creation
- **`onAppointmentUpdated(callback)`**: Appointment updates
- **`onAppointmentCancelled(callback)`**: Appointment cancellations

## Frontend Socket Usage

### Reception Dashboard
- **File**: `frontend/src/pages/ReceptionDashboard.jsx`
- **Socket Events Listened**:
  - `queue_updated` - Updates queue display
  - `new_checkin` - Shows new check-in notifications
  - `visit_status_changed` - Updates visit status
  - `appointment_created` - Refreshes appointment list
  - `appointment_updated` - Refreshes appointment list
  - `appointment_cancelled` - Refreshes appointment list
  - `patient_created` - Refreshes patient list
  - `patient_updated` - Refreshes patient list
  - `payment_processed` - Refreshes payment list

### Doctor Dashboard
- **File**: `frontend/src/pages/DoctorDashboard.jsx`
- **Socket Events Listened**:
  - `queue_updated` - Updates doctor's queue
  - `new_checkin` - Shows new check-in notifications
  - `visit_status_changed` - Updates visit status
  - `appointment_created` - Refreshes appointment list
  - `appointment_updated` - Refreshes appointment list
  - `appointment_cancelled` - Refreshes appointment list
  - `patient_created` - Refreshes patient list
  - `patient_updated` - Refreshes patient list
  - `payment_processed` - Refreshes payment list

## Real-time Flow Analysis

### Appointment Creation Flow
1. **Reception** creates appointment via API
2. **Backend** creates appointment, visit, payment records
3. **Backend** emits `appointment_created` to clinic and doctor rooms
4. **Backend** emits `queue_updated` to clinic room
5. **Reception Dashboard** receives events and refreshes data
6. **Doctor Dashboard** receives events and refreshes data

### Check-in Flow
1. **Reception** checks in patient via API
2. **Backend** creates visit record, updates appointment status
3. **Backend** emits `queue_updated` to clinic and doctor rooms
4. **Backend** emits `new_checkin` to clinic room
5. **Both dashboards** receive events and update displays

### Visit Status Changes
1. **Doctor** updates visit status via API
2. **Backend** updates visit record
3. **Backend** emits `queue_updated` to clinic and doctor rooms
4. **Backend** emits `visit_status_changed` to clinic and doctor rooms
5. **Both dashboards** receive events and update displays

### Payment Processing
1. **Reception** processes payment via API
2. **Backend** updates payment and visit records
3. **Backend** emits `payment_processed` to all clients
4. **Backend** emits `queue_updated` to clinic and doctor rooms
5. **Both dashboards** receive events and update displays

## Room Structure

### Clinic Rooms
- **Format**: `clinic_{clinic_id}`
- **Members**: All users in the clinic (receptionists, doctors, admins)
- **Events**: Queue updates, appointment events, check-ins

### Doctor Rooms
- **Format**: `doctor_{doctor_id}`
- **Members**: Users viewing specific doctor's queue
- **Events**: Doctor-specific queue updates, visit status changes

### Broadcast
- **Members**: All connected users
- **Events**: Patient events, payment events

## Authentication & Security

### JWT Token Verification
- **Backend**: Verifies JWT token on connection and room joins
- **Frontend**: Sends token in auth object and room join requests
- **Error Handling**: Connection rejected for invalid tokens

### Room Access Control
- **Clinic Rooms**: Based on user's clinic assignment
- **Doctor Rooms**: Based on user's doctor profile
- **Broadcast**: All authenticated users

## Potential Issues Identified

### Connection Management
- **Reconnection**: May cause duplicate event listeners
- **Room Joins**: No automatic room cleanup on disconnect
- **Error States**: Limited error recovery mechanisms

### Event Handling
- **Debouncing**: Uses debounced refetch instead of direct state updates
- **Memory Leaks**: Potential for accumulating event listeners
- **Race Conditions**: Multiple rapid events may cause UI inconsistencies

### Authentication
- **Token Refresh**: No automatic token refresh on expiration
- **Room Persistence**: Rooms not automatically rejoined after reconnection