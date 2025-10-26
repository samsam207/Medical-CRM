# Frontend Components Map - Reception Area

**Generated:** 2025-10-26  
**Status:** PHASE 1 - Code Study

## Reception Components Overview

### Main Pages

**ReceptionDashboard** (`frontend/src/pages/ReceptionDashboard.jsx`)
- Main reception area
- Tabs: Overview, Queue Management
- Real-time updates via SocketIO
- Stats: appointments, waiting patients, pending payments, alerts
- Quick actions: New appointment, Patients, Appointments, Payments

**PatientsListPage** (`frontend/src/pages/PatientsListPage.jsx`)
- Search patients by name/phone
- Create/Edit/Delete patients
- Gender filter
- View patient details modal

**AppointmentsPage** (`frontend/src/pages/AppointmentsPage.jsx`)
- List appointments by date
- Search appointments
- Filter by status
- View/Edit/Cancel appointments
- Create new appointment via BookingWizard

**PaymentsPage** (`frontend/src/pages/PaymentsPage.jsx`)
- List payments with filters
- Process payments
- Refund payments
- View payment details

### Key Components

**BookingWizard** (`frontend/src/components/BookingWizard.jsx`)
- 5-step appointment creation wizard
- Step 1: Select Clinic
- Step 2: Select Doctor
- Step 3: Select/Create Patient
- Step 4: Select Service & Time
- Step 5: Confirm
- Uses React Query for API calls

**QueueManagement** (`frontend/src/components/QueueManagement.jsx`)
- 4-column Kanban view
- Phases: Appointments Today, Waiting, With Doctor, Completed
- Drag-and-drop reordering
- Search and filter
- Real-time updates via SocketIO

**WalkInModal** (`frontend/src/components/WalkInModal.jsx`)
- Create walk-in visit
- Select patient, clinic, doctor, service
- Quick patient creation

---

## State Management

### React Query

**Query Keys Used:**
- `['dashboard-stats']` - Reception dashboard statistics
- `['appointments']` - List of appointments
- `['patients']` - List of patients
- `['payments']` - List of payments
- `['queue-phases', clinic, date]` - Queue data organized by phases
- `['clinics']` - List of clinics
- `['doctors', clinic_id]` - Doctors for a clinic
- `['services', clinic_id]` - Services for a clinic

**Mutation Pattern:**
```javascript
const mutation = useMutation({
  mutationFn: (data) => api.createSomething(data),
  onSuccess: () => {
    queryClient.invalidateQueries(['key'])
  }
})
```

**Auto-refetch:**
- Dashboard stats: every 30 seconds
- Queue phases: every 30 seconds

---

### Zustand Stores

**authStore** (`frontend/src/stores/authStore.js`)
- User authentication state
- Token management
- Login/logout

**queueStore** (`frontend/src/stores/queueStore.js`)
- Selected clinic state
- Queue-related state

**notificationStore** (`frontend/src/stores/notificationStore.js`)
- Notifications/alerts

---

## API Clients

**Location:** `frontend/src/api/`

**appointments.js:**
- getAppointments()
- getAppointment(id)
- createAppointment(data)
- updateAppointment(id, data)
- cancelAppointment(id)
- getAvailableSlots(params)

**patients.js:**
- getPatients(params)
- getPatient(id)
- createPatient(data)
- updatePatient(id, data)
- deletePatient(id)
- searchPatients(query)

**payments.js:**
- getPayments(params)
- getPayment(id)
- processExistingPayment(id, data)
- refundPayment(id)

**queue.js:**
- getQueuePhases(clinicId, date)
- getClinicQueue(clinicId)
- getDoctorQueue(doctorId)
- movePatientPhase(visitId, from, to)
- createWalkIn(data)
- checkIn(appointmentId)
- callPatient(visitId)
- startConsultation(visitId)
- completeConsultation(visitId)

---

## SocketIO Integration

**Hook:** `useSocket` (`frontend/src/hooks/useSocket.js`)

**Usage in ReceptionDashboard:**
```javascript
const { socket, isConnected, connectionError, reconnect, 
        joinQueueRoom, leaveQueueRoom } = useSocket()
```

**Events Listened To:**
- queue_updated
- new_checkin
- visit_status_changed
- appointment_created
- appointment_updated
- appointment_cancelled
- patient_created
- patient_updated
- payment_processed

**Debounce Strategy:**
- 500ms delay
- Batches multiple events
- Single refetch per batch

---

## Key Features

### Real-time Updates
- SocketIO connection status indicator
- Auto-reconnect on disconnect
- Debounced refetch to prevent spam
- Last update timestamp displayed

### Search & Filter
- All pages support search
- Patients: by name/phone
- Appointments: by patient/doctor/clinic
- Payments: by patient/payment ID

### Modals
- BookingWizard (5 steps)
- View/Edit/Delete modals
- WalkInModal
- Payment processing modals

### Pagination
- All list pages support pagination
- React Query handles cache

---

## Form Validation

**Location:** `frontend/src/utils/validation.js`

**Common Rules:**
- Name: required, min length
- Phone: required, valid format
- Age: numeric, valid range
- Email: valid format (if used)

**Validation in BookingWizard:**
- Step-by-step validation
- Cannot proceed until current step valid
- Error messages per field

---

## Critical Frontend Flows

### Create Appointment Flow:
1. User clicks "حجز جديد"
2. BookingWizard modal opens
3. User fills 5 steps
4. On step 5 confirmation:
   - `createAppointmentMutation.mutate(formData)`
   - POST /appointments
   - onSuccess: invalidate queries, close modal
   - SocketIO events trigger dashboard refresh

### Create Patient Flow:
1. User clicks "New Patient" or creates in wizard
2. Modal opens with form
3. User fills patient data
4. `createPatientMutation.mutate(patientData)`
5. POST /patients
6. onSuccess: invalidate patients query, close modal

### Queue Management Flow:
1. Open Queue Management tab
2. Fetch queue phases data
3. Display in 4 columns
4. User drags patient between columns
5. `movePatientMutation.mutate({ visitId, fromPhase, toPhase })`
6. POST /queue/phases/move
7. onSuccess: refresh queue data

---

## Known Frontend Issues

1. **BookingWizard Clinic Selection:** Logs show potential type mismatch
2. **SocketIO Disconnection:** Auto-reconnect may fail silently
3. **Debounce:** 500ms may be too short for rapid operations
4. **Cache Invalidation:** Some mutations don't invalidate all related queries

---

## Testing Frontend

**Chrome DevTools:**
- Console: React Query logs, SocketIO events
- Network: API calls, WebSocket messages
- React DevTools: Component state

**Test Scenarios:**
1. Create appointment → verify all 3 pages update
2. Create patient → verify appears in Patients page
3. Move patient in queue → verify real-time update
4. Process payment → verify payment status updates

