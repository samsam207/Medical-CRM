# Appointment Confirmation Flow - End-to-End

**Generated:** 2025-10-26  
**Status:** PHASE 1 - Code Study  
**Critical Flow:** New Appointment Creation

---

## Frontend Flow: BookingWizard

### Step 1: User Clicks "حجز جديد" Button
**Component:** `ReceptionDashboard.jsx` (line 297)  
**Action:** Opens `BookingWizard` modal

### Step 2: User Fills Appointment Details
**Component:** `BookingWizard.jsx`

#### Step 2.1: Select Clinic
- Uses: `clinicsApi.getClinics()` 
- Stores: `formData.clinic_id`
- Next disabled until clinic selected

#### Step 2.2: Select Doctor
- Uses: `clinicsApi.getClinicDoctors(clinic_id)`
- Stores: `formData.doctor_id`
- Enabled when clinic_id present

#### Step 2.3: Select Patient (or Create New)
- Uses: `patientsApi.searchPatients(query)`
- OR: `patientsApi.createPatient(data)` if new patient
- Stores: `formData.patient_id`

**New Patient Creation:**
```javascript
// Line 152-168 in BookingWizard.jsx
createPatientMutation.mutate(patientData)
// Success callback:
const patientId = response?.data?.patient?.id || response?.patient?.id
setFormData(prev => ({ ...prev, patient_id: patientId }))
```

#### Step 2.4: Select Service & Time
- Uses: `clinicsApi.getClinicServices(clinic_id)`
- Uses: `appointmentsApi.getAvailableSlots({ doctor_id, clinic_id, date })`
- Stores: `formData.service_id`, `formData.start_time`

#### Step 2.5: Confirm
- Calls: `createAppointmentMutation.mutate(formData)`

---

## API Call: Frontend → Backend

**URL:** `POST /appointments`  
**File:** `frontend/src/api/appointments.js` (line 17-20)

```javascript
createAppointment: async (data) => {
  const response = await api.post('/appointments', data)
  return response.data
}
```

**Payload:**
```json
{
  "clinic_id": 1,
  "doctor_id": 2,
  "patient_id": 3,
  "service_id": 4,
  "start_time": "2025-10-26T10:00:00",
  "booking_source": "phone",
  "notes": "Optional notes"
}
```

---

## Backend Processing: Create Appointment

**File:** `backend/app/routes/appointments.py`  
**Function:** `create_appointment` (lines 98-235)  
**Decorators:** `@receptionist_required`, `@validate_json`, `@log_audit`

### Phase 1: Validation

**Lines 105-117:**
```python
# Validate appointment time
start_time = datetime.fromisoformat(data['start_time'].replace('Z', '+00:00'))
service = Service.query.get(data['service_id'])
end_time = calculate_end_time(start_time, service.duration)

is_valid, message = validate_appointment_time(
    data['doctor_id'], start_time, end_time
)
```

### Phase 2: Create Appointment

**Lines 120-134:**
```python
# Generate booking ID
booking_id = generate_booking_id()

# Create appointment
appointment = Appointment(
    booking_id=booking_id,
    clinic_id=data['clinic_id'],
    doctor_id=data['doctor_id'],
    patient_id=data['patient_id'],
    service_id=data['service_id'],
    start_time=start_time,
    end_time=end_time,
    booking_source=BookingSource[data['booking_source'].upper()],
    created_by=current_user.id,
    notes=data.get('notes')
)

db.session.add(appointment)
db.session.flush()  # Get appointment.id
```

### Phase 3: Create Visit (AUTOMATIC)

**Lines 139-160:**
```python
# Get next queue number for the clinic on this date
max_queue = db.session.query(func.max(Visit.queue_number)).filter(
    Visit.clinic_id == data['clinic_id'],
    func.date(Visit.created_at) == start_time.date()
).scalar() or 0

visit = Visit(
    appointment_id=appointment.id,
    doctor_id=data['doctor_id'],
    patient_id=data['patient_id'],
    service_id=data['service_id'],
    clinic_id=data['clinic_id'],
    check_in_time=start_time,  # Set check-in time to appointment time
    visit_type=VisitType.SCHEDULED,
    queue_number=max_queue + 1,
    status=VisitStatus.WAITING
)

db.session.add(visit)
db.session.flush()  # Get visit.id
```

### Phase 4: Create Payment (AUTOMATIC)

**Lines 162-179:**
```python
doctor = Doctor.query.get(data['doctor_id'])
doctor_share = float(service.price) * doctor.share_percentage
center_share = float(service.price) - doctor_share

payment = Payment(
    visit_id=visit.id,
    patient_id=data['patient_id'],
    total_amount=float(service.price),
    amount_paid=0.0,  # No payment made yet
    payment_method=PaymentMethod.CASH,  # Default method
    doctor_share=doctor_share,
    center_share=center_share,
    status=PaymentStatus.PENDING
)

db.session.add(payment)
db.session.commit()  # ALL THREE SAVED TOGETHER
```

### Phase 5: Real-time Updates

