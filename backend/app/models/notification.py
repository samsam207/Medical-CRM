from app import db
from datetime import datetime
import enum

class NotificationType(enum.Enum):
    SMS_REMINDER = "sms_reminder"
    SMS_CONFIRMATION = "sms_confirmation"
    SMS_FOLLOWUP = "sms_followup"

class NotificationStatus(enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    recipient = db.Column(db.String(100), nullable=False)  # phone number
    notification_type = db.Column(db.Enum(NotificationType), nullable=False)
    message = db.Column(db.Text, nullable=False)
    scheduled_time = db.Column(db.DateTime, nullable=False, index=True)
    sent_at = db.Column(db.DateTime)
    status = db.Column(db.Enum(NotificationStatus), default=NotificationStatus.PENDING, nullable=False, index=True)
    related_appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __init__(self, recipient, notification_type, message, scheduled_time, related_appointment_id=None):
        self.recipient = recipient
        self.notification_type = notification_type
        self.message = message
        self.scheduled_time = scheduled_time
        self.related_appointment_id = related_appointment_id
    
    def mark_as_sent(self):
        """Mark notification as sent"""
        self.status = NotificationStatus.SENT
        self.sent_at = datetime.utcnow()
    
    def mark_as_failed(self):
        """Mark notification as failed"""
        self.status = NotificationStatus.FAILED
    
    def to_dict(self):
        """Convert notification to dictionary"""
        return {
            'id': self.id,
            'recipient': self.recipient,
            'notification_type': self.notification_type.value if self.notification_type else None,
            'message': self.message,
            'scheduled_time': self.scheduled_time.isoformat() if self.scheduled_time else None,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'status': self.status.value if self.status else None,
            'related_appointment_id': self.related_appointment_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    # Indexes for performance
    __table_args__ = (
        db.Index('idx_notification_recipient', 'recipient'),
        db.Index('idx_notification_status_scheduled', 'status', 'scheduled_time'),
        db.Index('idx_notification_appointment', 'related_appointment_id'),
        db.Index('idx_notification_type', 'notification_type'),
    )

    def __repr__(self):
        return f'<Notification {self.id} - {self.notification_type.value}>'
