# API Routes Map

## Appointments API (`/api/appointments`)

### GET `/api/appointments`
- **Purpose**: Get appointments with optional filters
- **Auth**: JWT required
- **Query Params**: clinic_id, doctor_id, patient_id, date, status, page, per_page
- **Response**: Paginated list of appointments
- **Cache**: 5 minutes
- **Real-time**: None

### GET `/api/appointments/<int:appointment_id>`
- **Purpose**: Get specific appointment by ID
- **Auth**: JWT required
- **Response**: Single appointment object
- **Real-time**: None

### POST `/api/appointments`
- **Purpose**: Create new appointment
- **Auth**: Receptionist required
- **Payload**: clinic_id, doctor_id, patient_id, service_id, start_time, booking_source, notes
- **Response**: Created appointment with visit and payment
- **Real-time Events**:
  - `appointment_created` → clinic_{clinic_id}, doctor_{doctor_id}
  - `queue_updated` → clinic_{clinic_id}
- **DB Changes**: Creates appointment, visit, payment records

### PUT `/api/appointments/<int:appointment_id>`
- **Purpose**: Update appointment
- **Auth**: Receptionist required
- **Payload**: start_time, status, notes
- **Response**: Updated appointment
- **Real-time Events**:
  - `appointment_updated` → clinic_{clinic_id}, doctor_{doctor_id}
  - `queue_updated` → clinic_{clinic_id}
- **DB Changes**: Updates appointment fields

### DELETE `/api/appointments/<int:appointment_id>`
- **Purpose**: Cancel appointment
- **Auth**: Receptionist required
- **Response**: Success message
- **Real-time Events**:
  - `appointment_cancelled` → clinic_{clinic_id}, doctor_{doctor_id}
  - `queue_updated` → clinic_{clinic_id}
- **DB Changes**: Updates appointment status to CANCELLED

### GET `/api/appointments/available-slots`
- **Purpose**: Get available time slots for booking
- **Auth**: JWT required
- **Query Params**: clinic_id, doctor_id, date
- **Response**: Available slots with doctor info
- **Real-time**: None

## Visits API (`/api/visits`)

### GET `/api/visits`
- **Purpose**: Get visits with optional filters
- **Auth**: JWT required
- **Query Params**: clinic_id, doctor_id, patient_id, status, visit_type, date, page, per_page
- **Response**: Paginated list of visits
- **Real-time**: None

### POST `/api/visits/check-in`
- **Purpose**: Check in patient for appointment
- **Auth**: Receptionist required
- **Payload**: appointment_id
- **Response**: Visit object with queue number
- **Real-time Events**:
  - `queue_updated` → clinic_{clinic_id}
- **DB Changes**: Creates visit, updates appointment status

### POST `/api/visits/walk-in`
- **Purpose**: Create walk-in visit
- **Auth**: Receptionist required
- **Payload**: patient_id, clinic_id, service_id, doctor_id
- **Response**: Visit object with queue number
- **Real-time Events**:
  - `queue_updated` → clinic_{clinic_id}
- **DB Changes**: Creates visit record

### GET `/api/visits/queue`
- **Purpose**: Get live queue for clinic
- **Auth**: JWT required
- **Query Params**: clinic_id or doctor_id
- **Response**: Queue data
- **Real-time**: None

### GET `/api/visits/<int:visit_id>`
- **Purpose**: Get visit details
- **Auth**: JWT required
- **Response**: Single visit object
- **Real-time**: None

### PUT `/api/visits/<int:visit_id>/status`
- **Purpose**: Update visit status
- **Auth**: Doctor required
- **Payload**: status
- **Response**: Updated visit
- **Real-time Events**:
  - `queue_updated` → clinic_{clinic_id}, doctor_{doctor_id}
  - `visit_status_changed` → clinic_{clinic_id}, doctor_{doctor_id}
- **DB Changes**: Updates visit status and timestamps

### POST `/api/visits/<int:visit_id>/call`
- **Purpose**: Call next patient in queue
- **Auth**: Doctor required
- **Response**: Updated visit
- **Real-time Events**:
  - `queue_updated` → clinic_{clinic_id}, doctor_{doctor_id}
  - `visit_status_changed` → clinic_{clinic_id}, doctor_{doctor_id}
- **DB Changes**: Updates visit status to CALLED

## Payments API (`/api/payments`)

### GET `/api/payments`
- **Purpose**: Get payments with optional filters
- **Auth**: JWT required
- **Query Params**: patient_id, status, start_date, end_date, page, per_page
- **Response**: Paginated list of payments
- **Real-time**: None

### GET `/api/payments/<int:payment_id>`
- **Purpose**: Get payment details
- **Auth**: JWT required
- **Response**: Single payment object
- **Real-time**: None

### PUT `/api/payments/<int:payment_id>/process`
- **Purpose**: Process existing pending payment
- **Auth**: Receptionist required
- **Payload**: amount_paid, payment_method
- **Response**: Updated payment
- **Real-time Events**:
  - `payment_processed` → broadcast
  - `queue_updated` → clinic_{clinic_id}, doctor_{doctor_id}
- **DB Changes**: Updates payment status, visit status

