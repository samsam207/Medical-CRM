from app import db
from datetime import datetime

class Clinic(db.Model):
    __tablename__ = 'clinics'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    room_number = db.Column(db.String(20), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    doctors = db.relationship('Doctor', backref='clinic', lazy='dynamic')
    services = db.relationship('Service', backref='clinic', lazy='dynamic')
    appointments = db.relationship('Appointment', backref='clinic', lazy='dynamic')
    visits = db.relationship('Visit', backref='clinic', lazy='dynamic')
    
    def to_dict(self):
        """Convert clinic to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'room_number': self.room_number,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Clinic {self.name}>'
