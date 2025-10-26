# Database Schema Map - Reception Area

**Generated:** 2025-10-26  
**Status:** PHASE 1 - Code Study

## Core Tables for Reception

### appointments
**Purpose:** Scheduled appointments between patients and doctors

**Fields:**
- id (PK)
- booking_id (unique, indexed)
- clinic_id (FK → clinics.id)
- doctor_id (FK → doctors.id)
- patient_id (FK → patients.id)
- service_id (FK → services.id)
- start_time, end_time
- status (ENUM: CONFIRMED, CHECKED_IN, COMPLETED, CANCELLED, NO_SHOW)
- booking_source (ENUM: PHONE, WALK_IN, ONLINE, SYSTEM)
- notes
- created_by (FK → users.id)
- created_at

**Relationships:**
- visit (one-to-one) - backref from Visit
- patient (many-to-one) - backref 'appointments'
- doctor, clinic, service (many-to-one)

**Indexes:**
- idx_appointment_doctor_date
- idx_appointment_patient_date
- idx_appointment_clinic_date
- idx_appointment_status_date
- idx_appointment_booking_id

---

### patients
**Purpose:** Patient records

**Fields:**
- id (PK)
- name (indexed)
- phone (unique, indexed)
- address
- age
- gender (ENUM: MALE, FEMALE, OTHER)
- medical_history (TEXT)
- created_at, updated_at

**Relationships:**
- appointments (one-to-many) - Patient.appointments
- visits (one-to-many) - Patient.visits
- payments (one-to-many) - Patient.payments

**Indexes:**
- idx_patient_phone
- idx_patient_name
- idx_patient_gender
- idx_patient_created_at

---

### visits
**Purpose:** Active visits (queued patients)

**Fields:**
- id (PK)
- appointment_id (FK → appointments.id, nullable) - NULL for walk-ins
- doctor_id (FK → doctors.id)
- patient_id (FK → patients.id)
- service_id (FK → services.id)
- clinic_id (FK → clinics.id)
- check_in_time
- start_time
- end_time
- status (ENUM: WAITING, CALLED, IN_PROGRESS, PENDING_PAYMENT, COMPLETED)
- visit_type (ENUM: SCHEDULED, WALK_IN)
- queue_number
- created_at

**Relationships:**
- appointment (many-to-one) - backref 'visit'
- patient (many-to-one) - backref 'visits'
- prescription (one-to-one)
- payment (one-to-one) - backref 'visit'

**Indexes:**
- idx_visit_clinic_status_date
- idx_visit_doctor_status
- idx_visit_patient_date

**Critical Status Flow:**
```
SCHEDULED → WAITING → CALLED → IN_PROGRESS → PENDING_PAYMENT → COMPLETED
```

---

### payments
**Purpose:** Payment records for visits

**Fields:**
- id (PK)
- visit_id (FK → visits.id)
- patient_id (FK → patients.id)
- total_amount (Numeric 10,2)
- amount_paid (Numeric 10,2)
- payment_method (ENUM: CASH, VISA, BANK_TRANSFER)
- status (ENUM: PENDING, PAID, REFUNDED)
- doctor_share (Numeric 10,2)
- center_share (Numeric 10,2)
- paid_at
- created_at

**Relationships:**
- visit (one-to-one) - backref 'payment'

**Indexes:**
- idx_payment_date_status
- idx_payment_patient_date
- idx_payment_visit

---

## Foreign Key Relationships Map

```
clinics
  ├── appointments (clinic_id)
  └── visits (clinic_id)

doctors
  ├── appointments (doctor_id)
  └── visits (doctor_id)

patients
  ├── appointments (patient_id)
  ├── visits (patient_id)
  └── payments (patient_id)

appointments
  ├── visits (appointment_id) - one-to-one
  └── created_by → users.id

visits
  ├── appointment (appointment_id) - one-to-many
  ├── prescription (visit_id) - one-to-one
  └── payment (visit_id) - one-to-one

payments
  └── visit (visit_id) - one-to-one

services
  ├── appointments (service_id)
  └── visits (service_id)
```

---

## Critical Data Flow: Appointment Creation

When a new appointment is confirmed via `/appointments POST`:

### Step 1: Create Appointment
```python
appointment = Appointment(...)
db.session.add(appointment)
db.session.flush()  # Get appointment.id
```

### Step 2: Create Visit (automatically)
```python
visit = Visit(
    appointment_id=appointment.id,
    doctor_id=data['doctor_id'],
    patient_id=data['patient_id'],
    service_id=data['service_id'],
    clinic_id=data['clinic_id'],
    check_in_time=start_time,
    visit_type=VisitType.SCHEDULED,
    queue_number=max_queue + 1,
    status=VisitStatus.WAITING
)
```

### Step 3: Create Payment (automatically)
```python
payment = Payment(
    visit_id=visit.id,
    patient_id=data['patient_id'],
    total_amount=service.price,
    amount_paid=0.0,
    payment_method=PaymentMethod.CASH,
    doctor_share=doctor_share,
    center_share=center_share,
    status=PaymentStatus.PENDING
)
```

### Step 4: Commit Transaction
```python
db.session.commit()
```

**ALL THREE MUST SUCCEED OR NONE ARE SAVED** - This is atomic!

---

## Enums Used

**AppointmentStatus:**
- CONFIRMED - Scheduled and confirmed
- CHECKED_IN - Patient arrived and checked in
- COMPLETED - Visit completed
- CANCELLED - Cancelled by patient/staff
- NO_SHOW - Patient didn't show up

**BookingSource:**
- PHONE - Booked over phone
- WALK_IN - Walk-in patient
- ONLINE - Online booking
- SYSTEM - System-generated

**VisitStatus:**
- WAITING - In queue
- CALLED - Called by doctor
- IN_PROGRESS - Currently with doctor
- PENDING_PAYMENT - Waiting for payment
- COMPLETED - Visit finished

**VisitType:**
- SCHEDULED - From appointment
- WALK_IN - No appointment

**PaymentStatus:**
- PENDING - Not paid yet
- PAID - Payment completed
- REFUNDED - Payment refunded

**PaymentMethod:**
- CASH
- VISA
- BANK_TRANSFER

---

## Database Operations

### Read Operations
1. List appointments with filters (pagination, caching)
2. List patients with search
3. List payments with filters
4. Get queue status for clinic/doctor
5. Get visit details

### Write Operations (All require auth)
1. **Create Appointment** - Creates 3 records atomically
2. **Update Appointment** - Updates status/time
3. **Create Patient** - New patient record
4. **Update Patient** - Edit patient info
5. **Process Payment** - Update payment status
6. **Create Walk-in Visit** - Direct visit creation
7. **Update Visit Status** - Move through queue
8. **Cancel Visit/Appointment** - Mark as cancelled

---

## Important Constraints

1. **Patient.phone** must be unique
2. **Appointment.booking_id** must be unique  
3. **Visit** can have NULL appointment_id (for walk-ins)
4. **Payment** is linked to Visit, not Appointment
5. **Queue_number** is per clinic per day
6. All timestamps use `datetime.utcnow()`

---

## Cache Strategy

- Appointments list: 5 min TTL (cache key includes all filters)
- Patients list: 5 min TTL
- Cache cleared on mutations
- SocketIO events trigger cache invalidation