### POST `/api/payments`
- **Purpose**: Process payment for visit
- **Auth**: Receptionist required
- **Payload**: visit_id, payment_method, amount_paid
- **Response**: Payment with invoice data
- **Real-time**: None
- **DB Changes**: Creates/updates payment, updates visit status

### GET `/api/payments/invoice/<int:visit_id>`
- **Purpose**: Generate printable invoice for visit
- **Auth**: JWT required
- **Response**: Invoice data
- **Real-time**: None

### POST `/api/payments/refund/<int:payment_id>`
- **Purpose**: Refund payment
- **Auth**: Receptionist required
- **Response**: Updated payment
- **Real-time**: None
- **DB Changes**: Updates payment status, visit status

## Patients API (`/api/patients`)

### GET `/api/patients`
- **Purpose**: Search patients by phone or name
- **Auth**: JWT required
- **Query Params**: phone, name, page, per_page
- **Response**: Paginated list of patients
- **Cache**: 5 minutes
- **Real-time**: None

### GET `/api/patients/<int:patient_id>`
- **Purpose**: Get patient details with history
- **Auth**: JWT required
- **Response**: Patient with recent appointments and visits
- **Real-time**: None

### POST `/api/patients`
- **Purpose**: Create new patient
- **Auth**: Receptionist required
- **Payload**: name, phone, address, age, gender, medical_history
- **Response**: Created patient
- **Real-time Events**:
  - `patient_created` → broadcast
- **DB Changes**: Creates patient record

### DELETE `/api/patients/<int:patient_id>`
- **Purpose**: Delete patient
- **Auth**: Receptionist required
- **Response**: Success message
- **Real-time**: None
- **DB Changes**: Deletes patient (if no appointments/visits)

### PUT `/api/patients/<int:patient_id>`
- **Purpose**: Update patient information
- **Auth**: Receptionist required
- **Payload**: name, phone, address, age, gender, medical_history
- **Response**: Updated patient
- **Real-time Events**:
  - `patient_updated` → broadcast
- **DB Changes**: Updates patient fields

### GET `/api/patients/search`
- **Purpose**: Quick patient search for booking
- **Auth**: JWT required
- **Query Params**: q (search query)
- **Response**: List of matching patients
- **Real-time**: None

## Queue API (`/api/queue`)

### GET `/api/queue/clinic/<int:clinic_id>`
- **Purpose**: Get queue for specific clinic
- **Auth**: JWT required (role-based access)
- **Response**: Clinic queue data
- **Real-time**: None

### GET `/api/queue/doctor/<int:user_id>`
- **Purpose**: Get queue for specific doctor
- **Auth**: JWT required (role-based access)
- **Response**: Doctor queue data
- **Real-time**: None

### POST `/api/queue/checkin`
- **Purpose**: Check in patient for appointment
- **Auth**: Receptionist required
- **Payload**: appointment_id
- **Response**: Visit with queue number
- **Real-time Events**:
  - `queue_updated` → clinic_{clinic_id}, doctor_{doctor_id}
  - `new_checkin` → clinic_{clinic_id}
- **DB Changes**: Creates visit, updates appointment status

### POST `/api/queue/call`
- **Purpose**: Call patient from queue
- **Auth**: Doctor required
- **Payload**: visit_id
- **Response**: Updated visit
- **Real-time Events**:
  - `queue_updated` → clinic_{clinic_id}, doctor_{doctor_id}
- **DB Changes**: Updates visit status to CALLED

### POST `/api/queue/start`
- **Purpose**: Start consultation with patient
- **Auth**: Doctor required
- **Payload**: visit_id
- **Response**: Updated visit
- **Real-time Events**:
  - `queue_updated` → clinic_{clinic_id}, doctor_{doctor_id}
- **DB Changes**: Updates visit status to IN_PROGRESS

### POST `/api/queue/complete`
- **Purpose**: Complete consultation with patient
- **Auth**: Doctor required
- **Payload**: visit_id, notes
- **Response**: Updated visit
- **Real-time Events**:
  - `queue_updated` → clinic_{clinic_id}, doctor_{doctor_id}
- **DB Changes**: Updates visit status to COMPLETED, appointment status

### POST `/api/queue/skip`
- **Purpose**: Skip patient in queue
- **Auth**: Doctor required
- **Payload**: visit_id, reason
- **Response**: Updated visit
- **Real-time Events**:
  - `queue_updated` → clinic_{clinic_id}, doctor_{doctor_id}
- **DB Changes**: Updates visit status to NO_SHOW, appointment status

## Real-time Events Summary

### SocketIO Events Emitted:
- `appointment_created` → clinic_{clinic_id}, doctor_{doctor_id}
- `appointment_updated` → clinic_{clinic_id}, doctor_{doctor_id}
- `appointment_cancelled` → clinic_{clinic_id}, doctor_{doctor_id}
- `queue_updated` → clinic_{clinic_id}, doctor_{doctor_id}
- `visit_status_changed` → clinic_{clinic_id}, doctor_{doctor_id}
- `payment_processed` → broadcast
- `patient_created` → broadcast
- `patient_updated` → broadcast
- `new_checkin` → clinic_{clinic_id}

### Room Structure:
- `clinic_{clinic_id}` - All users in a specific clinic
- `doctor_{doctor_id}` - All users viewing a specific doctor's queue
- `broadcast` - All connected users