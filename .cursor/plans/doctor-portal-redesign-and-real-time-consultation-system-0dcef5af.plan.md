<!-- 0dcef5af-2d59-4d5a-86b8-afccdedd0ad9 fc4af178-3f84-43a5-a373-6e78c3dbd901 -->
# Doctor Portal Redesign and Real-Time Consultation System

## Project Context

This is a Medical CRM system built with:

- **Frontend**: React (with TanStack Query for state management, SocketIO for real-time updates)
- **Backend**: Flask (with SQLAlchemy ORM, Flask-JWT-Extended for auth, Flask-SocketIO for real-time)
- **Database**: PostgreSQL with relationships between Users, Doctors, Patients, Visits, Appointments, Payments, Services, Clinics

### Current Architecture

**User Roles**:

- ADMIN: Full access
- RECEPTIONIST: Can manage appointments, check-ins, queue, payments
- DOCTOR: Currently limited dashboard with basic queue view

**Key Models**:

- `User`: Authentication (linked to `Doctor` via `user_id`)
- `Doctor`: Doctor profiles with schedules (`DoctorSchedule` table for hour-by-hour availability)
- `Patient`: Patient information
- `Appointment`: Scheduled appointments (CONFIRMED → CHECKED_IN → COMPLETED)
- `Visit`: Actual patient visits linked to appointments (WAITING → CALLED → IN_PROGRESS → COMPLETED)
- `Payment`: Payments with `doctor_share` and `center_share` calculations
- `Service`: Services offered by clinics

**Real-Time System**:

- SocketIO rooms: `clinic_{clinic_id}` for receptionists, `doctor_{doctor_id}` for doctors
- Events: `queue_updated`, `new_checkin`, `visit_status_changed`, `appointment_created/updated/cancelled`, `payment_processed`
- Doctor rooms currently use `doctor_id` from `Doctor` model (not `user_id`)

**Current Flow**:

1. Receptionist creates appointment → `Visit` created with `WAITING` status
2. Receptionist moves visit to phases: "Waiting" → "With Doctor" → "Completed"
3. Phase movement uses `/queue/phase/move` endpoint which updates `Visit.status` and emits SocketIO events

## Requirements

1. **Real-Time Consultation System**:

- When receptionist moves visit from "Waiting" to "With Doctor" phase, patient data is automatically pushed to doctor's page
- Doctor sees patient card/panel with full details
- Doctor can click patient to open full-page consultation view
- Doctor must confirm completion (receptionist cannot complete consultations)

2. **Doctor Portal Sections**:

- **Today's Work**: Main landing showing current queue, active consultations, today's stats
- **My Earnings**: Financial transparency showing ALL payments (pending, paid, refunded) with filters
- **My Patients**: Patient history showing only visits with THIS doctor, searchable, with visit details
- **Schedule**: List view of upcoming appointments

3. **Compatibility**:

- Everything must sync between doctor and receptionist pages
- No breaking changes to existing functionality
- All SocketIO events must continue working
- Database schema changes must be backwards compatible

## Implementation Plan

### Phase 1: Backend - Real-Time Consultation System

#### 1.1 Update Queue Route for Consultation Pushing

**File**: `backend/app/routes/queue.py`

- **Modify `/queue/phase/move` endpoint** (around line 650-750):
- When `new_status == 'in_progress'` AND visit moves to "with_doctor" phase:
- Emit new SocketIO event: `patient_with_doctor` to doctor room
- Event payload: `{ visit: visit.to_dict(), patient: visit.patient.to_dict(), visit_history: [...] }`
- Include previous visits with THIS doctor only (filter `Visit.query.filter(Visit.doctor_id == doctor_id, Visit.patient_id == patient_id).order_by(Visit.created_at.desc()).limit(10)`)

