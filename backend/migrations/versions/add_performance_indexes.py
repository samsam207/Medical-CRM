"""Add performance indexes

Revision ID: add_performance_indexes
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_performance_indexes'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add indexes for frequently queried columns
    
    # Appointments indexes
    try:
        op.create_index('idx_appointments_clinic_id', 'appointments', ['clinic_id'])
    except Exception:
        pass  # Index already exists
    op.create_index('idx_appointments_doctor_id', 'appointments', ['doctor_id'])
    op.create_index('idx_appointments_patient_id', 'appointments', ['patient_id'])
    op.create_index('idx_appointments_start_time', 'appointments', ['start_time'])
    op.create_index('idx_appointments_status', 'appointments', ['status'])
    op.create_index('idx_appointments_date', 'appointments', [sa.text('DATE(start_time)')])
    
    # Visits indexes
    op.create_index('idx_visits_appointment_id', 'visits', ['appointment_id'])
    op.create_index('idx_visits_patient_id', 'visits', ['patient_id'])
    op.create_index('idx_visits_doctor_id', 'visits', ['doctor_id'])
    op.create_index('idx_visits_status', 'visits', ['status'])
    op.create_index('idx_visits_check_in_time', 'visits', ['check_in_time'])
    op.create_index('idx_visits_queue_number', 'visits', ['queue_number'])
    
    # Payments indexes
    op.create_index('idx_payments_visit_id', 'payments', ['visit_id'])
    op.create_index('idx_payments_status', 'payments', ['status'])
    op.create_index('idx_payments_method', 'payments', ['payment_method'])
    op.create_index('idx_payments_created_at', 'payments', ['created_at'])
    op.create_index('idx_payments_date', 'payments', [sa.text('DATE(created_at)')])
    
    # Patients indexes
    op.create_index('idx_patients_phone', 'patients', ['phone'])
    op.create_index('idx_patients_name', 'patients', ['name'])
    op.create_index('idx_patients_created_at', 'patients', ['created_at'])
    
    # Users indexes
    op.create_index('idx_users_username', 'users', ['username'])
    op.create_index('idx_users_role', 'users', ['role'])
    
    # Notifications indexes
    op.create_index('idx_notifications_recipient', 'notifications', ['recipient'])
    op.create_index('idx_notifications_status', 'notifications', ['status'])
    op.create_index('idx_notifications_scheduled_time', 'notifications', ['scheduled_time'])
    
    # Audit log indexes
    op.create_index('idx_audit_log_user_id', 'audit_log', ['user_id'])
    op.create_index('idx_audit_log_action', 'audit_log', ['action'])
    op.create_index('idx_audit_log_timestamp', 'audit_log', ['timestamp'])
    op.create_index('idx_audit_log_date', 'audit_log', [sa.text('DATE(timestamp)')])


def downgrade():
    # Drop indexes
    op.drop_index('idx_appointments_clinic_id', 'appointments')
    op.drop_index('idx_appointments_doctor_id', 'appointments')
    op.drop_index('idx_appointments_patient_id', 'appointments')
    op.drop_index('idx_appointments_start_time', 'appointments')
    op.drop_index('idx_appointments_status', 'appointments')
    op.drop_index('idx_appointments_date', 'appointments')
    
    op.drop_index('idx_visits_appointment_id', 'visits')
    op.drop_index('idx_visits_patient_id', 'visits')
    op.drop_index('idx_visits_doctor_id', 'visits')
    op.drop_index('idx_visits_status', 'visits')
    op.drop_index('idx_visits_check_in_time', 'visits')
    op.drop_index('idx_visits_queue_number', 'visits')
    
    op.drop_index('idx_payments_visit_id', 'payments')
    op.drop_index('idx_payments_status', 'payments')
    op.drop_index('idx_payments_method', 'payments')
    op.drop_index('idx_payments_created_at', 'payments')
    op.drop_index('idx_payments_date', 'payments')
    
    op.drop_index('idx_patients_phone', 'patients')
    op.drop_index('idx_patients_name', 'patients')
    op.drop_index('idx_patients_created_at', 'patients')
    
    op.drop_index('idx_users_username', 'users')
    op.drop_index('idx_users_role', 'users')
    
    op.drop_index('idx_notifications_recipient', 'notifications')
    op.drop_index('idx_notifications_status', 'notifications')
    op.drop_index('idx_notifications_scheduled_time', 'notifications')
    
    op.drop_index('idx_audit_log_user_id', 'audit_log')
    op.drop_index('idx_audit_log_action', 'audit_log')
    op.drop_index('idx_audit_log_timestamp', 'audit_log')
    op.drop_index('idx_audit_log_date', 'audit_log')
