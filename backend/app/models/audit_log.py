from app import db
from datetime import datetime
import json

class AuditLog(db.Model):
    __tablename__ = 'audit_log'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    action = db.Column(db.String(100), nullable=False)
    entity_type = db.Column(db.String(50), nullable=False)
    entity_id = db.Column(db.Integer, nullable=False)
    details = db.Column(db.JSON)
    ip_address = db.Column(db.String(45))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def __init__(self, user_id, action, entity_type, entity_id, details=None, ip_address=None):
        self.user_id = user_id
        self.action = action
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.details = details if isinstance(details, dict) else json.loads(details) if details else {}
        self.ip_address = ip_address
    
    def to_dict(self):
        """Convert audit log to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'details': self.details,
            'ip_address': self.ip_address,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }
    
    # Indexes for performance
    __table_args__ = (
        db.Index('idx_audit_log_entity', 'entity_type', 'entity_id'),
        db.Index('idx_audit_log_user_timestamp', 'user_id', 'timestamp'),
        db.Index('idx_audit_log_action', 'action'),
        db.Index('idx_audit_log_timestamp', 'timestamp'),
    )

    def __repr__(self):
        return f'<AuditLog {self.action} - {self.entity_type}:{self.entity_id}>'
