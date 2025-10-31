from app import db

# Import all models to ensure they are registered with SQLAlchemy
from .user import User, TokenBlocklist
from .clinic import Clinic
from .doctor import Doctor
from .doctor_schedule import DoctorSchedule
from .patient import Patient
from .service import Service
from .appointment import Appointment
from .visit import Visit
from .prescription import Prescription
from .payment import Payment
from .notification import Notification
from .audit_log import AuditLog

__all__ = [
    'User', 'TokenBlocklist', 'Clinic', 'Doctor', 'DoctorSchedule', 'Patient', 'Service',
    'Appointment', 'Visit', 'Prescription', 'Payment', 'Notification', 'AuditLog'
]
