# Backend Routes Map - Reception Area

**Generated:** 2025-10-26  
**Status:** PHASE 1 - Code Study

## Reception Routes Overview

### Appointments Routes (`backend/app/routes/appointments.py`)
- **GET** `/appointments` - List appointments with filters (clinic_id, doctor_id, patient_id, date, status, pagination)
  - Returns: { appointments: [], total, pages, current_page, per_page }
  - Cache: 5 minutes
  
- **GET** `/appointments/<int:appointment_id>` - Get specific appointment
  
- **POST** `/appointments` - Create new appointment
  - Required fields: clinic_id, doctor_id, patient_id, service_id, start_time, booking_source
  - Creates: Appointment, Visit, Payment (pending)
  - Emits: 'appointment_created', 'queue_updated'
  - Auth: @receptionist_required
  
- **PUT** `/appointments/<int:appointment_id>` - Update appointment
  - Emits: 'appointment_updated', 'queue_updated'
  - Auth: @receptionist_required
  
- **DELETE** `/appointments/<int:appointment_id>` - Cancel appointment
  - Emits: 'appointment_cancelled', 'queue_updated'
  - Auth: @receptionist_required
  
- **GET** `/appointments/available-slots` - Get available time slots
  - Parameters: clinic_id, doctor_id, date
  - Returns: { available_slots: [], doctor: {}, date }

### Patients Routes (`backend/app/routes/patients.py`)
- **GET** `/patients` - Search patients by phone or name
  - Cache: 5 minutes
  - Pagination supported
  
- **GET** `/patients/<int:patient_id>` - Get patient details with history
  - Includes: recent appointments, recent visits
  
- **POST** `/patients` - Create new patient
  - Required: name, phone
  - Emits: 'patient_created'
  - Auth: @receptionist_required
  
- **PUT** `/patients/<int:patient_id>` - Update patient
  - Emits: 'patient_updated'
  - Auth: @receptionist_required
  
- **DELETE** `/patients/<int:patient_id>` - Delete patient
  - Auth: @receptionist_required
  
- **GET** `/patients/search` - Quick patient search for booking
  - Query param: q (min 2 chars)
  - Limit: 10 results

### Payments Routes (`backend/app/routes/payments.py`)
- **GET** `/payments` - List payments with filters
  - Filters: patient_id, status, start_date, end_date, pagination
  
- **GET** `/payments/<int:payment_id>` - Get payment details
  
- **PUT** `/payments/<int:payment_id>/process` - Process pending payment
  - Updates payment to PAID
  - Updates visit status to COMPLETED
  - Emits: 'payment_processed', 'queue_updated'
  - Auth: @receptionist_required
  
- **POST** `/payments` - Process payment for visit
  - Creates new payment
  - Auth: @receptionist_required
  
- **GET** `/payments/invoice/<int:visit_id>` - Generate invoice
  
- **POST** `/payments/refund/<int:payment_id>` - Refund payment
  - Auth: @receptionist_required

### Visits Routes (`backend/app/routes/visits.py`)
- **GET** `/visits` - Get visits with filters
  - Filters: clinic_id, doctor_id, patient_id, status, visit_type, date
  
- **POST** `/visits/check-in` - Check in patient for appointment
  - Creates Visit
  - Updates Appointment to CHECKED_IN
  - Emits: 'queue_updated'
  - Auth: @receptionist_required
  
- **POST** `/visits/walk-in` - Create walk-in visit
  - Emits: 'queue_updated'
  - Auth: @receptionist_required
  
- **GET** `/visits/queue` - Get live queue for clinic or doctor
  - Parameters: clinic_id OR doctor_id
  
- **GET** `/visits/<int:visit_id>` - Get visit details
  
- **PUT** `/visits/<int:visit_id>/status` - Update visit status
  - Emits: 'queue_updated', 'visit_status_changed'
  - Auth: @doctor_required
  
- **POST** `/visits/<int:visit_id>/call` - Call patient from queue
  - Emits: 'queue_updated', 'visit_status_changed'
  - Auth: @doctor_required

### Queue Routes (`backend/app/routes/queue.py`)
- **GET** `/queue/clinic/<int:clinic_id>` - Get clinic queue with date range
  - Emits: via SocketIO
  
- **GET** `/queue/doctor/<int:user_id>` - Get doctor queue
  
- **POST** `/queue/checkin` - Check in appointment
  - Creates Visit
  - Emits: 'queue_updated', 'new_checkin'
  - Auth: @receptionist_required
  
- **POST** `/queue/call` - Call patient
  - Updates visit to CALLED
  - Emits: 'queue_updated'
  - Auth: @receptionist_required
  
- **POST** `/queue/start` - Start consultation
  - Updates visit to IN_PROGRESS
  - Emits: 'queue_updated'
  - Auth: @receptionist_required
  
- **POST** `/queue/complete` - Complete consultation
  - Updates visit to COMPLETED
  - Emits: 'queue_updated'
  - Auth: @receptionist_required
  
- **POST** `/queue/skip` - Skip patient
  - Emits: 'queue_updated'
  - Auth: @receptionist_required
  
- **GET** `/queue/upcoming` - Get upcoming appointments
  
- **GET** `/queue/appointments` - Get all appointments for date
  
- **PUT** `/queue/reorder` - Reorder queue
  - Auth: @receptionist_required
  
- **POST** `/queue/walkin` - Create walk-in visit
  - Emits: 'queue_updated', 'walkin_added'
  - Auth: @receptionist_required
  
- **POST** `/queue/cancel` - Cancel visit
  - Auth: @receptionist_required
  
- **GET** `/queue/phases/<int:clinic_id>` - Get queue organized by 4 phases
  - Returns: { phases: { appointments_today, waiting, with_doctor, completed } }
  
- **POST** `/queue/phases/move` - Move patient between phases
  - Auth: @receptionist_required
  
- **GET** `/queue/statistics/<int:clinic_id>` - Get queue statistics

## Important Notes

1. **Real-time Updates:** All queue operations emit SocketIO events to specific rooms (clinic_{id}, doctor_{id})
2. **Payment Creation:** Automatically created when appointment is created (line 167-178 in appointments.py)
3. **Visit Creation:** Automatically created when appointment is created (line 139-160 in appointments.py)
4. **Cache Invalidation:** Most mutations invalidate cache for related queries

