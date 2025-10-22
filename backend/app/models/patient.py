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
    
    # Relationships
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
    
    def __init__(self, name, phone, address=None, age=None, gender=None, medical_history=None):
        self.name = name
        self.phone = phone
        self.address = address
        self.age = age
        self.gender = gender
        self.medical_history = medical_history
    
    def to_dict(self):
        """Convert patient to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'phone': self.phone,
            'address': self.address,
            'age': self.age,
            'gender': self.gender.value if self.gender else None,
            'medical_history': self.medical_history,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def get_recent_visits(self, limit=5):
        """Get recent visits for patient"""
        from app.models.visit import Visit
        return self.visits.order_by(Visit.created_at.desc()).limit(limit).all()
    
    def __repr__(self):
        return f'<Patient {self.name} - {self.phone}>'
