from app import db
from datetime import datetime
import json

class Doctor(db.Model):
    __tablename__ = 'doctors'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    name = db.Column(db.String(100), nullable=False, index=True)
    specialty = db.Column(db.String(100), nullable=False)
    working_days = db.Column(db.JSON, nullable=False)  # ["Monday", "Wednesday"]
    working_hours = db.Column(db.JSON, nullable=False)  # {"start": "09:00", "end": "17:00"}
    clinic_id = db.Column(db.Integer, db.ForeignKey('clinics.id'), nullable=False)
    share_percentage = db.Column(db.Float, default=0.7, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    appointments = db.relationship('Appointment', backref='doctor', lazy='dynamic')
    visits = db.relationship('Visit', backref='doctor', lazy='dynamic')
    prescriptions = db.relationship('Prescription', back_populates='doctor', lazy='dynamic')
    
    # Indexes for performance
    __table_args__ = (
        db.Index('idx_doctor_clinic', 'clinic_id'),
        db.Index('idx_doctor_specialty', 'specialty'),
        db.Index('idx_doctor_user', 'user_id'),
    )
    
    def __init__(self, name, specialty, working_days, working_hours, clinic_id, share_percentage=0.7, user_id=None):
        self.name = name
        self.specialty = specialty
        self.working_days = working_days if isinstance(working_days, list) else json.loads(working_days)
        self.working_hours = working_hours if isinstance(working_hours, dict) else json.loads(working_hours)
        self.clinic_id = clinic_id
        self.share_percentage = share_percentage
        self.user_id = user_id
    
    def is_working_on_day(self, day_name):
        """Check if doctor works on specific day"""
        return day_name in self.working_days
    
    def get_working_hours(self):
        """Get working hours as dict"""
        return self.working_hours
    
    def get_availability_for_day(self, day_of_week):
        """Get available hours for a specific day (0=Sunday, 6=Saturday)"""
        from app.models.doctor_schedule import DoctorSchedule
        schedule = DoctorSchedule.query.filter_by(
            doctor_id=self.id,
            day_of_week=day_of_week,
            is_available=True
        ).all()
        return [s.hour for s in schedule]
    
    def is_available_at(self, day_of_week, hour):
        """
        Check if doctor is available at specific day and hour
        Args:
            day_of_week: 0=Monday, 6=Sunday (Python datetime.weekday() format)
        Returns:
            True if available, False otherwise
        """
        from app.models.doctor_schedule import DoctorSchedule
        # Convert Python weekday (Monday=0) to our format (Sunday=0)
        # Python: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
        # Our DB: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
        schedule = DoctorSchedule.query.filter_by(
            doctor_id=self.id,
            day_of_week=day_of_week,
            hour=hour,
            is_available=True
        ).first()
        return schedule is not None
    
    def get_full_schedule(self):
        """Get complete 7x24 schedule"""
        from app.models.doctor_schedule import DoctorSchedule
        schedules = DoctorSchedule.query.filter_by(doctor_id=self.id).all()
        schedule_dict = {}
        for s in schedules:
            if s.day_of_week not in schedule_dict:
                schedule_dict[s.day_of_week] = {}
            schedule_dict[s.day_of_week][s.hour] = s.is_available
        return schedule_dict
    
    def to_dict(self, include_schedule=False):
        """
        Convert doctor to dictionary
        Args:
            include_schedule: If True, fetch and include schedule data (may cause N+1 if called in loop)
        """
        result = {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'specialty': self.specialty,
            'working_days': self.working_days,
            'working_hours': self.working_hours,
            'clinic_id': self.clinic_id,
            'share_percentage': self.share_percentage,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        # Only include schedule if explicitly requested (to avoid N+1 queries)
        if include_schedule:
            from app.models.doctor_schedule import DoctorSchedule
            schedules = DoctorSchedule.query.filter_by(doctor_id=self.id).all()
            result['schedule'] = [s.to_dict() for s in schedules]
        else:
            result['schedule'] = []
        
        return result
    
    def __repr__(self):
        return f'<Doctor {self.name} - {self.specialty}>'
