-- Medical CRM Database Schema
-- Complete DDL for all tables and indexes

-- =============================================
-- CORE TABLES
-- =============================================

-- Users table (Authentication & Authorization)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(80) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'RECEPTIONIST', 'DOCTOR')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Token blacklist for JWT management
CREATE TABLE token_blacklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jti VARCHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Clinics table (Medical Centers)
CREATE TABLE clinics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT 1 NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Doctors table (Medical Staff)
CREATE TABLE doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    working_days TEXT NOT NULL,  -- JSON: ["Monday", "Wednesday"]
    working_hours TEXT NOT NULL, -- JSON: {"start": "09:00", "end": "17:00"}
    clinic_id INTEGER NOT NULL REFERENCES clinics(id),
    share_percentage REAL DEFAULT 0.7 NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Patients table (Patient Records)
CREATE TABLE patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    age INTEGER,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    medical_history TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Services table (Medical Services)
CREATE TABLE services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clinic_id INTEGER NOT NULL REFERENCES clinics(id),
    name VARCHAR(100) NOT NULL,
    duration INTEGER NOT NULL,  -- duration in minutes
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT 1 NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- APPOINTMENT & VISIT MANAGEMENT
-- =============================================

-- Appointments table (Scheduled Appointments)
CREATE TABLE appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id VARCHAR(50) UNIQUE NOT NULL,
    clinic_id INTEGER NOT NULL REFERENCES clinics(id),
    doctor_id INTEGER NOT NULL REFERENCES doctors(id),
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    service_id INTEGER NOT NULL REFERENCES services(id),
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmed' NOT NULL CHECK (status IN ('confirmed', 'checked_in', 'completed', 'cancelled', 'no_show')),
    booking_source VARCHAR(20) NOT NULL CHECK (booking_source IN ('phone', 'walk_in', 'online', 'system')),
    notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Visits table (Actual Patient Visits)
CREATE TABLE visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER REFERENCES appointments(id),
    doctor_id INTEGER NOT NULL REFERENCES doctors(id),
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    service_id INTEGER NOT NULL REFERENCES services(id),
    clinic_id INTEGER NOT NULL REFERENCES clinics(id),
    check_in_time DATETIME NOT NULL,
    start_time DATETIME,
    end_time DATETIME,
    status VARCHAR(20) DEFAULT 'waiting' NOT NULL CHECK (status IN ('waiting', 'called', 'in_progress', 'pending_payment', 'completed')),
    visit_type VARCHAR(20) NOT NULL CHECK (visit_type IN ('scheduled', 'walk_in')),
    queue_number INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- MEDICAL RECORDS & BILLING
-- =============================================

-- Prescriptions table (Medical Prescriptions)
CREATE TABLE prescriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id INTEGER NOT NULL REFERENCES visits(id),
    doctor_id INTEGER NOT NULL REFERENCES doctors(id),
    diagnosis TEXT NOT NULL,
    medications TEXT NOT NULL,
    notes TEXT,
    image_path VARCHAR(255),  -- optional photo upload
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payments table (Financial Transactions)
CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id INTEGER NOT NULL REFERENCES visits(id),
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    total_amount DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'visa', 'bank_transfer')),
    status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'paid', 'refunded')),
    doctor_share DECIMAL(10,2) NOT NULL,
    center_share DECIMAL(10,2) NOT NULL,
    paid_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SYSTEM MANAGEMENT
-- =============================================