- **Add new endpoint `/queue/complete-consultation`** (doctor-only):
- `@doctor_required` decorator
- Accepts: `visit_id`, `notes` (optional)
- Validates: doctor owns the visit (`visit.doctor_id == doctor.id`)
- Updates: `visit.status = COMPLETED`, `visit.end_time = datetime.utcnow()`
- Updates appointment if exists: `appointment.status = COMPLETED`
- Emits: `queue_updated` to both clinic and doctor rooms
- Emits: `consultation_completed` event
- Returns: updated visit data

- **Modify existing `/queue/complete` endpoint**:
- Change from `@receptionist_required` to `@doctor_required`
- OR create separate endpoint and keep old one for backwards compatibility
- Add validation: Only doctors can complete consultations

#### 1.2 Patient History Endpoint

**File**: `backend/app/routes/patients.py` (or create `backend/app/routes/visits.py` extension)

- **Add endpoint `/patients/<int:patient_id>/history/<int:doctor_id>`**:
- `@doctor_required`
- Validates: current doctor owns the `doctor_id`
- Returns: List of visits with this patient AND this doctor
- Includes: visit details, payment status, prescriptions, appointment links
- Ordered by `created_at DESC`

#### 1.3 Doctor Dashboard Stats Enhancement

**File**: `backend/app/routes/dashboard.py`

- **Enhance `get_doctor_stats` function** (around line 167-228):
- Add: `active_consultations` count (IN_PROGRESS visits)
- Add: `today_revenue` breakdown by status (pending, paid, refunded)
- Add: `upcoming_appointments` count (next 7 days)

- **Add endpoint `/dashboard/doctor/appointments`**:
- `@doctor_required`
- Returns: Upcoming appointments for the logged-in doctor
- Query: `Appointment.query.filter(Appointment.doctor_id == doctor.id, Appointment.start_time >= today, Appointment.status.in_([CONFIRMED, CHECKED_IN])).order_by(Appointment.start_time.asc())`
- Include: patient data, service data, appointment details

#### 1.4 Doctor Earnings Endpoint

**File**: `backend/app/routes/payments.py` (or create `backend/app/routes/doctors.py` earnings section)

- **Add endpoint `/doctors/earnings`**:
- `@doctor_required`
- Query all payments where `Payment.visit.has(Visit.doctor_id == doctor.id)`
- Include filters: date range, status (pending/paid/refunded), payment method
- Calculate: total earnings (paid), pending earnings, refunded amount
- Group by: date, status for charts/graphs
- Return: paginated results with summary stats

#### 1.5 SocketIO Event Enhancement

**File**: `backend/app/socketio_handlers/queue_events.py`

- **Add handler for `patient_with_doctor` event emission**:
- Already handled in route, but ensure room name is correct: `doctor_{doctor.id}` (not `doctor_{user.id}`)
- Fix `handle_join_doctor_room` to use actual `doctor.id` from `Doctor` model lookup

### Phase 2: Frontend - Doctor Dashboard Redesign

#### 2.1 Doctor Dashboard Structure

**File**: `frontend/src/pages/DoctorDashboard.jsx`

**Complete restructure**:

- Replace single-tab layout with 4 main sections using tab navigation
- Sections: "Today's Work", "My Earnings", "My Patients", "Schedule"
- Keep existing SocketIO connection logic
- Keep existing stats fetching but enhance display

**State Management**:

- `activeSection`: 'today' | 'earnings' | 'patients' | 'schedule'
- `activeConsultation`: `{ visitId, patientId } | null` (for full-page consultation view)
- `consultationPatient`: Patient data received from SocketIO event

**SocketIO Listeners** (already exists, enhance):

- Listen for `patient_with_doctor` event:
- Update state with patient data
- Show notification/toast
- Optionally auto-navigate to consultation view

#### 2.2 Today's Work Section

**File**: `frontend/src/pages/DoctorDashboard.jsx` (inline or separate component)

**Layout**:

- Stats cards: Today's visits, Active consultations, Waiting, Completed
- Active consultations list: Show IN_PROGRESS visits with patient cards
- Queue preview: Show next 3 waiting patients
- Quick actions: Click patient to start consultation

**Patient Cards**:

- Display: Patient name, phone, service, queue number, check-in time
- Action button: "Start Consultation" → Opens full-page view
- If patient pushed via SocketIO: Highlight with indicator

**Real-Time Updates**:

- Listen for `queue_updated` events
- Auto-refresh when receptionist moves patients
- Debounce updates (already implemented)

#### 2.3 Consultation View (Full-Page)

**New File**: `frontend/src/components/ConsultationView.jsx`

**Layout**:

- Full-page view that replaces dashboard content
- Back button to return to dashboard
- Patient info panel (top): Name, phone, age, gender, medical history
- Previous visits section: List of visits with THIS doctor only
- Current visit info: Service, appointment time, check-in time, notes
- Action buttons: "Complete Consultation", "Add Notes", "View Prescription"

**Data Fetching**:

- Fetch patient details: `GET /patients/{patient_id}`
- Fetch visit history: `GET /patients/{patient_id}/history/{doctor_id}`
- Fetch current visit: `GET /visits/{visit_id}` (with relationships)

**Actions**:

- Complete consultation: `POST /queue/complete-consultation` with notes
- On success: Navigate back to dashboard, show success message
- Emit SocketIO event for real-time sync

#### 2.4 My Earnings Section

**File**: `frontend/src/components/DoctorEarnings.jsx` (new component)

**Layout**:

- Summary cards: Total earnings (paid), Pending earnings, Refunded amount, This month
- Filters: Date range picker, Status filter (all/pending/paid/refunded), Payment method
- Table/List: All payments with columns:
- Date, Patient name, Service, Total amount, Doctor share, Status, Payment method
- Grouping: Option to group by date
- Export: Optional CSV/PDF export (future enhancement)

**Data Fetching**:

- `useQuery` with key `['doctor-earnings', filters]`
- API endpoint: `GET /doctors/earnings?start_date=...&end_date=...&status=...`
- Real-time updates: Listen for `payment_processed` events

#### 2.5 My Patients Section

**File**: `frontend/src/components/DoctorPatients.jsx` (new component)

**Layout**:

- Search bar: Search by patient name, phone
- Patient list: Show all unique patients who visited this doctor
- Each patient card: Name, phone, last visit date, total visits count
- Click patient: Show detailed view with all visits
- Visit details: Date, service, status, payment status, link to full visit record

**Data Fetching**:

- Query: Get all visits for this doctor, group by patient
- Or: Create endpoint `GET /doctors/patients` that returns unique patients with visit counts
- For patient detail: Use existing `/patients/{patient_id}/history/{doctor_id}`

**Real-Time Updates**:

- Listen for `visit_status_changed` to update patient visit statuses
- Refresh when new visits are created

#### 2.6 Schedule Section

**File**: `frontend/src/components/DoctorSchedule.jsx` (new component)

**Layout**:

- List view of upcoming appointments (next 30 days default)
- Each appointment card:
- Date and time, Patient name, Service, Status (CONFIRMED/CHECKED_IN)
- Actions: View details, Cancel (if allowed)
- Filters: Date range, Status filter
- Empty state: "No upcoming appointments"

**Data Fetching**:

