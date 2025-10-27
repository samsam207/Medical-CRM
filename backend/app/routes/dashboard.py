from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, cache
from app.models.appointment import Appointment, AppointmentStatus
from app.models.visit import Visit, VisitStatus
from app.models.payment import Payment, PaymentStatus
from app.models.user import User, UserRole
from app.models.doctor import Doctor
from app.models.clinic import Clinic
from app.models.notification import Notification
from app.utils.decorators import doctor_required
from datetime import datetime, timedelta
import json

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """Get dashboard statistics"""
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 401
    
    # Cache key based on user and date
    today = datetime.now().date()
    cache_key = f'dashboard_stats_{user.id}_{today}'
    
    # Try to get from cache first
    cached_stats = cache.get(cache_key)
    if cached_stats:
        return jsonify(cached_stats), 200
    
    # Calculate stats
    stats = {}
    
    if user.role == UserRole.RECEPTIONIST or user.role == UserRole.ADMIN:
        # Receptionist/Admin dashboard
        stats = get_receptionist_stats(today)
    elif user.role == UserRole.DOCTOR:
        # Doctor dashboard
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        if doctor:
            stats = get_doctor_stats(doctor.id, today)
        else:
            stats = get_receptionist_stats(today)  # Fallback
    
    # Cache for 30 seconds for more responsive updates
    cache.set(cache_key, stats, timeout=30)
    
    return jsonify(stats), 200

def get_receptionist_stats(date):
    """Get statistics for receptionist dashboard"""
    # Today's appointments
    today_appointments = db.session.query(Appointment).filter(
        db.func.date(Appointment.start_time) == date
    ).count()
    
    confirmed_appointments = db.session.query(Appointment).filter(
        db.func.date(Appointment.start_time) == date,
        Appointment.status == AppointmentStatus.CONFIRMED
    ).count()
    
    checked_in_appointments = db.session.query(Appointment).filter(
        db.func.date(Appointment.start_time) == date,
        Appointment.status == AppointmentStatus.CHECKED_IN
    ).count()
    
    completed_appointments = db.session.query(Appointment).filter(
        db.func.date(Appointment.start_time) == date,
        Appointment.status == AppointmentStatus.COMPLETED
    ).count()
    
    # Today's visits (count by creation date for simplicity)
    today_visits = db.session.query(Visit).filter(
        db.func.date(Visit.created_at) == date
    ).count()
    
    waiting_visits = db.session.query(Visit).filter(
        db.func.date(Visit.created_at) == date,
        Visit.status == VisitStatus.WAITING
    ).count()
    
    in_progress_visits = db.session.query(Visit).filter(
        db.func.date(Visit.created_at) == date,
        Visit.status == VisitStatus.IN_PROGRESS
    ).count()
    
    pending_payment_visits = db.session.query(Visit).filter(
        db.func.date(Visit.created_at) == date,
        Visit.status == VisitStatus.PENDING_PAYMENT
    ).count()
    
    # Today's payments
    today_payments = db.session.query(Payment).filter(
        db.func.date(Payment.created_at) == date
    ).count()
    
    paid_payments = db.session.query(Payment).filter(
        db.func.date(Payment.created_at) == date,
        Payment.status == PaymentStatus.PAID
    ).count()
    
    # Revenue
    today_revenue = db.session.query(db.func.sum(Payment.amount_paid)).filter(
        db.func.date(Payment.created_at) == date,
        Payment.status == PaymentStatus.PAID
    ).scalar() or 0
    
    # Alerts
    alerts = []
    
    # Check for doctors who haven't checked in
    doctors_without_checkin = db.session.query(Doctor).filter(
        ~Doctor.id.in_(
            db.session.query(Visit.doctor_id).filter(
                db.func.date(Visit.created_at) == date
            )
        )
    ).all()
    
    for doctor in doctors_without_checkin:
        alerts.append({
            'type': 'warning',
            'message': f'Dr. {doctor.name} has not checked in today',
            'doctor_id': doctor.id
        })
    
    # Check for overdue payments
    overdue_payments = db.session.query(Visit).filter(
        Visit.status == VisitStatus.PENDING_PAYMENT,
        Visit.created_at < datetime.now() - timedelta(hours=2)
    ).count()
    
    if overdue_payments > 0:
        alerts.append({
            'type': 'error',
            'message': f'{overdue_payments} visits have overdue payments',
            'count': overdue_payments
        })
    
    return {
        'appointments': {
            'total': today_appointments,
            'confirmed': confirmed_appointments,
            'checked_in': checked_in_appointments,
            'completed': completed_appointments
        },
        'visits': {
            'total': today_visits,
            'waiting': waiting_visits,
            'in_progress': in_progress_visits,
            'pending_payment': pending_payment_visits
        },
        'payments': {
            'total': today_payments,
            'paid': paid_payments,
            'revenue': float(today_revenue)
        },
        'alerts': alerts,
        'date': date.isoformat()
    }

def get_doctor_stats(doctor_id, date):
    """Get statistics for doctor dashboard"""
    # Doctor's appointments today
    today_appointments = db.session.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        db.func.date(Appointment.start_time) == date
    ).count()
    
    # Doctor's visits today (based on creation date for simplicity)
    today_visits = db.session.query(Visit).filter(
        Visit.doctor_id == doctor_id,
        db.func.date(Visit.created_at) == date
    ).count()
    
    # Doctor's queue
    waiting_patients = db.session.query(Visit).filter(
        Visit.doctor_id == doctor_id,
        Visit.status == VisitStatus.WAITING,
        db.func.date(Visit.created_at) == date
    ).count()
    
    called_patients = db.session.query(Visit).filter(
        Visit.doctor_id == doctor_id,
        Visit.status == VisitStatus.CALLED,
        db.func.date(Visit.created_at) == date
    ).count()
    
    in_progress_patients = db.session.query(Visit).filter(
        Visit.doctor_id == doctor_id,
        Visit.status == VisitStatus.IN_PROGRESS,
        db.func.date(Visit.created_at) == date
    ).count()
    
    completed_patients = db.session.query(Visit).filter(
        Visit.doctor_id == doctor_id,
        Visit.status == VisitStatus.COMPLETED,
        db.func.date(Visit.created_at) == date
    ).count()
    
    # Doctor's revenue today
    today_revenue = db.session.query(db.func.sum(Payment.doctor_share)).filter(
        Payment.visit.has(Visit.doctor_id == doctor_id),
        db.func.date(Payment.created_at) == date,
        Payment.status == PaymentStatus.PAID
    ).scalar() or 0
    
    return {
        'appointments': {
            'total': today_appointments
        },
        'visits': {
            'total': today_visits,
            'waiting': waiting_patients,
            'called': called_patients,
            'in_progress': in_progress_patients,
            'completed': completed_patients
        },
        'revenue': {
            'doctor_share': float(today_revenue)
        },
        'date': date.isoformat()
    }

@dashboard_bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get recent notifications for user"""
    current_user_id = int(get_jwt_identity())
    
    # Get recent notifications (last 24 hours)
    since = datetime.now() - timedelta(hours=24)
    
    notifications = db.session.query(Notification).filter(
        Notification.created_at >= since
    ).order_by(Notification.created_at.desc()).limit(20).all()
    
    return jsonify({
        'notifications': [notification.to_dict() for notification in notifications]
    }), 200
