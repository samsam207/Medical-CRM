from app import db
from datetime import datetime
import enum

class AppointmentStatus(enum.Enum):
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class BookingSource(enum.Enum):
    PHONE = "phone"
    WALK_IN = "walk_in"
    ONLINE = "online"
    SYSTEM = "system"

class Appointment(db.Model):
    __tablename__ = 'appointments'
    
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    clinic_id = db.Column(db.Integer, db.ForeignKey('clinics.id'), nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False, index=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False, index=True)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False, index=True)
    end_time = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.Enum(AppointmentStatus), default=AppointmentStatus.CONFIRMED, nullable=False)
    booking_source = db.Column(db.Enum(BookingSource), nullable=False)
    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    visit = db.relationship('Visit', backref='appointment', uselist=False)
    
    # Indexes for performance
    __table_args__ = (
        db.Index('idx_appointment_doctor_date', 'doctor_id', db.func.date('start_time')),
        db.Index('idx_appointment_patient_date', 'patient_id', db.func.date('start_time')),
        db.Index('idx_appointment_clinic_date', 'clinic_id', db.func.date('start_time')),
        db.Index('idx_appointment_status_date', 'status', db.func.date('start_time')),
        db.Index('idx_appointment_booking_id', 'booking_id'),
    )
    
    def __init__(self, booking_id, clinic_id, doctor_id, patient_id, service_id, 
                 start_time, end_time, booking_source, created_by, notes=None, status=None):
        self.booking_id = booking_id
        self.clinic_id = clinic_id
        self.doctor_id = doctor_id
        self.patient_id = patient_id
        self.service_id = service_id
        self.start_time = start_time
        self.end_time = end_time
        self.booking_source = booking_source
        self.created_by = created_by
        self.notes = notes
        if status:
            self.status = status
    
    def to_dict(self):
        """Convert appointment to dictionary"""
        return {
            'id': self.id,
            'booking_id': self.booking_id,
            'clinic_id': self.clinic_id,
            'doctor_id': self.doctor_id,
            'patient_id': self.patient_id,
            'service_id': self.service_id,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'status': self.status.value if self.status else None,
            'booking_source': self.booking_source.value if self.booking_source else None,
            'notes': self.notes,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            # Include related data
            'patient': self.patient.to_dict() if self.patient else None,
            'doctor': self.doctor.to_dict() if self.doctor else None,
            'clinic': self.clinic.to_dict() if self.clinic else None,
            'service': self.service.to_dict() if self.service else None,
            'visit': self.visit.to_dict() if self.visit else None,
            'payment': self.visit.payment.to_dict() if self.visit and self.visit.payment else None
        }
    
    def __repr__(self):
        return f'<Appointment {self.booking_id}>'