- API: `GET /dashboard/doctor/appointments`
- Query key: `['doctor-appointments', dateRange]`
- Refresh interval: 60 seconds (appointments don't change frequently)

**Real-Time Updates**:

- Listen for `appointment_created`, `appointment_updated`, `appointment_cancelled`
- Auto-refresh list when appointments change

### Phase 3: API Client Updates

#### 3.1 Queue API

**File**: `frontend/src/api/queue.js`

**Add methods**:

- `completeConsultation(visitId, notes)`: POST to `/queue/complete-consultation`
- `getPatientHistory(patientId, doctorId)`: GET `/patients/{patientId}/history/{doctorId}`

#### 3.2 Doctor API

**File**: `frontend/src/api/doctors.js` (new or existing)

**Add methods**:

- `getEarnings(filters)`: GET `/doctors/earnings` with query params
- `getAppointments(dateRange)`: GET `/dashboard/doctor/appointments`
- `getPatients()`: GET `/doctors/patients` (returns unique patients)

#### 3.3 Patient API

**File**: `frontend/src/api/patients.js` (new or existing)

**Add methods**:

- `getPatientHistory(patientId, doctorId)`: GET `/patients/{patientId}/history/{doctorId}`

### Phase 4: SocketIO Integration

#### 4.1 SocketIO Hook Enhancement

**File**: `frontend/src/hooks/useSocket.js`

**Add listeners** (in DoctorDashboard):

- `socket.on('patient_with_doctor', (data) => { ... })`:
- Update consultation state
- Show notification
- Optionally navigate to consultation view
- Store patient data in state

#### 4.2 Doctor Room Joining Fix

**File**: `frontend/src/pages/DoctorDashboard.jsx`

**Fix doctor room joining**:

- Current: Uses `user.id` as `doctor_id`
- Should use: Actual `doctor.id` from doctor profile
- Fetch doctor profile on mount: `GET /doctors?user_id={user.id}`
- Use `doctor.id` for SocketIO room: `socket.emit('join_doctor_room', { doctor_id: doctor.id })`

**Backend**: Ensure `handle_join_doctor_room` accepts `doctor_id` and validates it matches the logged-in user's doctor profile

### Phase 5: Database and Model Enhancements

#### 5.1 Visit Model Enhancement

**File**: `backend/app/models/visit.py`

**No schema changes needed** (already has all required fields):

- `doctor_id`, `patient_id`, `status`, `check_in_time`, `start_time`, `end_time`
- `to_dict()` method already exists

**Enhance `to_dict()`** (optional):

- Include related patient data if not already included
- Include service data
- Include appointment data if exists

#### 5.2 Payment Model Enhancement

**File**: `backend/app/models/payment.py`

**No schema changes needed**:

- Already has: `doctor_share`, `status`, `paid_at`, relationships

**Ensure relationships**:

- `Payment.visit` relationship exists (backref from Visit model)
- Can query: `Payment.query.join(Visit).filter(Visit.doctor_id == doctor_id)`

#### 5.3 Doctor Model

**File**: `backend/app/models/doctor.py`

**No changes needed**:

- Already linked to User via `user_id`
- Relationships to visits, appointments exist

### Phase 6: Testing and Compatibility

#### 6.1 Backwards Compatibility

- Keep existing `/queue/complete` endpoint (if used by receptionist for other purposes)
- Ensure all existing SocketIO events continue to work
- Receptionist dashboard should continue working as-is
- No breaking changes to existing API responses

#### 6.2 Error Handling

- Add validation: Doctor can only access their own data
- Add validation: Doctor can only complete their own consultations
- Handle edge cases: Visit deleted, patient deleted, etc.
- Graceful degradation if SocketIO disconnects

#### 6.3 Performance

- Use `joinedload` for eager loading in queries
- Paginate earnings and patient history queries
- Cache doctor stats (already implemented)
- Debounce SocketIO event handlers (already implemented)

## File Structure Summary

### Backend Files to Modify:

1. `backend/app/routes/queue.py`: Add doctor-only completion endpoint, enhance phase move
2. `backend/app/routes/dashboard.py`: Enhance doctor stats, add appointments endpoint
3. `backend/app/routes/payments.py`: Add earnings endpoint (or create doctors.py)
4. `backend/app/routes/patients.py`: Add history endpoint (or visits.py)
5. `backend/app/socketio_handlers/queue_events.py`: Verify doctor room logic

### Backend Files to Create:

1. `backend/app/routes/doctors.py`: Add earnings and patients endpoints (or extend existing)

### Frontend Files to Modify:

1. `frontend/src/pages/DoctorDashboard.jsx`: Complete restructure with 4 sections
2. `frontend/src/hooks/useSocket.js`: Add patient_with_doctor listener

### Frontend Files to Create:

1. `frontend/src/components/ConsultationView.jsx`: Full-page consultation interface
2. `frontend/src/components/DoctorEarnings.jsx`: Earnings section component
3. `frontend/src/components/DoctorPatients.jsx`: Patients section component
4. `frontend/src/components/DoctorSchedule.jsx`: Schedule section component

### Frontend Files to Update:

1. `frontend/src/api/queue.js`: Add completeConsultation method
2. `frontend/src/api/doctors.js`: Add earnings, appointments, patients methods
3. `frontend/src/api/patients.js`: Add history method

## Critical Implementation Notes

1. **Doctor ID Resolution**: Always use `Doctor.id` from database lookup, not `User.id`. The `doctor_id` in SocketIO rooms and queries must be the actual doctor record ID.

2. **Real-Time Sync**: Ensure all state changes emit SocketIO events to both `clinic_{clinic_id}` and `doctor_{doctor_id}` rooms for full synchronization.

3. **Permission Boundaries**: Doctors can only:

- View their own visits/appointments
- Complete their own consultations
- View their own earnings
- View patients who visited them

4. **Data Consistency**: Use database transactions for visit status changes. Ensure appointment and visit statuses stay in sync.

5. **Backwards Compatibility**: All existing receptionist functionality must continue working. The new doctor endpoints are additive, not replacements.

6. **Error Handling**: Add comprehensive error handling for:

- Doctor not found (user has no doctor profile)
- Visit not found or not owned by doctor
- SocketIO disconnections
- API failures

## Testing Checklist

- [ ] Doctor can view Today's Work with real-time updates
- [ ] Receptionist moving visit to "with_doctor" triggers patient push to doctor
- [ ] Doctor can click patient and view full consultation interface
- [ ] Doctor can complete consultation (receptionist cannot)
- [ ] Doctor earnings show all payments with correct filtering
- [ ] Doctor patients list shows only visits with this doctor
- [ ] Doctor schedule shows upcoming appointments
- [ ] All SocketIO events sync between doctor and receptionist pages
- [ ] No breaking changes to existing receptionist functionality
- [ ] Permission checks prevent unauthorized access

### To-dos

- [ ] Update queue.py: Add doctor-only completion endpoint, enhance phase move to emit patient_with_doctor event
- [ ] Create patient history endpoint: GET /patients/<patient_id>/history/<doctor_id> with doctor validation
- [ ] Enhance dashboard.py: Add active_consultations count, revenue breakdown, appointments endpoint
- [ ] Create doctor earnings endpoint: GET /doctors/earnings with filters (date, status, payment_method)
- [ ] Fix socketio_handlers: Ensure doctor room uses actual doctor.id, not user.id
- [ ] Restructure DoctorDashboard.jsx: Implement 4-section tab navigation (Today, Earnings, Patients, Schedule)
- [ ] Create ConsultationView.jsx: Full-page consultation interface with patient details and previous visits
- [ ] Create DoctorEarnings.jsx: Earnings section with filters, summary cards, payment list
- [ ] Create DoctorPatients.jsx: Patients section with search, patient list, visit history
- [ ] Create DoctorSchedule.jsx: Schedule section with list view of upcoming appointments
- [ ] Update API clients: Add completeConsultation, getEarnings, getAppointments, getPatientHistory methods
- [ ] Enhance useSocket hook: Add patient_with_doctor listener, fix doctor room joining logic
- [ ] Test real-time synchronization: Verify all SocketIO events sync between doctor and receptionist pages
- [ ] Test permission boundaries: Verify doctors can only access their own data and complete own consultations
- [ ] Test backwards compatibility: Ensure no breaking changes to existing receptionist functionality