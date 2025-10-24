# API Routes Mapping

## Authentication Routes (`/api/auth`)

### POST `/api/auth/login`
- **Purpose**: User authentication
- **Payload**: `{username, password}`
- **Response**: `{access_token, refresh_token, user}`
- **Rate Limit**: 5 per minute

### POST `/api/auth/refresh`
- **Purpose**: Refresh access token
- **Auth**: Refresh token required
- **Response**: `{access_token}`

### POST `/api/auth/logout`
- **Purpose**: User logout (blacklist token)
- **Auth**: Access token required
- **Response**: `{message}`

### GET `/api/auth/me`
- **Purpose**: Get current user info
- **Auth**: Access token required
- **Response**: `{user}`

### POST `/api/auth/change-password`
- **Purpose**: Change user password
- **Auth**: Access token required
- **Payload**: `{current_password, new_password}`
- **Response**: `{message}`

### POST `/api/auth/users`
- **Purpose**: Create new user (admin only)
- **Auth**: Admin access required
- **Payload**: `{username, password, role}`
- **Response**: `{user}`

## Appointment Routes (`/api/appointments`)

### GET `/api/appointments`
- **Purpose**: Get appointments with filters
- **Auth**: Access token required
- **Query Params**: `clinic_id, doctor_id, patient_id, date, status, page, per_page`
- **Response**: `{appointments[], total, pages, current_page, per_page}`
- **Cache**: 5 minutes

### GET `/api/appointments/<id>`
- **Purpose**: Get specific appointment
- **Auth**: Access token required
- **Response**: `{appointment}`

### POST `/api/appointments`
- **Purpose**: Create new appointment
- **Auth**: Receptionist required
- **Payload**: `{clinic_id, doctor_id, patient_id, service_id, start_time, booking_source, notes?}`
- **Response**: `{appointment}`
- **Real-time**: Emits `appointment_created`, `queue_updated`

### PUT `/api/appointments/<id>`
- **Purpose**: Update appointment
- **Auth**: Receptionist required
- **Payload**: `{start_time?, status?, notes?}`
- **Response**: `{appointment}`
- **Real-time**: Emits `appointment_updated`, `queue_updated`

### DELETE `/api/appointments/<id>`
- **Purpose**: Cancel appointment
- **Auth**: Receptionist required
- **Response**: `{message}`
- **Real-time**: Emits `appointment_cancelled`, `queue_updated`

### GET `/api/appointments/available-slots`
- **Purpose**: Get available time slots
- **Auth**: Access token required
- **Query Params**: `clinic_id, doctor_id, date`
- **Response**: `{available_slots[], doctor, date}`

## Patient Routes (`/api/patients`)

### GET `/api/patients`
- **Purpose**: Search patients by phone/name
- **Auth**: Access token required
- **Query Params**: `phone, name, page, per_page`
- **Response**: `{patients[], total, pages, current_page, per_page}`
- **Cache**: 5 minutes

### GET `/api/patients/<id>`
- **Purpose**: Get patient details with history
- **Auth**: Access token required
- **Response**: `{patient{recent_appointments[], recent_visits[]}}`

### POST `/api/patients`
- **Purpose**: Create new patient
- **Auth**: Receptionist required
- **Payload**: `{name, phone, address?, age?, gender?, medical_history?}`
- **Response**: `{patient}`
- **Real-time**: Emits `patient_created`

### PUT `/api/patients/<id>`
- **Purpose**: Update patient information
- **Auth**: Receptionist required
- **Payload**: `{name?, phone?, address?, age?, gender?, medical_history?}`
- **Response**: `{patient}`
- **Real-time**: Emits `patient_updated`

### DELETE `/api/patients/<id>`
- **Purpose**: Delete patient
- **Auth**: Receptionist required
- **Response**: `{message}`

### GET `/api/patients/search`
- **Purpose**: Quick patient search for booking
- **Auth**: Access token required
- **Query Params**: `q` (search term)
- **Response**: `{patients[]}`

## Visit Routes (`/api/visits`)

### GET `/api/visits`
- **Purpose**: Get visits with filters
- **Auth**: Access token required
- **Query Params**: `clinic_id, doctor_id, patient_id, status, visit_type, date, page, per_page`
- **Response**: `{visits[], pagination{}}`

### GET `/api/visits/<id>`
- **Purpose**: Get visit details
- **Auth**: Access token required
- **Response**: `{visit}`

