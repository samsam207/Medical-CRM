# Database Schema Map

## Core Tables

### Users Table (`users`)
- **Primary Key**: `id` (Integer)
- **Fields**:
  - `username` (String, 80 chars, unique, indexed)
  - `password_hash` (String, 255 chars)
  - `role` (Enum: ADMIN, RECEPTIONIST, DOCTOR)
  - `created_at` (DateTime)
- **Relationships**:
  - One-to-many with `appointments` (created_appointments)
  - One-to-many with `audit_log` (audit_logs)
- **Indexes**: username

### Token Blacklist Table (`token_blacklist`)
- **Primary Key**: `id` (Integer)
- **Fields**:
  - `jti` (String, 36 chars, indexed)
  - `created_at` (DateTime)
- **Purpose**: JWT token revocation

### Clinics Table (`clinics`)
- **Primary Key**: `id` (Integer)
- **Fields**:
  - `name` (String, 100 chars)
  - `room_number` (String, 20 chars)
  - `is_active` (Boolean, default True)
  - `created_at` (DateTime)
- **Relationships**:
  - One-to-many with `doctors`
  - One-to-many with `services`
  - One-to-many with `appointments`
  - One-to-many with `visits`

### Doctors Table (`doctors`)
- **Primary Key**: `id` (Integer)
- **Foreign Keys**:
  - `user_id` → `users.id` (nullable)
  - `clinic_id` → `clinics.id`
- **Fields**:
  - `name` (String, 100 chars, indexed)
  - `specialty` (String, 100 chars)
  - `working_days` (JSON array: ["Monday", "Wednesday"])
  - `working_hours` (JSON object: {"start": "09:00", "end": "17:00"})
  - `share_percentage` (Float, default 0.7)
  - `created_at` (DateTime)
- **Relationships**:
  - Many-to-one with `users` (user)
  - Many-to-one with `clinics` (clinic)
  - One-to-many with `appointments`
  - One-to-many with `visits`
  - One-to-many with `prescriptions`
- **Indexes**: clinic_id, specialty, user_id

### Patients Table (`patients`)
- **Primary Key**: `id` (Integer)
- **Fields**:
  - `name` (String, 100 chars, indexed)
  - `phone` (String, 20 chars, unique, indexed)
  - `address` (Text)
  - `age` (Integer)
  - `gender` (Enum: MALE, FEMALE, OTHER)
  - `medical_history` (Text)
  - `created_at` (DateTime, indexed)
  - `updated_at` (DateTime, auto-update)
- **Relationships**:
  - One-to-many with `appointments`
  - One-to-many with `visits`
  - One-to-many with `payments`
- **Indexes**: phone, name, gender, created_at

### Services Table (`services`)
- **Primary Key**: `id` (Integer)
- **Foreign Keys**:
  - `clinic_id` → `clinics.id`
- **Fields**:
  - `name` (String, 100 chars)
  - `duration` (Integer, minutes)
  - `price` (Numeric, 10,2)
  - `is_active` (Boolean, default True)
  - `created_at` (DateTime)
- **Relationships**:
  - Many-to-one with `clinics` (clinic)
  - One-to-many with `appointments`
  - One-to-many with `visits`

## Appointment & Visit Tables

### Appointments Table (`appointments`)
- **Primary Key**: `id` (Integer)
- **Foreign Keys**:
  - `clinic_id` → `clinics.id` (indexed)
  - `doctor_id` → `doctors.id` (indexed)
  - `patient_id` → `patients.id` (indexed)
  - `service_id` → `services.id`
  - `created_by` → `users.id`
- **Fields**:
  - `booking_id` (String, 50 chars, unique, indexed)
  - `start_time` (DateTime, indexed)
  - `end_time` (DateTime)
  - `status` (Enum: CONFIRMED, CHECKED_IN, COMPLETED, CANCELLED, NO_SHOW)
  - `booking_source` (Enum: PHONE, WALK_IN, ONLINE, SYSTEM)
  - `notes` (Text)
  - `created_at` (DateTime)
- **Relationships**:
  - Many-to-one with `clinics` (clinic)
  - Many-to-one with `doctors` (doctor)
  - Many-to-one with `patients` (patient)
  - Many-to-one with `services` (service)
  - Many-to-one with `users` (creator)
  - One-to-one with `visits` (visit)
- **Indexes**: 
  - doctor_id + date(start_time)
  - patient_id + date(start_time)
  - clinic_id + date(start_time)
  - status + date(start_time)
  - booking_id

### Visits Table (`visits`)
- **Primary Key**: `id` (Integer)
- **Foreign Keys**:
  - `appointment_id` → `appointments.id` (nullable)
  - `doctor_id` → `doctors.id` (indexed)
  - `patient_id` → `patients.id` (indexed)
  - `service_id` → `services.id`
  - `clinic_id` → `clinics.id` (indexed)
