from app import db
from datetime import datetime
from decimal import Decimal

class Service(db.Model):
    __tablename__ = 'services'
    
    id = db.Column(db.Integer, primary_key=True)
    clinic_id = db.Column(db.Integer, db.ForeignKey('clinics.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    duration = db.Column(db.Integer, nullable=False)  # duration in minutes
    price = db.Column(db.Numeric(10, 2), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    appointments = db.relationship('Appointment', backref='service', lazy='dynamic')
    visits = db.relationship('Visit', backref='service', lazy='dynamic')
    
    def __init__(self, clinic_id, name, duration, price, is_active=True):
        self.clinic_id = clinic_id
        self.name = name
        self.duration = duration
        self.price = Decimal(str(price))  # Ensure proper decimal handling
        self.is_active = is_active
    
    def to_dict(self):
        """Convert service to dictionary"""
        return {
            'id': self.id,
            'clinic_id': self.clinic_id,
            'name': self.name,
            'duration': self.duration,
            'price': float(self.price),
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Service {self.name} - {self.price}>'
