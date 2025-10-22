from app import db
from app.models.notification import Notification, NotificationType, NotificationStatus
from app.models.appointment import Appointment
from app.models.patient import Patient
from datetime import datetime, timedelta

class NotificationService:
    """Service for handling notification logic"""
    
    def schedule_sms_reminder(self, appointment_id, phone_number, message, scheduled_time=None):
        """Schedule SMS reminder for appointment"""
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            raise ValueError("Appointment not found")
        
        # Default to 1 hour before appointment
        if not scheduled_time:
            scheduled_time = appointment.start_time - timedelta(hours=1)
        
        # Create notification
        notification = Notification(
            recipient=phone_number,
            notification_type=NotificationType.SMS_REMINDER,
            message=message,
            scheduled_time=scheduled_time,
            related_appointment_id=appointment_id
        )
        
        db.session.add(notification)
        db.session.commit()
        
        return notification
    
    def schedule_confirmation_sms(self, appointment_id, phone_number, message):
        """Schedule confirmation SMS for appointment"""
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            raise ValueError("Appointment not found")
        
        # Schedule immediately
        scheduled_time = datetime.utcnow() + timedelta(minutes=1)
        
        # Create notification
        notification = Notification(
            recipient=phone_number,
            notification_type=NotificationType.SMS_CONFIRMATION,
            message=message,
            scheduled_time=scheduled_time,
            related_appointment_id=appointment_id
        )
        
        db.session.add(notification)
        db.session.commit()
        
        return notification
    
    def schedule_followup_sms(self, appointment_id, phone_number, message):
        """Schedule follow-up SMS for appointment"""
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            raise ValueError("Appointment not found")
        
        # Schedule for 2 weeks after appointment
        scheduled_time = appointment.start_time + timedelta(days=14)
        
        # Create notification
        notification = Notification(
            recipient=phone_number,
            notification_type=NotificationType.SMS_FOLLOWUP,
            message=message,
            scheduled_time=scheduled_time,
            related_appointment_id=appointment_id
        )
        
        db.session.add(notification)
        db.session.commit()
        
        return notification
    
    def get_pending_notifications(self, limit=100):
        """Get pending notifications that are ready to send"""
        now = datetime.utcnow()
        
        notifications = db.session.query(Notification).filter(
            Notification.status == NotificationStatus.PENDING,
            Notification.scheduled_time <= now
        ).order_by(Notification.scheduled_time).limit(limit).all()
        
        return notifications
    
    def mark_notification_sent(self, notification_id):
        """Mark notification as sent"""
        notification = Notification.query.get(notification_id)
        if not notification:
            raise ValueError("Notification not found")
        
        notification.mark_as_sent()
        db.session.commit()
        
        return notification
    
    def mark_notification_failed(self, notification_id):
        """Mark notification as failed"""
        notification = Notification.query.get(notification_id)
        if not notification:
            raise ValueError("Notification not found")
        
        notification.mark_as_failed()
        db.session.commit()
        
        return notification
    
    def get_notification_stats(self, start_date, end_date):
        """Get notification statistics for date range"""
        total_notifications = db.session.query(Notification).filter(
            db.func.date(Notification.created_at) >= start_date,
            db.func.date(Notification.created_at) <= end_date
        ).count()
        
        sent_notifications = db.session.query(Notification).filter(
            db.func.date(Notification.created_at) >= start_date,
            db.func.date(Notification.created_at) <= end_date,
            Notification.status == NotificationStatus.SENT
        ).count()
        
        failed_notifications = db.session.query(Notification).filter(
            db.func.date(Notification.created_at) >= start_date,
            db.func.date(Notification.created_at) <= end_date,
            Notification.status == NotificationStatus.FAILED
        ).count()
        
        pending_notifications = db.session.query(Notification).filter(
            db.func.date(Notification.created_at) >= start_date,
            db.func.date(Notification.created_at) <= end_date,
            Notification.status == NotificationStatus.PENDING
        ).count()
        
        return {
            'total': total_notifications,
            'sent': sent_notifications,
            'failed': failed_notifications,
            'pending': pending_notifications,
            'success_rate': (sent_notifications / total_notifications * 100) if total_notifications > 0 else 0
        }
    
    def create_appointment_reminder_message(self, appointment):
        """Create reminder message for appointment"""
        patient_name = appointment.patient.name
        doctor_name = appointment.doctor.name
        clinic_name = appointment.clinic.name
        appointment_time = appointment.start_time.strftime('%H:%M')
        appointment_date = appointment.start_time.strftime('%Y-%m-%d')
        
        message = f"Hi {patient_name}, this is a reminder that you have an appointment with Dr. {doctor_name} at {clinic_name} on {appointment_date} at {appointment_time}. Please arrive 10 minutes early. Thank you!"
        
        return message
    
    def create_appointment_confirmation_message(self, appointment):
        """Create confirmation message for appointment"""
        patient_name = appointment.patient.name
        doctor_name = appointment.doctor.name
        clinic_name = appointment.clinic.name
        appointment_time = appointment.start_time.strftime('%H:%M')
        appointment_date = appointment.start_time.strftime('%Y-%m-%d')
        booking_id = appointment.booking_id
        
        message = f"Hi {patient_name}, your appointment with Dr. {doctor_name} at {clinic_name} on {appointment_date} at {appointment_time} has been confirmed. Booking ID: {booking_id}. Thank you!"
        
        return message
    
    def create_followup_message(self, appointment):
        """Create follow-up message for appointment"""
        patient_name = appointment.patient.name
        doctor_name = appointment.doctor.name
        
        message = f"Hi {patient_name}, we hope you had a good experience with Dr. {doctor_name}. Please don't hesitate to contact us if you have any questions or need to schedule another appointment. Thank you!"
        
        return message
