# Database Schema Mapping

## Core Tables

### Users Table (`users`)
- **Primary Key**: `id` (Integer)
- **Fields**:
  - `username` (String, Unique, Indexed)
  - `password_hash` (String)
  - `role` (Enum: ADMIN, RECEPTIONIST, DOCTOR)
  - `created_at` (DateTime)
- **Relationships**:
  - One-to-Many: `created_appointments` (Appointment.created_by)
  - One-to-Many: `audit_logs` (AuditLog.user_id)

### Token Blacklist Table (`token_blacklist`)
- **Primary Key**: `id` (Integer)
- **Fields**:
  - `jti` (String, Indexed) - JWT ID for blacklisted tokens
  - `created_at` (DateTime)

### Patients Table (`patients`)
- **Primary Key**: `id` (Integer)
- **Fields**:
  - `name` (String, Indexed)
  - `phone` (String, Unique, Indexed)
  - `address` (Text)
  - `age` (Integer)
  - `gender` (Enum: male, female, other)
  - `medical_history` (Text)
  - `created_at` (DateTime)
  - `updated_at` (DateTime, Auto-update)
- **Indexes**: phone, name, gender, created_at
- **Relationships**:
  - One-to-Many: `appointments` (Appointment.patient_id)
  - One-to-Many: `visits` (Visit.patient_id)
  - One-to-Many: `payments` (Payment.patient_id)

### Clinics Table (`clinics`)
- **Primary Key**: `id` (Integer)
- **Fields**:
  - `name` (String)
  - `room_number` (String)
  - `is_active` (Boolean)
  - `created_at` (DateTime)
- **Relationships**:
  - One-to-Many: `doctors` (Doctor.clinic_id)
  - One-to-Many: `services` (Service.clinic_id)
  - One-to-Many: `appointments` (Appointment.clinic_id)
  - One-to-Many: `visits` (Visit.clinic_id)

### Doctors Table (`doctors`)
- **Primary Key**: `id` (Integer)
- **Fields**:
  - `user_id` (Integer, Foreign Key to users.id)
  - `name` (String, Indexed)
  - `specialty` (String, Indexed)
  - `working_days` (JSON) - Array of day names
  - `working_hours` (JSON) - Object with start/end times
  - `clinic_id` (Integer, Foreign Key to clinics.id)
  - `share_percentage` (Float, Default: 0.7)
  - `created_at` (DateTime)
- **Indexes**: clinic_id, specialty, user_id
- **Relationships**:
  - Many-to-One: `clinic` (Clinic.id)
  - One-to-Many: `appointments` (Appointment.doctor_id)
  - One-to-Many: `visits` (Visit.doctor_id)
  - One-to-Many: `prescriptions` (Prescription.doctor_id)

### Services Table (`services`)
- **Primary Key**: `id` (Integer)
- **Fields**:
  - `clinic_id` (Integer, Foreign Key to clinics.id)
  - `name` (String)
  - `duration` (Integer) - Duration in minutes
  - `price` (Numeric 10,2)
  - `is_active` (Boolean)
  - `created_at` (DateTime)
- **Relationships**:
  - Many-to-One: `clinic` (Clinic.id)
  - One-to-Many: `appointments` (Appointment.service_id)
  - One-to-Many: `visits` (Visit.service_id)

## Core Business Tables

### Appointments Table (`appointments`)
- **Primary Key**: `id` (Integer)
- **Fields**:
  - `booking_id` (String, Unique, Indexed)
  - `clinic_id` (Integer, Foreign Key, Indexed)
  - `doctor_id` (Integer, Foreign Key, Indexed)
  - `patient_id` (Integer, Foreign Key, Indexed)
  - `service_id` (Integer, Foreign Key)
  - `start_time` (DateTime, Indexed)
  - `end_time` (DateTime)
  - `status` (Enum: confirmed, checked_in, completed, cancelled, no_show)
  - `booking_source` (Enum: phone, walk_in, online, system)
  - `notes` (Text)
  - `created_by` (Integer, Foreign Key to users.id)
  - `created_at` (DateTime)
- **Indexes**: doctor+date, patient+date, clinic+date, status+date, booking_id
- **Relationships**:
  - Many-to-One: `clinic` (Clinic.id)
  - Many-to-One: `doctor` (Doctor.id)
  - Many-to-One: `patient` (Patient.id)
  - Many-to-One: `service` (Service.id)
  - Many-to-One: `creator` (User.id)
  - One-to-One: `visit` (Visit.appointment_id)

