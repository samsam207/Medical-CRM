# Real-time Events Map - Socket.IO

**Generated:** 2025-10-26  
**Status:** PHASE 1 - Code Study

## Socket.IO Configuration

**Backend:** Flask-SocketIO 5.3.6  
**Frontend:** socket.io-client 4.6.1  
**Authentication:** JWT token passed in auth parameter

## Rooms

- `clinic_{clinic_id}` - All users viewing a specific clinic
- `doctor_{doctor_id}` - All users viewing a specific doctor's queue

## Events

### Connection Events

**Client → Server:**
- `connect` with auth token
- `join_queue_room` with { clinic_id }
- `join_doctor_room` with { doctor_id }
- `leave_queue_room` with { clinic_id }
- `leave_doctor_room` with { doctor_id }

**Server → Client:**
- `connected` - Connection successful
- `error` - Authentication error or invalid request

---

## Real-time Update Events

### Queue Events

**Event:** `queue_updated`  
**From:** Backend routes (queue.py, appointments.py, visits.py)  
**To:** All clients in clinic/doctor room  
**Payload:**
```json
{
  "clinic_id": 1,
  "waiting": [...],
  "called": [...],
  "in_progress": [...],
  "completed": [...],
  "total": 10
}
```

**Triggered by:**
- Check-in appointment
- Call patient
- Start consultation
- Complete consultation
- Create walk-in
- Cancel visit
- Move between phases

---

**Event:** `new_checkin`  
**From:** POST /queue/checkin  
**To:** clinic_{clinic_id} room  
**Payload:**
```json
{
  "visit": {...},
  "patient": {...},
  "clinic_id": 1,
  "doctor_id": 2
}
```

---

**Event:** `appointment_created`  
**From:** POST /appointments  
**To:** clinic_{clinic_id}, doctor_{doctor_id}  
**Payload:**
```json
{
  "appointment": {...},
  "visit": {...},
  "clinic_id": 1,
  "doctor_id": 2
}
```

---

**Event:** `appointment_updated`  
**From:** PUT /appointments/{id}  
**To:** clinic_{clinic_id}, doctor_{doctor_id}  
**Payload:**
```json
{
  "appointment": {...},
  "clinic_id": 1,
  "doctor_id": 2
}
```

---

**Event:** `appointment_cancelled`  
**From:** DELETE /appointments/{id}  
**To:** clinic_{clinic_id}, doctor_{doctor_id}  
**Payload:**
```json
{
  "appointment": {...},
  "clinic_id": 1,
  "doctor_id": 2
}
```

---

**Event:** `visit_status_changed`  
**From:** PUT /visits/{id}/status, POST /queue/call  
**To:** clinic_{clinic_id}, doctor_{doctor_id}  
**Payload:**
```json
{
  "visit": {...},
  "clinic_id": 1,
  "doctor_id": 2
}
```

---

**Event:** `walkin_added`  
**From:** POST /queue/walkin  
**To:** clinic_{clinic_id}  
**Payload:**
```json
{
  "visit": {...},
  "clinic_id": 1
}
```

---

**Event:** `visit_cancelled`  
**From:** POST /queue/cancel  
**To:** clinic_{clinic_id}  
**Payload:**
```json
{
  "visit_id": 5,
  "reason": "No show",
  "clinic_id": 1
}
```

---

**Event:** `queue_reordered`  
**From:** PUT /queue/reorder  
**To:** clinic_{clinic_id}  
**Payload:**
```json
{
  "visit_id": 5,
  "new_position": 3,
  "clinic_id": 1
}
```

---

### Patient Events

**Event:** `patient_created`  
**From:** POST /patients  
**To:** All clients  
**Payload:**
```json
{
  "patient": {...}
}
```

---

**Event:** `patient_updated`  
**From:** PUT /patients/{id}  
**To:** All clients  
**Payload:**
```json
{
  "patient": {...}
}
```

---

### Payment Events

**Event:** `payment_processed`  
**From:** PUT /payments/{id}/process  
**To:** All clients  
**Payload:**
```json
{
  "payment": {...},
  "visit": {...}
}
```

---

## Frontend Listeners (ReceptionDashboard.jsx)

The dashboard listens to ALL these events and triggers a debounced refetch:

```javascript
// List of events listened to:
- 'queue_updated'
- 'new_checkin'
- 'visit_status_changed'
- 'appointment_created'
- 'appointment_updated'
- 'appointment_cancelled'
- 'patient_created'
- 'patient_updated'
- 'payment_processed'
```

**Debounce Delay:** 500ms (prevents excessive API calls)

**Refetch Strategy:** Invalidate all queries, then refetch dashboard stats

---

## Real-time Authentication

Each SocketIO event requires JWT verification:

```python
def verify_jwt_token(token):
    # Verifies JWT and returns User object
    # Returns None if invalid or expired
```

**Token Source:**
- Query parameter: `?token=xyz`
- Auth object: `{ token: 'xyz' }`

---

## Critical Real-time Flow

### Appointment Confirmation Flow:

1. **Backend:** POST /appointments creates appointment
2. **Backend:** Emits `appointment_created` to clinic_{id} and doctor_{id} rooms
3. **Backend:** Emits `queue_updated` to same rooms
4. **Frontend:** Receives both events
5. **Frontend:** Debounced refetch triggered after 500ms
6. **Frontend:** Query invalidation + dashboard stats refetch
7. **Frontend:** UI updates with new appointment

### Queue Movement Flow:

1. **Backend:** POST /queue/phases/move moves patient
2. **Backend:** Updates Visit.status in DB
3. **Backend:** Emits `queue_updated` to clinic room
4. **Backend:** Emits `queue_updated` to doctor room
5. **Frontend:** Receives events
6. **Frontend:** Refetches queue data
7. **Frontend:** UI updates patient position

---

## SocketIO Event Emission Pattern

```python
# Standard pattern in routes:
socketio.emit('event_name', payload, room=f'clinic_{clinic_id}')
socketio.emit('event_name', payload, room=f'doctor_{doctor_id}')

# Or broadcast to all:
socketio.emit('event_name', payload)  # All connected clients
```

---

## Known Issues

1. **Race Conditions:** Multiple rapid operations can emit multiple queue_updated events
2. **Cache Invalidation:** SocketIO doesn't automatically invalidate Flask-Cache
3. **Event Order:** Events may arrive out of order on slow networks
4. **Debounce:** 500ms may be too short for batch operations

---

## Testing Real-time Events

To test real-time functionality:

1. Open two browser windows
2. Window A: Receptionist view
3. Window B: Doctor view
4. Perform action in Window A
5. Verify Window B updates automatically

**Network Inspector:**
- Monitor WebSocket connection
- Observe SocketIO events in Network tab
- Check Console for event logs

