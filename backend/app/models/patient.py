from app import db
from datetime import datetime
import enum

class Gender(enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"

class Patient(db.Model):
    __tablename__ = 'patients'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, index=True)
    phone = db.Column(db.String(20), unique=True, nullable=False, index=True)
    address = db.Column(db.Text)
    age = db.Column(db.Integer)
    gender = db.Column(db.Enum(Gender))
    medical_history = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign keys for clinic and doctor assignment
    clinic_id = db.Column(db.Integer, db.ForeignKey('clinics.id', ondelete='SET NULL'), nullable=True, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Relationships
    clinic = db.relationship('Clinic', backref='assigned_patients', lazy='select')
    doctor = db.relationship('Doctor', backref='assigned_patients', lazy='select')
    appointments = db.relationship('Appointment', backref='patient', lazy='dynamic')
    visits = db.relationship('Visit', backref='patient', lazy='dynamic')
    payments = db.relationship('Payment', backref='patient', lazy='dynamic')
    
    # Indexes for performance
    __table_args__ = (
        db.Index('idx_patient_phone', 'phone'),
        db.Index('idx_patient_name', 'name'),
        db.Index('idx_patient_gender', 'gender'),
        db.Index('idx_patient_created_at', 'created_at'),
    )
    
    def __init__(self, name, phone, address=None, age=None, gender=None, medical_history=None, clinic_id=None, doctor_id=None):
        self.name = name
        self.phone = phone
        self.address = address
        self.age = age
        self.gender = gender
        self.medical_history = medical_history
        self.clinic_id = clinic_id
        self.doctor_id = doctor_id
    
    def to_dict(self):
        """Convert patient to dictionary"""
        result = {
            'id': self.id,
            'name': self.name,
            'phone': self.phone,
            'address': self.address,
            'age': self.age,
            'gender': self.gender.value if self.gender else None,
            'medical_history': self.medical_history,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'clinic_id': self.clinic_id,
            'doctor_id': self.doctor_id
        }
        
        # Include clinic and doctor info if available
        if self.clinic:
            result['clinic'] = {
                'id': self.clinic.id,
                'name': self.clinic.name,
                'room_number': self.clinic.room_number
            }
        if self.doctor:
            result['doctor'] = {
                'id': self.doctor.id,
                'name': self.doctor.name,
                'specialty': self.doctor.specialty
            }
        
        return result
    
    def get_recent_visits(self, limit=5):
        """Get recent visits for patient"""
        from app.models.visit import Visit
        return self.visits.order_by(Visit.created_at.desc()).limit(limit).all()
    
    def __repr__(self):
        return f'<Patient {self.name} - {self.phone}>'
