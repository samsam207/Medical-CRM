from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, socketio
from app.models.appointment import Appointment, AppointmentStatus
from app.models.visit import Visit, VisitStatus, VisitType
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.clinic import Clinic
from app.models.service import Service
from app.models.user import User, UserRole
from app.utils.decorators import receptionist_required, doctor_required
from app.services.queue_service import QueueService
from datetime import datetime, timedelta
import json

queue_bp = Blueprint('queue', __name__)

@queue_bp.route('/clinic/<int:clinic_id>', methods=['GET'])
@jwt_required()
def get_clinic_queue(clinic_id):
    """Get queue for a specific clinic"""
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 401
    
    # Check if user has access to this clinic
    if user.role == UserRole.DOCTOR:
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        if not doctor or doctor.clinic_id != clinic_id:
            return jsonify({'message': 'Access denied to this clinic'}), 403
    elif user.role not in [UserRole.RECEPTIONIST, UserRole.ADMIN]:
        return jsonify({'message': 'Insufficient permissions'}), 403
    
    queue_service = QueueService()
    queue_data = queue_service.get_clinic_queue(clinic_id)
    
    return jsonify(queue_data), 200

@queue_bp.route('/doctor/<int:user_id>', methods=['GET'])
@jwt_required()
def get_doctor_queue(user_id):
    """Get queue for a specific doctor by user_id"""
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 401
    
    # Check if user has access to this doctor
    if user.role == UserRole.DOCTOR:
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        if not doctor:
            return jsonify({'message': 'Doctor profile not found'}), 404
        # Use the doctor's actual ID
        doctor_id = doctor.id
    elif user.role in [UserRole.RECEPTIONIST, UserRole.ADMIN]:
        # For receptionist/admin, find doctor by user_id
        doctor = Doctor.query.filter_by(user_id=user_id).first()
        if not doctor:
            return jsonify({'message': 'Doctor not found'}), 404
        doctor_id = doctor.id
    else:
        return jsonify({'message': 'Insufficient permissions'}), 403
    
    queue_service = QueueService()
    queue_data = queue_service.get_doctor_queue(doctor_id)
    
    return jsonify(queue_data), 200

@queue_bp.route('/checkin', methods=['POST'])
@receptionist_required
def checkin_patient(data, current_user):
    """Check in a patient for their appointment"""
    appointment_id = data.get('appointment_id')
    
    if not appointment_id:
        return jsonify({'message': 'appointment_id is required'}), 400
    
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({'message': 'Appointment not found'}), 404
    
    # Check if appointment is confirmed
    if appointment.status != AppointmentStatus.CONFIRMED:
        return jsonify({'message': 'Only confirmed appointments can be checked in'}), 400
    
    # Check if already checked in
    if appointment.visit:
        return jsonify({'message': 'Patient already checked in'}), 400
    
    # Get next queue number for the clinic
    queue_service = QueueService()
    queue_number = queue_service.get_next_queue_number(appointment.clinic_id)
    
    # Create visit
    visit = Visit(
        appointment_id=appointment_id,
        doctor_id=appointment.doctor_id,
        patient_id=appointment.patient_id,
        service_id=appointment.service_id,
        clinic_id=appointment.clinic_id,
        check_in_time=datetime.utcnow(),
        visit_type=VisitType.SCHEDULED,
        queue_number=queue_number,
        status=VisitStatus.WAITING
    )
    
    db.session.add(visit)
    
    # Update appointment status
    appointment.status = AppointmentStatus.CHECKED_IN
    
    db.session.commit()
    
    # Emit real-time updates
    queue_data = queue_service.get_clinic_queue(appointment.clinic_id)
    socketio.emit('queue_updated', queue_data, room=f'clinic_{appointment.clinic_id}')
    
    # Emit to doctor room
    doctor_queue_data = queue_service.get_doctor_queue(appointment.doctor_id)
    socketio.emit('queue_updated', doctor_queue_data, room=f'doctor_{appointment.doctor_id}')
    
    # Emit new check-in event
    socketio.emit('new_checkin', {
        'visit': visit.to_dict(),
        'patient': visit.patient.to_dict(),
        'clinic_id': appointment.clinic_id,
        'doctor_id': appointment.doctor_id
    }, room=f'clinic_{appointment.clinic_id}')
    
    return jsonify({
        'message': 'Patient checked in successfully',
        'visit': visit.to_dict(),
        'queue_number': queue_number
    }), 201

@queue_bp.route('/call', methods=['POST'])
@doctor_required
def call_patient(data, current_user):
    """Call a patient from the queue"""
    visit_id = data.get('visit_id')
    
    if not visit_id:
        return jsonify({'message': 'visit_id is required'}), 400
    
    visit = Visit.query.get(visit_id)
    if not visit:
        return jsonify({'message': 'Visit not found'}), 404
    
    # Check if doctor has access to this visit
    doctor = Doctor.query.filter_by(user_id=current_user.id).first()
    if not doctor or doctor.id != visit.doctor_id:
        return jsonify({'message': 'Access denied to this visit'}), 403
    
    # Check if visit is in waiting status
    if visit.status != VisitStatus.WAITING:
        return jsonify({'message': 'Only waiting patients can be called'}), 400
    
    # Update visit status
    visit.status = VisitStatus.CALLED
    visit.called_time = datetime.utcnow()
    
    db.session.commit()
    
    # Emit real-time updates
    queue_service = QueueService()
    queue_data = queue_service.get_clinic_queue(visit.clinic_id)
    socketio.emit('queue_updated', queue_data, room=f'clinic_{visit.clinic_id}')
    
    doctor_queue_data = queue_service.get_doctor_queue(visit.doctor_id)
    socketio.emit('queue_updated', doctor_queue_data, room=f'doctor_{visit.doctor_id}')
    
    return jsonify({
        'message': 'Patient called successfully',
        'visit': visit.to_dict()
    }), 200

