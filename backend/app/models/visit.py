from app import db
from datetime import datetime
import enum

class VisitStatus(enum.Enum):
    WAITING = "waiting"
    CALLED = "called"
    IN_PROGRESS = "in_progress"
    PENDING_PAYMENT = "pending_payment"
    COMPLETED = "completed"

class VisitType(enum.Enum):
    SCHEDULED = "scheduled"
    WALK_IN = "walk_in"

class Visit(db.Model):
    __tablename__ = 'visits'
    
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False, index=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False, index=True)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=False)
    clinic_id = db.Column(db.Integer, db.ForeignKey('clinics.id'), nullable=False, index=True)
    check_in_time = db.Column(db.DateTime, nullable=False)
    start_time = db.Column(db.DateTime)
    end_time = db.Column(db.DateTime)
    status = db.Column(db.Enum(VisitStatus), default=VisitStatus.WAITING, nullable=False, index=True)
    visit_type = db.Column(db.Enum(VisitType), nullable=False)
    queue_number = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    prescription = db.relationship('Prescription', back_populates='visit', uselist=False)
    payment = db.relationship('Payment', backref='visit', uselist=False)
    
    # Indexes for performance
    __table_args__ = (
        db.Index('idx_visit_clinic_status_date', 'clinic_id', 'status', db.func.date('created_at')),
        db.Index('idx_visit_doctor_status', 'doctor_id', 'status'),
        db.Index('idx_visit_patient_date', 'patient_id', db.func.date('created_at')),
    )
    
    def __init__(self, doctor_id, patient_id, service_id, clinic_id, check_in_time, 
                 visit_type, queue_number, appointment_id=None, start_time=None, end_time=None, status=None):
        self.doctor_id = doctor_id
        self.patient_id = patient_id
        self.service_id = service_id
        self.clinic_id = clinic_id
        self.check_in_time = check_in_time
        self.visit_type = visit_type
        self.queue_number = queue_number
        self.appointment_id = appointment_id
        self.start_time = start_time
        self.end_time = end_time
        if status:
            self.status = status
    
    def to_dict(self):
        """Convert visit to dictionary"""
        return {
            'id': self.id,
            'appointment_id': self.appointment_id,
            'doctor_id': self.doctor_id,
            'patient_id': self.patient_id,
            'service_id': self.service_id,
            'clinic_id': self.clinic_id,
            'check_in_time': self.check_in_time.isoformat() if self.check_in_time else None,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'status': self.status.value if self.status else None,
            'visit_type': self.visit_type.value if self.visit_type else None,
            'queue_number': self.queue_number,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            # Include related data
            'patient': self.patient.to_dict() if self.patient else None,
            'doctor': self.doctor.to_dict() if self.doctor else None,
            'clinic': self.clinic.to_dict() if self.clinic else None,
            'service': self.service.to_dict() if self.service else None
        }
    
    def __repr__(self):
        return f'<Visit {self.id} - Queue #{self.queue_number}>'