### Visits Table (`visits`)
- **Primary Key**: `id` (Integer)
- **Fields**:
  - `appointment_id` (Integer, Foreign Key to appointments.id, Nullable)
  - `doctor_id` (Integer, Foreign Key, Indexed)
  - `patient_id` (Integer, Foreign Key, Indexed)
  - `service_id` (Integer, Foreign Key)
  - `clinic_id` (Integer, Foreign Key, Indexed)
  - `check_in_time` (DateTime)
  - `start_time` (DateTime)
  - `end_time` (DateTime)
  - `status` (Enum: waiting, called, in_progress, pending_payment, completed, Indexed)
  - `visit_type` (Enum: scheduled, walk_in)
  - `queue_number` (Integer)
  - `created_at` (DateTime)
- **Indexes**: clinic+status+date, doctor+status, patient+date
- **Relationships**:
  - Many-to-One: `appointment` (Appointment.id)
  - Many-to-One: `doctor` (Doctor.id)
  - Many-to-One: `patient` (Patient.id)
  - Many-to-One: `service` (Service.id)
  - Many-to-One: `clinic` (Clinic.id)
  - One-to-One: `prescription` (Prescription.visit_id)
  - One-to-One: `payment` (Payment.visit_id)

### Payments Table (`payments`)
- **Primary Key**: `id` (Integer)
- **Fields**:
  - `visit_id` (Integer, Foreign Key, Indexed)
  - `patient_id` (Integer, Foreign Key, Indexed)
  - `total_amount` (Numeric 10,2)
  - `amount_paid` (Numeric 10,2)
  - `payment_method` (Enum: cash, visa, bank_transfer)
  - `status` (Enum: pending, paid, refunded)
  - `doctor_share` (Numeric 10,2)
  - `center_share` (Numeric 10,2)
  - `paid_at` (DateTime)
  - `created_at` (DateTime)
- **Indexes**: date+status, patient+date, visit_id
- **Relationships**:
  - Many-to-One: `visit` (Visit.id)
  - Many-to-One: `patient` (Patient.id)

## Supporting Tables

### Prescriptions Table (`prescriptions`)
- **Primary Key**: `id` (Integer)
- **Fields**:
  - `visit_id` (Integer, Foreign Key)
  - `doctor_id` (Integer, Foreign Key)
  - `patient_id` (Integer, Foreign Key)
  - `medication` (String)
  - `dosage` (String)
  - `instructions` (Text)
  - `created_at` (DateTime)
- **Relationships**:
  - Many-to-One: `visit` (Visit.id)
  - Many-to-One: `doctor` (Doctor.id)
  - Many-to-One: `patient` (Patient.id)

### Notifications Table (`notifications`)
- **Primary Key**: `id` (Integer)
- **Fields**:
  - `user_id` (Integer, Foreign Key)
  - `title` (String)
  - `message` (Text)
  - `type` (Enum)
  - `is_read` (Boolean)
  - `created_at` (DateTime)
- **Relationships**:
  - Many-to-One: `user` (User.id)

### Audit Log Table (`audit_logs`)
- **Primary Key**: `id` (Integer)
- **Fields**:
  - `user_id` (Integer, Foreign Key)
  - `action` (String)
  - `entity_type` (String)
  - `entity_id` (Integer)
  - `ip_address` (String)
  - `created_at` (DateTime)
- **Relationships**:
  - Many-to-One: `user` (User.id)

## Key Relationships Summary

### Core Flow Relationships
1. **User** → **Doctor** (One-to-One via user_id)
2. **Clinic** → **Doctor** (One-to-Many)
3. **Clinic** → **Service** (One-to-Many)
4. **Patient** → **Appointment** (One-to-Many)
5. **Appointment** → **Visit** (One-to-One)
6. **Visit** → **Payment** (One-to-One)
7. **Visit** → **Prescription** (One-to-One)

### Status Enums
- **AppointmentStatus**: confirmed, checked_in, completed, cancelled, no_show
- **VisitStatus**: waiting, called, in_progress, pending_payment, completed
- **PaymentStatus**: pending, paid, refunded
- **UserRole**: ADMIN, RECEPTIONIST, DOCTOR
- **Gender**: male, female, other
- **PaymentMethod**: cash, visa, bank_transfer
- **BookingSource**: phone, walk_in, online, system
- **VisitType**: scheduled, walk_in

### Performance Indexes
- All foreign keys are indexed
- Date-based composite indexes for reporting
- Status-based indexes for filtering
- Phone and name indexes for patient search

---
**Status**: Database schema mapped and documented