@queue_bp.route('/start', methods=['POST'])
@doctor_required
def start_consultation(data, current_user):
    """Start consultation with a patient"""
    visit_id = data.get('visit_id')
    
    if not visit_id:
        return jsonify({'message': 'visit_id is required'}), 400
    
    visit = Visit.query.get(visit_id)
    if not visit:
        return jsonify({'message': 'Visit not found'}), 404
    
    # Check if doctor has access to this visit
    doctor = Doctor.query.filter_by(user_id=current_user.id).first()
    if not doctor or doctor.id != visit.doctor_id:
        return jsonify({'message': 'Access denied to this visit'}), 403
    
    # Check if visit is called
    if visit.status != VisitStatus.CALLED:
        return jsonify({'message': 'Patient must be called first'}), 400
    
    # Update visit status
    visit.status = VisitStatus.IN_PROGRESS
    visit.consultation_start_time = datetime.utcnow()
    
    db.session.commit()
    
    # Emit real-time updates
    queue_service = QueueService()
    queue_data = queue_service.get_clinic_queue(visit.clinic_id)
    socketio.emit('queue_updated', queue_data, room=f'clinic_{visit.clinic_id}')
    
    doctor_queue_data = queue_service.get_doctor_queue(visit.doctor_id)
    socketio.emit('queue_updated', doctor_queue_data, room=f'doctor_{visit.doctor_id}')
    
    return jsonify({
        'message': 'Consultation started successfully',
        'visit': visit.to_dict()
    }), 200

@queue_bp.route('/complete', methods=['POST'])
@doctor_required
def complete_consultation(data, current_user):
    """Complete consultation with a patient"""
    visit_id = data.get('visit_id')
    notes = data.get('notes', '')
    
    if not visit_id:
        return jsonify({'message': 'visit_id is required'}), 400
    
    visit = Visit.query.get(visit_id)
    if not visit:
        return jsonify({'message': 'Visit not found'}), 404
    
    # Check if doctor has access to this visit
    doctor = Doctor.query.filter_by(user_id=current_user.id).first()
    if not doctor or doctor.id != visit.doctor_id:
        return jsonify({'message': 'Access denied to this visit'}), 403
    
    # Check if visit is in progress
    if visit.status != VisitStatus.IN_PROGRESS:
        return jsonify({'message': 'Consultation must be in progress to complete'}), 400
    
    # Update visit status
    visit.status = VisitStatus.COMPLETED
    visit.consultation_end_time = datetime.utcnow()
    visit.notes = notes
    
    # Update appointment status
    appointment = visit.appointment
    appointment.status = AppointmentStatus.COMPLETED
    
    db.session.commit()
    
    # Emit real-time updates
    queue_service = QueueService()
    queue_data = queue_service.get_clinic_queue(visit.clinic_id)
    socketio.emit('queue_updated', queue_data, room=f'clinic_{visit.clinic_id}')
    
    doctor_queue_data = queue_service.get_doctor_queue(visit.doctor_id)
    socketio.emit('queue_updated', doctor_queue_data, room=f'doctor_{visit.doctor_id}')
    
    return jsonify({
        'message': 'Consultation completed successfully',
        'visit': visit.to_dict()
    }), 200

@queue_bp.route('/skip', methods=['POST'])
@doctor_required
def skip_patient(data, current_user):
    """Skip a patient in the queue"""
    visit_id = data.get('visit_id')
    reason = data.get('reason', 'No show')
    
    if not visit_id:
        return jsonify({'message': 'visit_id is required'}), 400
    
    visit = Visit.query.get(visit_id)
    if not visit:
        return jsonify({'message': 'Visit not found'}), 404
    
    # Check if doctor has access to this visit
    doctor = Doctor.query.filter_by(user_id=current_user.id).first()
    if not doctor or doctor.id != visit.doctor_id:
        return jsonify({'message': 'Access denied to this visit'}), 403
    
    # Update visit status
    visit.status = VisitStatus.NO_SHOW
    visit.notes = f"Skipped: {reason}"
    
    # Update appointment status
    appointment = visit.appointment
    appointment.status = AppointmentStatus.NO_SHOW
    
    db.session.commit()
    
    # Emit real-time updates
    queue_service = QueueService()
    queue_data = queue_service.get_clinic_queue(visit.clinic_id)
    socketio.emit('queue_updated', queue_data, room=f'clinic_{visit.clinic_id}')
    
    doctor_queue_data = queue_service.get_doctor_queue(visit.doctor_id)
    socketio.emit('queue_updated', doctor_queue_data, room=f'doctor_{visit.doctor_id}')
    
    return jsonify({
        'message': 'Patient skipped successfully',
        'visit': visit.to_dict()
    }), 200
