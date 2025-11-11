from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
import enum

class UserRole(enum.Enum):
    ADMIN = "ADMIN"
    RECEPTIONIST = "RECEPTIONIST"
    DOCTOR = "DOCTOR"

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum(UserRole), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    created_appointments = db.relationship('Appointment', backref='creator', lazy='dynamic')
    audit_logs = db.relationship('AuditLog', backref='user', lazy='dynamic')
    
    def __init__(self, username, password, role):
        self.username = username
        self.set_password(password)
        self.role = role
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        return check_password_hash(self.password_hash, password)
    
    def generate_token(self):
        """Generate JWT token for user"""
        return create_access_token(identity=self.id)
    
    def to_dict(self, include_doctor=False):
        """Convert user to dictionary"""
        result = {
            'id': self.id,
            'username': self.username,
            'role': self.role.value,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        # Include linked doctor information if requested and user is a doctor
        if include_doctor and self.role == UserRole.DOCTOR:
            from app.models.doctor import Doctor
            doctor = Doctor.query.filter_by(user_id=self.id).first()
            if doctor:
                result['doctor'] = {
                    'id': doctor.id,
                    'name': doctor.name,
                    'specialty': doctor.specialty,
                    'clinic_id': doctor.clinic_id
                }
                # Include clinic name if available
                if doctor.clinic:
                    result['doctor']['clinic_name'] = doctor.clinic.name
        
        return result
    
    def __repr__(self):
        return f'<User {self.username}>'

class TokenBlocklist(db.Model):
    __tablename__ = 'token_blacklist'
    
    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<TokenBlocklist {self.jti}>'
