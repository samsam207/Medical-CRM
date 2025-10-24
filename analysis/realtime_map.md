# Real-time Communication Mapping

## Backend SocketIO Implementation

### SocketIO Initialization
- **File**: `backend/app/__init__.py` (lines 62, 101)
- **Configuration**: 
  - Async mode: `eventlet`
  - CORS origins: Configurable via `ALLOWED_ORIGINS`
  - Default: `http://localhost:3000`

### SocketIO Event Handlers
- **File**: `backend/app/socketio_handlers/queue_events.py`

#### Connection Events
- **`connect`**: Client connection with JWT authentication
- **`disconnect`**: Client disconnection logging
- **Authentication**: JWT token verification for all events

#### Room Management Events
- **`join_queue_room`**: Join clinic-specific queue room
  - **Payload**: `{clinic_id, token}`
  - **Room**: `clinic_{clinic_id}`
  - **Response**: Current queue state

- **`leave_queue_room`**: Leave clinic-specific queue room
  - **Payload**: `{clinic_id, token}`

- **`join_doctor_room`**: Join doctor-specific queue room
  - **Payload**: `{doctor_id, token}`
  - **Room**: `doctor_{doctor_id}`
  - **Response**: Current doctor queue state

- **`leave_doctor_room`**: Leave doctor-specific queue room
  - **Payload**: `{doctor_id, token}`

### Real-time Events Emitted

#### Queue Updates
- **Event**: `queue_updated`
- **Triggered by**: All queue-related operations
- **Rooms**: `clinic_{clinic_id}`, `doctor_{doctor_id}`
- **Data**: Current queue state from QueueService

#### Appointment Events
- **`appointment_created`**: New appointment created
  - **Rooms**: `clinic_{clinic_id}`, `doctor_{doctor_id}`
  - **Data**: `{appointment, visit, clinic_id, doctor_id}`

- **`appointment_updated`**: Appointment modified
  - **Rooms**: `clinic_{clinic_id}`, `doctor_{doctor_id}`
  - **Data**: `{appointment, clinic_id, doctor_id}`

- **`appointment_cancelled`**: Appointment cancelled
  - **Rooms**: `clinic_{clinic_id}`, `doctor_{doctor_id}`
  - **Data**: `{appointment, clinic_id, doctor_id}`

#### Visit Events
- **`visit_status_changed`**: Visit status updated
  - **Rooms**: `clinic_{clinic_id}`, `doctor_{doctor_id}`
  - **Data**: `{visit, clinic_id, doctor_id}`

- **`new_checkin`**: New patient check-in
  - **Rooms**: `clinic_{clinic_id}`
  - **Data**: `{visit, patient, clinic_id, doctor_id}`

#### Payment Events
- **`payment_processed`**: Payment completed
  - **Rooms**: `clinic_{clinic_id}`, `doctor_{doctor_id}`
  - **Data**: `{payment, visit}`

#### Patient Events
- **`patient_created`**: New patient created
  - **Rooms**: Global broadcast
  - **Data**: `{patient}`

- **`patient_updated`**: Patient information updated
  - **Rooms**: Global broadcast
  - **Data**: `{patient}`

## Frontend SocketIO Implementation

### SocketIO Hook
- **File**: `frontend/src/hooks/useSocket.js`

#### Connection Management
- **Auto-connect**: On authentication
- **Auto-disconnect**: On logout
- **Reconnection**: Exponential backoff (max 5 attempts)
- **Authentication**: JWT token in auth payload

#### Connection Configuration
```javascript
io('http://localhost:5000', {
  auth: { token: token },
  transports: ['websocket', 'polling'],
  timeout: 10000,
  forceNew: true
})
```

#### Room Management Methods
- **`joinQueueRoom(clinicId)`**: Join clinic queue room
- **`leaveQueueRoom(clinicId)`**: Leave clinic queue room
- **`joinDoctorRoom(doctorId)`**: Join doctor queue room
- **`leaveDoctorRoom(doctorId)`**: Leave doctor queue room

#### Event Listeners
- **`onQueueUpdate(callback)`**: Listen for queue updates
- **`onNewCheckin(callback)`**: Listen for new check-ins
- **`onVisitStatusChange(callback)`**: Listen for visit status changes
- **`onAppointmentCreated(callback)`**: Listen for new appointments
- **`onAppointmentUpdated(callback)`**: Listen for appointment updates
- **`onAppointmentCancelled(callback)`**: Listen for appointment cancellations

#### Connection State
- **`isConnected`**: Boolean connection status
- **`connectionError`**: Connection error message
- **`reconnect()`**: Manual reconnection method

## Real-time Flow Triggers

### Appointment Creation Flow
1. **API**: `POST /api/appointments`
2. **Database**: Create appointment, visit, payment records
3. **SocketIO**: Emit `appointment_created` to clinic and doctor rooms
4. **SocketIO**: Emit `queue_updated` to clinic room
5. **Frontend**: Receives events and updates UI

### Check-in Flow
1. **API**: `POST /api/visits/check-in` or `POST /api/queue/checkin`
2. **Database**: Create visit record, update appointment status
3. **SocketIO**: Emit `new_checkin` to clinic room
4. **SocketIO**: Emit `queue_updated` to clinic and doctor rooms
5. **Frontend**: Receives events and updates queue displays

### Visit Status Updates
1. **API**: `PUT /api/visits/<id>/status`
2. **Database**: Update visit status and timestamps
3. **SocketIO**: Emit `visit_status_changed` to clinic and doctor rooms
4. **SocketIO**: Emit `queue_updated` to clinic and doctor rooms
5. **Frontend**: Receives events and updates queue displays

### Payment Processing
1. **API**: `POST /api/payments` or `PUT /api/payments/<id>/process`
2. **Database**: Update payment status, visit status
3. **SocketIO**: Emit `payment_processed` to clinic and doctor rooms
4. **SocketIO**: Emit `queue_updated` to clinic and doctor rooms
5. **Frontend**: Receives events and updates payment displays

## Room Architecture

### Room Types
- **Clinic Rooms**: `clinic_{clinic_id}` - Reception staff, clinic-wide updates
- **Doctor Rooms**: `doctor_{doctor_id}` - Doctor-specific updates

### Room Membership
- **Receptionists**: Join clinic rooms for their assigned clinics
- **Doctors**: Join doctor rooms for their specific doctor ID
- **Admins**: Can join any clinic or doctor room

### Data Broadcasting
- **Queue Updates**: Broadcast to both clinic and doctor rooms
- **Appointment Events**: Broadcast to relevant clinic and doctor rooms
- **Patient Events**: Global broadcast to all connected clients

---
**Status**: Real-time communication architecture mapped and documented
