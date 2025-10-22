from app import db
from datetime import datetime

class Prescription(db.Model):
    __tablename__ = 'prescriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    visit_id = db.Column(db.Integer, db.ForeignKey('visits.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False, index=True)
    diagnosis = db.Column(db.Text, nullable=False)
    medications = db.Column(db.Text, nullable=False)
    notes = db.Column(db.Text)
    image_path = db.Column(db.String(255))  # optional photo upload
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    visit = db.relationship('Visit', back_populates='prescription')
    doctor = db.relationship('Doctor', back_populates='prescriptions')
    
    def __init__(self, visit_id, doctor_id, diagnosis, medications, notes=None, image_path=None):
        self.visit_id = visit_id
        self.doctor_id = doctor_id
        self.diagnosis = diagnosis
        self.medications = medications
        self.notes = notes
        self.image_path = image_path
    
    def to_dict(self):
        """Convert prescription to dictionary"""
        return {
            'id': self.id,
            'visit_id': self.visit_id,
            'doctor_id': self.doctor_id,
            'diagnosis': self.diagnosis,
            'medications': self.medications,
            'notes': self.notes,
            'image_path': self.image_path,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Prescription {self.id} for Visit {self.visit_id}>'