**Lines 181-198:**
```python
from app import socketio
from app.services.queue_service import QueueService

# Emit appointment created event
appointment_data = {
    'appointment': appointment.to_dict(),
    'visit': visit.to_dict(),
    'clinic_id': appointment.clinic_id,
    'doctor_id': appointment.doctor_id
}
socketio.emit('appointment_created', appointment_data, room=f'clinic_{appointment.clinic_id}')
socketio.emit('appointment_created', appointment_data, room=f'doctor_{appointment.doctor_id}')

# Emit queue update for the clinic
queue_service = QueueService()
queue_data = queue_service.get_clinic_queue(appointment.clinic_id)
socketio.emit('queue_updated', queue_data, room=f'clinic_{appointment.clinic_id}')
```

### Phase 6: Cache Invalidation

**Lines 200-201:**
```python
cache.delete_memoized(get_appointments)
```

### Phase 7: Return Response

**Lines 223-226:**
```python
return jsonify({
    'message': 'Appointment created successfully',
    'appointment': appointment.to_dict()
}), 201
```

---

## Frontend Response Handling

**File:** `BookingWizard.jsx` (lines 141-149)

```javascript
const createAppointmentMutation = useMutation({
  mutationFn: (data) => appointmentsApi.createAppointment(data),
  onSuccess: (response) => {
    queryClient.invalidateQueries(['appointments'])
    queryClient.invalidateQueries(['dashboard-stats'])
    onSuccess?.(response.data)
    handleClose()
  }
})
```

**What Happens:**
1. `queryClient.invalidateQueries(['appointments'])` - Marks appointments query stale
2. `queryClient.invalidateQueries(['dashboard-stats'])` - Marks stats query stale
3. `onSuccess` callback fires (if provided)
4. Modal closes (`handleClose()`)

---

## SocketIO Real-time Update Flow

### ReceptionDashboard Listens

**File:** `ReceptionDashboard.jsx` (lines 84-87)

```javascript
socket.on('appointment_created', (data) => {
  console.log('Appointment created:', data)
  debouncedRefetch('appointment_created', data)
})
```

### Debounced Refetch

**Lines 44-60:**

```javascript
const debouncedRefetch = useCallback((eventType, data) => {
  pendingEventsRef.current.add(eventType)
  
  if (debounceTimeoutRef.current) {
    clearTimeout(debounceTimeoutRef.current)
  }
  
  debounceTimeoutRef.current = setTimeout(() => {
    console.log(`Batched refetch triggered by events: ${Array.from(pendingEventsRef.current).join(', ')}`)
    pendingEventsRef.current.clear()
    setLastUpdateTime(new Date().toLocaleTimeString())
    refetch()  // Refetches dashboard stats
  }, 500)
}, [refetch])
```

### UI Update

Dashboard stats query refetches and updates:
- Today's appointments count
- Waiting patients count
- Outstanding invoices count

---

## Expected Results After Creation

### Database Records Created:
1. ✅ 1 Appointment record (status: CONFIRMED)
2. ✅ 1 Visit record (status: WAITING)
3. ✅ 1 Payment record (status: PENDING)

### UI Updates:
1. ✅ Appointment appears in Appointments page
2. ✅ Patient appears in Patients page (if new)
3. ✅ Payment appears in Payments page
4. ✅ Today's appointments counter increments
5. ✅ Waiting patients counter increments
6. ✅ Dashboard stats refresh

### SocketIO Events Emitted:
1. ✅ `appointment_created` (to clinic and doctor rooms)
2. ✅ `queue_updated` (to clinic and doctor rooms)

---

## Potential Failure Points

### 1. Validation Failure
- Invalid time slot → Returns 400 error
- Doctor not available → Returns 400 error
- Missing required fields → Returns 400 error

### 2. Database Transaction Failure
- If ANY of the 3 records fail to save, ALL changes are rolled back
- Exception caught in try/except (lines 228-234)
- Returns 500 error with traceback

### 3. SocketIO Failure
- If socket emit fails, appointment still saves
- Error logged but doesn't block transaction

### 4. Frontend Handling
- If mutation fails, error state shown
- If onSuccess callback errors, modal may not close
- If query invalidation fails, UI may not update

---

## Testing This Flow

1. Open Reception Dashboard
2. Click "حجز جديد" button
3. Fill all 5 steps
4. Click "Confirm Booking"
5. Verify:
   - Modal closes
   - Appointment appears in Appointments list
   - Counter updates
   - SocketIO events logged in console
   - No errors in Network tab

**Network Tab Verification:**
- `POST /appointments` → 201 Created
- Response includes: { message, appointment: {...} }
- SocketIO: Check WebSocket messages

**Console Verification:**
- "Appointment created: ..." logged
- No error messages

---

## Critical Success Criteria

✅ **Appointment Record** saved with correct data  
✅ **Visit Record** created automatically  
✅ **Payment Record** created automatically  
✅ **All 3 records** are part of the same transaction  
✅ **SocketIO events** emitted successfully  
✅ **Frontend UI** updates without refresh  
✅ **Counters** reflect true database state