- **Fields**:
  - `check_in_time` (DateTime)
  - `start_time` (DateTime)
  - `end_time` (DateTime)
  - `status` (Enum: WAITING, CALLED, IN_PROGRESS, PENDING_PAYMENT, COMPLETED, indexed)
  - `visit_type` (Enum: SCHEDULED, WALK_IN)
  - `queue_number` (Integer)
  - `created_at` (DateTime)
- **Relationships**:
  - Many-to-one with `appointments` (appointment)
  - Many-to-one with `doctors` (doctor)
  - Many-to-one with `patients` (patient)
  - Many-to-one with `services` (service)
  - Many-to-one with `clinics` (clinic)
  - One-to-one with `prescriptions` (prescription)
  - One-to-one with `payments` (payment)
- **Indexes**:
  - clinic_id + status + date(created_at)
  - doctor_id + status
  - patient_id + date(created_at)

## Payment & Prescription Tables

### Payments Table (`payments`)
- **Primary Key**: `id` (Integer)
- **Foreign Keys**:
  - `visit_id` → `visits.id` (indexed)
  - `patient_id` → `patients.id` (indexed)
- **Fields**:
  - `total_amount` (Numeric, 10,2)
  - `amount_paid` (Numeric, 10,2)
  - `payment_method` (Enum: CASH, VISA, BANK_TRANSFER)
  - `status` (Enum: PENDING, PAID, REFUNDED)
  - `doctor_share` (Numeric, 10,2)
  - `center_share` (Numeric, 10,2)
  - `paid_at` (DateTime)
  - `created_at` (DateTime)
- **Relationships**:
  - Many-to-one with `visits` (visit)
  - Many-to-one with `patients` (patient)
- **Indexes**:
  - date(created_at) + status
  - patient_id + date(created_at)
  - visit_id

### Prescriptions Table (`prescriptions`)
- **Primary Key**: `id` (Integer)
- **Foreign Keys**:
  - `visit_id` → `visits.id`
  - `doctor_id` → `doctors.id` (indexed)
- **Fields**:
  - `diagnosis` (Text)
  - `medications` (Text)
  - `notes` (Text)
  - `image_path` (String, 255 chars)
  - `created_at` (DateTime)
- **Relationships**:
  - One-to-one with `visits` (visit)
  - Many-to-one with `doctors` (doctor)

## System Tables

### Notifications Table (`notifications`)
- **Primary Key**: `id` (Integer)
- **Foreign Keys**:
  - `related_appointment_id` → `appointments.id` (nullable)
- **Fields**:
  - `recipient` (String, 100 chars, indexed)
  - `notification_type` (Enum: SMS_REMINDER, SMS_CONFIRMATION, SMS_FOLLOWUP)
  - `message` (Text)
  - `scheduled_time` (DateTime, indexed)
  - `sent_at` (DateTime)
  - `status` (Enum: PENDING, SENT, FAILED, indexed)
  - `created_at` (DateTime)
- **Relationships**:
  - Many-to-one with `appointments` (related_appointment)
- **Indexes**:
  - recipient
  - status + scheduled_time
  - related_appointment_id
  - notification_type

### Audit Log Table (`audit_log`)
- **Primary Key**: `id` (Integer)
- **Foreign Keys**:
  - `user_id` → `users.id` (indexed)
- **Fields**:
  - `action` (String, 100 chars, indexed)
  - `entity_type` (String, 50 chars)
  - `entity_id` (Integer)
  - `details` (JSON)
  - `ip_address` (String, 45 chars)
  - `timestamp` (DateTime, indexed)
- **Relationships**:
  - Many-to-one with `users` (user)
- **Indexes**:
  - entity_type + entity_id
  - user_id + timestamp
  - action
  - timestamp

## Key Relationships Summary

### Core Flow
1. **User** (receptionist) creates **Appointment** for **Patient** with **Doctor** at **Clinic** for **Service**
2. **Appointment** gets checked in → creates **Visit** with queue number
3. **Doctor** manages **Visit** through status changes
4. **Visit** completion → creates **Payment** record
5. **Doctor** may create **Prescription** for **Visit**

### Foreign Key Dependencies
- **Appointments** depend on: clinics, doctors, patients, services, users
- **Visits** depend on: appointments (optional), doctors, patients, services, clinics
- **Payments** depend on: visits, patients
- **Prescriptions** depend on: visits, doctors
- **Notifications** depend on: appointments (optional)

### Data Integrity
- **Cascade Rules**: Not explicitly defined (likely RESTRICT)
- **Nullable Foreign Keys**: 
  - `doctors.user_id` (doctor may not have user account)
  - `visits.appointment_id` (walk-in visits)
  - `notifications.related_appointment_id` (general notifications)
- **Unique Constraints**: 
  - `users.username`
  - `patients.phone`
  - `appointments.booking_id`

### Performance Considerations
- **Heavy Indexing**: Date-based queries, status filtering, foreign key lookups
- **JSON Fields**: `doctors.working_days`, `doctors.working_hours`, `audit_log.details`
- **Decimal Precision**: Financial fields use Numeric(10,2)
- **Enum Usage**: Status fields, types, methods for data consistency