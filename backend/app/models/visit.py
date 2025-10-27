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
    called_time = db.Column(db.DateTime)
    status = db.Column(db.Enum(VisitStatus), default=VisitStatus.WAITING, nullable=False, index=True)
    visit_type = db.Column(db.Enum(VisitType), nullable=False)
    queue_number = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    prescription = db.relationship('Prescription', back_populates='visit', uselist=False)
    payment = db.relationship('Payment', backref='visit', uselist=False)
    
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
            'called_time': self.called_time.isoformat() if self.called_time else None,
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