### POST `/api/visits/check-in`
- **Purpose**: Check in patient for appointment
- **Auth**: Receptionist required
- **Payload**: `{appointment_id}`
- **Response**: `{visit, queue_number}`
- **Real-time**: Emits `queue_updated`

### POST `/api/visits/walk-in`
- **Purpose**: Create walk-in visit
- **Auth**: Receptionist required
- **Payload**: `{patient_id, clinic_id, service_id, doctor_id}`
- **Response**: `{visit, queue_number}`
- **Real-time**: Emits `queue_updated`

### GET `/api/visits/queue`
- **Purpose**: Get live queue for clinic/doctor
- **Auth**: Access token required
- **Query Params**: `clinic_id OR doctor_id`
- **Response**: Queue data

### PUT `/api/visits/<id>/status`
- **Purpose**: Update visit status
- **Auth**: Doctor required
- **Payload**: `{status}`
- **Response**: `{visit}`
- **Real-time**: Emits `queue_updated`, `visit_status_changed`

### POST `/api/visits/<id>/call`
- **Purpose**: Call next patient in queue
- **Auth**: Doctor required
- **Response**: `{visit}`
- **Real-time**: Emits `queue_updated`, `visit_status_changed`

## Payment Routes (`/api/payments`)

### GET `/api/payments`
- **Purpose**: Get payments with filters
- **Auth**: Access token required
- **Query Params**: `patient_id, status, start_date, end_date, page, per_page`
- **Response**: `{payments[], total, pages, current_page, per_page}`

### GET `/api/payments/<id>`
- **Purpose**: Get payment details
- **Auth**: Access token required
- **Response**: `{payment}`

### POST `/api/payments`
- **Purpose**: Process payment for visit
- **Auth**: Receptionist required
- **Payload**: `{visit_id, payment_method, amount_paid}`
- **Response**: `{payment, invoice}`

### PUT `/api/payments/<id>/process`
- **Purpose**: Process existing pending payment
- **Auth**: Receptionist required
- **Payload**: `{amount_paid, payment_method}`
- **Response**: `{payment}`
- **Real-time**: Emits `payment_processed`, `queue_updated`

### GET `/api/payments/invoice/<visit_id>`
- **Purpose**: Generate printable invoice
- **Auth**: Access token required
- **Response**: `{invoice}`

### POST `/api/payments/refund/<id>`
- **Purpose**: Refund payment
- **Auth**: Receptionist required
- **Response**: `{payment}`

## Queue Routes (`/api/queue`)

### GET `/api/queue/clinic/<id>`
- **Purpose**: Get queue for specific clinic
- **Auth**: Access token required
- **Response**: Queue data

### GET `/api/queue/doctor/<user_id>`
- **Purpose**: Get queue for specific doctor
- **Auth**: Access token required
- **Response**: Queue data

### POST `/api/queue/checkin`
- **Purpose**: Check in patient for appointment
- **Auth**: Receptionist required
- **Payload**: `{appointment_id}`
- **Response**: `{visit, queue_number}`
- **Real-time**: Emits `queue_updated`, `new_checkin`

### POST `/api/queue/call`
- **Purpose**: Call patient from queue
- **Auth**: Doctor required
- **Payload**: `{visit_id}`
- **Response**: `{visit}`
- **Real-time**: Emits `queue_updated`

### POST `/api/queue/start`
- **Purpose**: Start consultation
- **Auth**: Doctor required
- **Payload**: `{visit_id}`
- **Response**: `{visit}`
- **Real-time**: Emits `queue_updated`

### POST `/api/queue/complete`
- **Purpose**: Complete consultation
- **Auth**: Doctor required
- **Payload**: `{visit_id, notes?}`
- **Response**: `{visit}`
- **Real-time**: Emits `queue_updated`

### POST `/api/queue/skip`
- **Purpose**: Skip patient in queue
- **Auth**: Doctor required
- **Payload**: `{visit_id, reason?}`
- **Response**: `{visit}`
- **Real-time**: Emits `queue_updated`

## Dashboard Routes (`/api/dashboard`)

### GET `/api/dashboard/stats`
- **Purpose**: Get dashboard statistics
- **Auth**: Access token required
- **Response**: Role-based stats (receptionist/doctor)
- **Cache**: 30 seconds

### GET `/api/dashboard/notifications`
- **Purpose**: Get recent notifications
- **Auth**: Access token required
- **Response**: `{notifications[]}`

## Health Routes (`/api`)

### GET `/api/health`
- **Purpose**: Health check endpoint
- **Auth**: None required
- **Response**: `{status, timestamp}`

---
**Status**: All API routes mapped and documented
