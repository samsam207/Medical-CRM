from app import db
from datetime import datetime

class DoctorSchedule(db.Model):
    """Doctor availability schedule with hourly granularity"""
    __tablename__ = 'doctor_schedules'
    
    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False, index=True)
    day_of_week = db.Column(db.Integer, nullable=False)  # 0=Sunday, 6=Saturday
    hour = db.Column(db.Integer, nullable=False)  # 0-23
    is_available = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    doctor = db.relationship('Doctor', backref='schedules')
    
    # Indexes
    __table_args__ = (
        db.UniqueConstraint('doctor_id', 'day_of_week', 'hour', name='_doctor_day_hour_uc'),
        db.Index('idx_doctor_schedule_availability', 'doctor_id', 'day_of_week', 'hour'),
    )
    
    def __init__(self, doctor_id, day_of_week, hour, is_available=True):
        self.doctor_id = doctor_id
        self.day_of_week = day_of_week
        self.hour = hour
        self.is_available = is_available
    
    def to_dict(self):
        """Convert schedule entry to dictionary"""
        return {
            'id': self.id,
            'doctor_id': self.doctor_id,
            'day_of_week': self.day_of_week,
            'hour': self.hour,
            'is_available': self.is_available,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<DoctorSchedule doctor={self.doctor_id} day={self.day_of_week} hour={self.hour}>'