-- Notifications table (SMS/Communication)
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient VARCHAR(100) NOT NULL,  -- phone number
    notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('sms_reminder', 'sms_confirmation', 'sms_followup')),
    message TEXT NOT NULL,
    scheduled_time DATETIME NOT NULL,
    sent_at DATETIME,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
    related_appointment_id INTEGER REFERENCES appointments(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit log table (System Audit Trail)
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    details TEXT,  -- JSON data
    ip_address VARCHAR(45),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Users table indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Token blacklist indexes
CREATE INDEX idx_token_blacklist_jti ON token_blacklist(jti);

-- Patients table indexes
CREATE INDEX idx_patient_phone ON patients(phone);
CREATE INDEX idx_patient_name ON patients(name);
CREATE INDEX idx_patient_gender ON patients(gender);
CREATE INDEX idx_patient_created_at ON patients(created_at);

-- Doctors table indexes
CREATE INDEX idx_doctor_clinic ON doctors(clinic_id);
CREATE INDEX idx_doctor_specialty ON doctors(specialty);
CREATE INDEX idx_doctor_user ON doctors(user_id);

-- Services table indexes
CREATE INDEX idx_service_clinic ON services(clinic_id);
CREATE INDEX idx_service_active ON services(is_active);

-- Appointments table indexes
CREATE INDEX idx_appointment_booking_id ON appointments(booking_id);
CREATE INDEX idx_appointment_doctor_date ON appointments(doctor_id, DATE(start_time));
CREATE INDEX idx_appointment_patient_date ON appointments(patient_id, DATE(start_time));
CREATE INDEX idx_appointment_clinic_date ON appointments(clinic_id, DATE(start_time));
CREATE INDEX idx_appointment_status_date ON appointments(status, DATE(start_time));
CREATE INDEX idx_appointment_start_time ON appointments(start_time);
CREATE INDEX idx_appointment_created_by ON appointments(created_by);

-- Visits table indexes
CREATE INDEX idx_visit_clinic_status_date ON visits(clinic_id, status, DATE(created_at));
CREATE INDEX idx_visit_doctor_status ON visits(doctor_id, status);
CREATE INDEX idx_visit_patient_date ON visits(patient_id, DATE(created_at));
CREATE INDEX idx_visit_appointment ON visits(appointment_id);
CREATE INDEX idx_visit_queue_number ON visits(queue_number);
CREATE INDEX idx_visit_check_in_time ON visits(check_in_time);

-- Prescriptions table indexes
CREATE INDEX idx_prescription_visit ON prescriptions(visit_id);
CREATE INDEX idx_prescription_doctor ON prescriptions(doctor_id);
CREATE INDEX idx_prescription_created_at ON prescriptions(created_at);

-- Payments table indexes
CREATE INDEX idx_payment_visit ON payments(visit_id);
CREATE INDEX idx_payment_patient_date ON payments(patient_id, DATE(created_at));
CREATE INDEX idx_payment_date_status ON payments(DATE(created_at), status);
CREATE INDEX idx_payment_status ON payments(status);
CREATE INDEX idx_payment_paid_at ON payments(paid_at);

-- Notifications table indexes
CREATE INDEX idx_notification_recipient ON notifications(recipient);
CREATE INDEX idx_notification_status_scheduled ON notifications(status, scheduled_time);
CREATE INDEX idx_notification_appointment ON notifications(related_appointment_id);
CREATE INDEX idx_notification_type ON notifications(notification_type);
CREATE INDEX idx_notification_scheduled_time ON notifications(scheduled_time);

-- Audit log table indexes
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user_timestamp ON audit_log(user_id, timestamp);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Trigger to update updated_at for patients table
CREATE TRIGGER update_patients_updated_at 
    AFTER UPDATE ON patients
    FOR EACH ROW
BEGIN
    UPDATE patients SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- =============================================
-- SAMPLE DATA (Optional)
-- =============================================

-- Insert sample clinic
INSERT INTO clinics (name, room_number, is_active) VALUES 
('Main Clinic', 'Room 101', 1),
('Emergency Wing', 'Room 201', 1);

-- Insert sample admin user
INSERT INTO users (username, password_hash, role) VALUES 
('admin', 'pbkdf2:sha256:260000$hash$example', 'ADMIN'),
('reception', 'pbkdf2:sha256:260000$hash$example', 'RECEPTIONIST');

-- Insert sample doctor
INSERT INTO doctors (name, specialty, working_days, working_hours, clinic_id, share_percentage) VALUES 
('Dr. Smith', 'General Medicine', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"start": "09:00", "end": "17:00"}', 1, 0.7);

-- Insert sample services
INSERT INTO services (clinic_id, name, duration, price, is_active) VALUES 
(1, 'General Consultation', 30, 50.00, 1),
(1, 'Follow-up Visit', 15, 25.00, 1),
(1, 'Emergency Consultation', 45, 100.00, 1);

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for active appointments with patient and doctor info
CREATE VIEW active_appointments AS
SELECT 
    a.id,
    a.booking_id,
    a.start_time,
    a.end_time,
    a.status,
    p.name as patient_name,
    p.phone as patient_phone,
    d.name as doctor_name,
    d.specialty,
    c.name as clinic_name,
    s.name as service_name,
    s.price
FROM appointments a
JOIN patients p ON a.patient_id = p.id
JOIN doctors d ON a.doctor_id = d.id
JOIN clinics c ON a.clinic_id = c.id
JOIN services s ON a.service_id = s.id
WHERE a.status IN ('confirmed', 'checked_in');

-- View for current queue status
CREATE VIEW current_queue AS
SELECT 
    v.id,
    v.queue_number,
    v.status,
    v.check_in_time,
    v.visit_type,
    p.name as patient_name,
    p.phone as patient_phone,
    d.name as doctor_name,
    c.name as clinic_name,
    s.name as service_name
FROM visits v
JOIN patients p ON v.patient_id = p.id
JOIN doctors d ON v.doctor_id = d.id
JOIN clinics c ON v.clinic_id = c.id
JOIN services s ON v.service_id = s.id
WHERE v.status IN ('waiting', 'called', 'in_progress')
ORDER BY v.clinic_id, v.queue_number;

-- View for daily revenue
CREATE VIEW daily_revenue AS
SELECT 
    DATE(p.created_at) as date,
    c.name as clinic_name,
    COUNT(*) as total_visits,
    SUM(p.total_amount) as total_revenue,
    SUM(p.doctor_share) as doctor_earnings,
    SUM(p.center_share) as center_earnings
FROM payments p
JOIN visits v ON p.visit_id = v.id
JOIN clinics c ON v.clinic_id = c.id
WHERE p.status = 'paid'
GROUP BY DATE(p.created_at), c.id, c.name
ORDER BY date DESC;

-- =============================================
-- COMMENTS
-- =============================================

-- This schema supports:
-- 1. Multi-clinic medical practice management
-- 2. Appointment scheduling and queue management
-- 3. Patient medical records and prescriptions
-- 4. Financial tracking with revenue sharing
-- 5. SMS notifications and audit logging
-- 6. Performance-optimized queries with proper indexing
-- 7. Flexible doctor scheduling with JSON working hours
-- 8. Complete audit trail for compliance
