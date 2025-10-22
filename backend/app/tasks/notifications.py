from celery import Celery
from app import create_app
from app.models.notification import Notification, NotificationStatus
from app.services.notification_service import NotificationService
from datetime import datetime
import logging

# Create Celery instance
celery = Celery('medical_crm')

# Configure Celery
celery.conf.update(
    broker_url='redis://localhost:6379/0',
    result_backend='redis://localhost:6379/0',
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

@celery.task
def send_sms_reminder(notification_id):
    """Send SMS reminder notification"""
    app = create_app()
    
    with app.app_context():
        try:
            notification = Notification.query.get(notification_id)
            if not notification:
                logging.error(f"Notification {notification_id} not found")
                return False
            
            # Mock SMS sending (replace with actual SMS service)
            logging.info(f"Sending SMS to {notification.recipient}: {notification.message}")
            
            # Simulate SMS sending delay
            import time
            time.sleep(1)
            
            # Mark as sent
            notification_service = NotificationService()
            notification_service.mark_notification_sent(notification_id)
            
            logging.info(f"SMS reminder sent successfully for notification {notification_id}")
            return True
            
        except Exception as e:
            logging.error(f"Failed to send SMS reminder {notification_id}: {str(e)}")
            
            # Mark as failed
            try:
                notification_service = NotificationService()
                notification_service.mark_notification_failed(notification_id)
            except:
                pass
            
            return False

@celery.task
def send_sms_confirmation(notification_id):
    """Send SMS confirmation notification"""
    app = create_app()
    
    with app.app_context():
        try:
            notification = Notification.query.get(notification_id)
            if not notification:
                logging.error(f"Notification {notification_id} not found")
                return False
            
            # Mock SMS sending (replace with actual SMS service)
            logging.info(f"Sending confirmation SMS to {notification.recipient}: {notification.message}")
            
            # Simulate SMS sending delay
            import time
            time.sleep(1)
            
            # Mark as sent
            notification_service = NotificationService()
            notification_service.mark_notification_sent(notification_id)
            
            logging.info(f"SMS confirmation sent successfully for notification {notification_id}")
            return True
            
        except Exception as e:
            logging.error(f"Failed to send SMS confirmation {notification_id}: {str(e)}")
            
            # Mark as failed
            try:
                notification_service = NotificationService()
                notification_service.mark_notification_failed(notification_id)
            except:
                pass
            
            return False

@celery.task
def send_sms_followup(notification_id):
    """Send SMS follow-up notification"""
    app = create_app()
    
    with app.app_context():
        try:
            notification = Notification.query.get(notification_id)
            if not notification:
                logging.error(f"Notification {notification_id} not found")
                return False
            
            # Mock SMS sending (replace with actual SMS service)
            logging.info(f"Sending follow-up SMS to {notification.recipient}: {notification.message}")
            
            # Simulate SMS sending delay
            import time
            time.sleep(1)
            
            # Mark as sent
            notification_service = NotificationService()
            notification_service.mark_notification_sent(notification_id)
            
            logging.info(f"SMS follow-up sent successfully for notification {notification_id}")
            return True
            
        except Exception as e:
            logging.error(f"Failed to send SMS follow-up {notification_id}: {str(e)}")
            
            # Mark as failed
            try:
                notification_service = NotificationService()
                notification_service.mark_notification_failed(notification_id)
            except:
                pass
            
            return False

@celery.task
def process_pending_notifications():
    """Process all pending notifications that are ready to send"""
    app = create_app()
    
    with app.app_context():
        try:
            notification_service = NotificationService()
            pending_notifications = notification_service.get_pending_notifications(limit=50)
            
            for notification in pending_notifications:
                if notification.notification_type.value == 'sms_reminder':
                    send_sms_reminder.delay(notification.id)
                elif notification.notification_type.value == 'sms_confirmation':
                    send_sms_confirmation.delay(notification.id)
                elif notification.notification_type.value == 'sms_followup':
                    send_sms_followup.delay(notification.id)
            
            logging.info(f"Processed {len(pending_notifications)} pending notifications")
            return len(pending_notifications)
            
        except Exception as e:
            logging.error(f"Failed to process pending notifications: {str(e)}")
            return 0

@celery.task
def schedule_sms_reminder(appointment_id, phone_number, message, scheduled_time=None):
    """Schedule SMS reminder for appointment"""
    app = create_app()
    
    with app.app_context():
        try:
            notification_service = NotificationService()
            notification = notification_service.schedule_sms_reminder(
                appointment_id, phone_number, message, scheduled_time
            )
            
            # Schedule the actual sending
            if scheduled_time:
                # Calculate delay in seconds
                delay = (scheduled_time - datetime.utcnow()).total_seconds()
                if delay > 0:
                    send_sms_reminder.apply_async(args=[notification.id], countdown=delay)
                else:
                    send_sms_reminder.delay(notification.id)
            else:
                send_sms_reminder.delay(notification.id)
            
            logging.info(f"Scheduled SMS reminder for appointment {appointment_id}")
            return notification.id
            
        except Exception as e:
            logging.error(f"Failed to schedule SMS reminder for appointment {appointment_id}: {str(e)}")
            return None

@celery.task
def schedule_sms_confirmation(appointment_id, phone_number, message):
    """Schedule SMS confirmation for appointment"""
    app = create_app()
    
    with app.app_context():
        try:
            notification_service = NotificationService()
            notification = notification_service.schedule_confirmation_sms(
                appointment_id, phone_number, message
            )
            
            # Send immediately
            send_sms_confirmation.delay(notification.id)
            
            logging.info(f"Scheduled SMS confirmation for appointment {appointment_id}")
            return notification.id
            
        except Exception as e:
            logging.error(f"Failed to schedule SMS confirmation for appointment {appointment_id}: {str(e)}")
            return None

@celery.task
def schedule_sms_followup(appointment_id, phone_number, message):
    """Schedule SMS follow-up for appointment"""
    app = create_app()
    
    with app.app_context():
        try:
            notification_service = NotificationService()
            notification = notification_service.schedule_followup_sms(
                appointment_id, phone_number, message
            )
            
            # Calculate delay for 2 weeks
            delay = 14 * 24 * 60 * 60  # 14 days in seconds
            send_sms_followup.apply_async(args=[notification.id], countdown=delay)
            
            logging.info(f"Scheduled SMS follow-up for appointment {appointment_id}")
            return notification.id
            
        except Exception as e:
            logging.error(f"Failed to schedule SMS follow-up for appointment {appointment_id}: {str(e)}")
            return None
