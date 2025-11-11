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

queue_bp = Blueprint('queue', __name__)

@queue_bp.route('/clinic/<int:clinic_id>', methods=['GET'])
@jwt_required()
def get_clinic_queue(clinic_id):
    """Get queue for a specific clinic with optional date range filtering"""
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
    
    # Get date range parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Parse dates if provided
    if start_date:
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
    
    if end_date:
        try:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
    
    queue_service = QueueService()
    queue_data = queue_service.get_clinic_queue(clinic_id, start_date, end_date)
    
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
def checkin_patient(current_user):
    """Check in a patient for their appointment"""
    data = request.get_json()
    appointment_id = data.get('appointment_id')
    
    if not appointment_id:
        return jsonify({'message': 'appointment_id is required'}), 400
    
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({'message': 'Appointment not found'}), 404
    
    # Check if appointment is confirmed
    if appointment.status != AppointmentStatus.CONFIRMED:
        return jsonify({'message': 'Only confirmed appointments can be checked in'}), 400
    
    # Get or create visit
    visit = Visit.query.filter_by(appointment_id=appointment_id).first()
    
    if visit:
        # Visit already exists (auto-created with appointment) - update check-in time
        if appointment.status == AppointmentStatus.CHECKED_IN:
            return jsonify({'message': 'Patient already checked in'}), 400
        # Update check-in time to current time (actual check-in)
        visit.check_in_time = datetime.utcnow()
        visit.status = VisitStatus.WAITING
    else:
        # No visit exists - create one (shouldn't normally happen but handle it)
        queue_service = QueueService()
        queue_number = queue_service.get_next_queue_number(appointment.clinic_id)
        
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
    
    # Update appointment status to checked in
    appointment.status = AppointmentStatus.CHECKED_IN
    
    db.session.commit()
    
    # Emit real-time updates
    queue_service = QueueService()
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
@jwt_required()
def call_patient():
    """Call a patient from the queue"""
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return jsonify({'message': 'User not found'}), 401
    
    # Allow receptionist, admin, and doctor roles
    if current_user.role not in [UserRole.RECEPTIONIST, UserRole.ADMIN, UserRole.DOCTOR]:
        return jsonify({'message': 'Insufficient permissions'}), 403
    
    data = request.get_json()
    visit_id = data.get('visit_id')
    
    if not visit_id:
        return jsonify({'message': 'visit_id is required'}), 400
    
    visit = Visit.query.get(visit_id)
    if not visit:
        return jsonify({'message': 'Visit not found'}), 404
    
    # Check if user has access to this visit
    if current_user.role == UserRole.DOCTOR:
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
@receptionist_required
def start_consultation(current_user):
    """Start consultation with a patient - only receptionists can do this"""
    
    data = request.get_json()
    visit_id = data.get('visit_id')
    
    if not visit_id:
        return jsonify({'message': 'visit_id is required'}), 400
    
    visit = Visit.query.get(visit_id)
    if not visit:
        return jsonify({'message': 'Visit not found'}), 404
    
    # Check if user has access to this visit
    if current_user.role == UserRole.DOCTOR:
        doctor = Doctor.query.filter_by(user_id=current_user.id).first()
        if not doctor or doctor.id != visit.doctor_id:
            return jsonify({'message': 'Access denied to this visit'}), 403
    
    # Check if visit is called
    if visit.status != VisitStatus.CALLED:
        return jsonify({'message': 'Patient must be called first'}), 400
    
    # Update visit status
    visit.status = VisitStatus.IN_PROGRESS
    if not visit.start_time:
        visit.start_time = datetime.utcnow()
    
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
@jwt_required()
def complete_consultation():
    """Complete consultation with a patient"""
    from flask import current_app
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return jsonify({'message': 'User not found'}), 401
    
    # Allow receptionist, admin, and doctor roles
    if current_user.role not in [UserRole.RECEPTIONIST, UserRole.ADMIN, UserRole.DOCTOR]:
        return jsonify({'message': 'Insufficient permissions'}), 403
    
    data = request.get_json()
    visit_id = data.get('visit_id') or data.get('visitId')  # Support both formats
    notes = data.get('notes', '')
    
    current_app.logger.info(f"Complete consultation request: visit_id={visit_id}, user={current_user.id}")
    
    if not visit_id:
        return jsonify({'message': 'visit_id is required'}), 400
    
    # Use filter_by instead of get to avoid primary key issues
    visit = Visit.query.filter_by(id=visit_id).first()
    if not visit:
        current_app.logger.error(f"Visit not found: {visit_id}")
        return jsonify({'message': 'Visit not found'}), 404
    
    current_app.logger.info(f"Visit found: id={visit.id}, status={visit.status}")
    
    # Check if user has access to this visit
    if current_user.role == UserRole.DOCTOR:
        doctor = Doctor.query.filter_by(user_id=current_user.id).first()
        if not doctor or doctor.id != visit.doctor_id:
            return jsonify({'message': 'Access denied to this visit'}), 403
    
    # Complete consultation using service
    try:
        queue_service = QueueService()
        visit = queue_service.complete_consultation(visit_id, notes)
        current_app.logger.info(f"Consultation completed successfully: visit_id={visit_id}")
    except ValueError as e:
        current_app.logger.error(f"Error completing consultation: {str(e)}")
        return jsonify({'message': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Unexpected error completing consultation: {str(e)}")
        return jsonify({'message': f'Unexpected error: {str(e)}'}), 500
    
    # Emit real-time updates
    queue_data = queue_service.get_clinic_queue(visit.clinic_id)
    socketio.emit('queue_updated', queue_data, room=f'clinic_{visit.clinic_id}')
    
    doctor_queue_data = queue_service.get_doctor_queue(visit.doctor_id)
    socketio.emit('queue_updated', doctor_queue_data, room=f'doctor_{visit.doctor_id}')
    
    return jsonify({
        'message': 'Consultation completed successfully',
        'visit': visit.to_dict()
    }), 200

@queue_bp.route('/skip', methods=['POST'])
@receptionist_required
def skip_patient(current_user):
    """Skip a patient in the queue"""
    data = request.get_json()
    visit_id = data.get('visit_id')
    reason = data.get('reason', 'No show')
    
    if not visit_id:
        return jsonify({'message': 'visit_id is required'}), 400
    
    visit = Visit.query.get(visit_id)
    if not visit:
        return jsonify({'message': 'Visit not found'}), 404
    
    # Check if user has access to this visit
    if current_user.role == UserRole.DOCTOR:
        doctor = Doctor.query.filter_by(user_id=current_user.id).first()
        if not doctor or doctor.id != visit.doctor_id:
            return jsonify({'message': 'Access denied to this visit'}), 403
    elif current_user.role not in [UserRole.RECEPTIONIST, UserRole.ADMIN]:
        return jsonify({'message': 'Insufficient permissions'}), 403
    
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

@queue_bp.route('/upcoming', methods=['GET'])
@jwt_required()
def get_upcoming_appointments():
    """Get upcoming appointments that haven't been checked in"""
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 401
    
    if user.role not in [UserRole.RECEPTIONIST, UserRole.ADMIN]:
        return jsonify({'message': 'Insufficient permissions'}), 403
    
    # Get parameters
    date_str = request.args.get('date')
    clinic_id = request.args.get('clinic_id', type=int)
    
    if not date_str:
        return jsonify({'message': 'date parameter is required'}), 400
    
    try:
        date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    queue_service = QueueService()
    appointments = queue_service.get_upcoming_appointments(date, clinic_id)
    
    return jsonify({
        'appointments': appointments,
        'date': date.isoformat(),
        'clinic_id': clinic_id
    }), 200

@queue_bp.route('/appointments', methods=['GET'])
@jwt_required()
def get_all_appointments_for_date():
    """Get all appointments for a specific date (including checked-in ones)"""
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 401
    
    if user.role not in [UserRole.RECEPTIONIST, UserRole.ADMIN]:
        return jsonify({'message': 'Insufficient permissions'}), 403
    
    # Get parameters
    date_str = request.args.get('date')
    clinic_id = request.args.get('clinic_id', type=int)
    
    if not date_str:
        return jsonify({'message': 'date parameter is required'}), 400
    
    try:
        date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    queue_service = QueueService()
    appointments = queue_service.get_all_appointments_for_date(date, clinic_id)
    
    return jsonify({
        'appointments': appointments,
        'date': date.isoformat(),
        'clinic_id': clinic_id
    }), 200

@queue_bp.route('/reorder', methods=['PUT'])
@receptionist_required
def reorder_queue(current_user):
    """Reorder queue by moving a visit to a new position"""
    data = request.get_json()
    visit_id = data.get('visit_id')
    new_position = data.get('new_position')
    
    if not visit_id:
        return jsonify({'message': 'visit_id is required'}), 400
    
    if not new_position or not isinstance(new_position, int):
        return jsonify({'message': 'new_position is required and must be an integer'}), 400
    
    queue_service = QueueService()
    
    try:
        visit = queue_service.reorder_queue(visit_id, new_position)
        
        # Emit real-time updates
        queue_data = queue_service.get_clinic_queue(visit.clinic_id)
        socketio.emit('queue_updated', queue_data, room=f'clinic_{visit.clinic_id}')
        socketio.emit('queue_reordered', {
            'visit_id': visit_id,
            'new_position': new_position,
            'clinic_id': visit.clinic_id
        }, room=f'clinic_{visit.clinic_id}')
        
        return jsonify({
            'message': 'Queue reordered successfully',
            'visit': visit.to_dict()
        }), 200
        
    except ValueError as e:
        return jsonify({'message': str(e)}), 400

@queue_bp.route('/walkin', methods=['POST'])
@receptionist_required
def create_walkin_visit(current_user):
    """Create a walk-in visit"""
    data = request.get_json()
    
    required_fields = ['patient_id', 'clinic_id', 'service_id', 'doctor_id']
    for field in required_fields:
        if field not in data:
            return jsonify({'message': f'{field} is required'}), 400
    
    queue_service = QueueService()
    
    try:
        visit = queue_service.create_walkin_visit(
            patient_id=data['patient_id'],
            clinic_id=data['clinic_id'],
            service_id=data['service_id'],
            doctor_id=data['doctor_id'],
            notes=data.get('notes', '')
        )
        
        # Emit real-time updates
        queue_data = queue_service.get_clinic_queue(visit.clinic_id)
        socketio.emit('queue_updated', queue_data, room=f'clinic_{visit.clinic_id}')
        socketio.emit('walkin_added', {
            'visit': visit.to_dict(),
            'clinic_id': visit.clinic_id
        }, room=f'clinic_{visit.clinic_id}')
        
        return jsonify({
            'message': 'Walk-in visit created successfully',
            'visit': visit.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'message': str(e)}), 400

@queue_bp.route('/cancel', methods=['POST'])
@receptionist_required
def cancel_visit(current_user):
    """Cancel a visit and remove from queue"""
    data = request.get_json()
    visit_id = data.get('visit_id')
    reason = data.get('reason', 'Cancelled by receptionist')
    
    if not visit_id:
        return jsonify({'message': 'visit_id is required'}), 400
    
    queue_service = QueueService()
    
    try:
        visit = queue_service.cancel_visit(visit_id, reason)
        
        # Emit real-time updates
        queue_data = queue_service.get_clinic_queue(visit.clinic_id)
        socketio.emit('queue_updated', queue_data, room=f'clinic_{visit.clinic_id}')
        socketio.emit('visit_cancelled', {
            'visit_id': visit_id,
            'reason': reason,
            'clinic_id': visit.clinic_id
        }, room=f'clinic_{visit.clinic_id}')
        
        return jsonify({
            'message': 'Visit cancelled successfully',
            'visit': visit.to_dict()
        }), 200
        
    except ValueError as e:
        return jsonify({'message': str(e)}), 400

@queue_bp.route('/phases/<int:clinic_id>', methods=['GET'])
@jwt_required()
def get_queue_phases(clinic_id):
    """Get queue organized by 4 phases for the selected date"""
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 401
    
    # Check if user has access to this clinic
    doctor_id = None
    if user.role == UserRole.DOCTOR:
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        if not doctor or doctor.clinic_id != clinic_id:
            return jsonify({'message': 'Access denied to this clinic'}), 403
        # Auto-filter by doctor's ID for doctors
        doctor_id = doctor.id
    elif user.role not in [UserRole.RECEPTIONIST, UserRole.ADMIN]:
        return jsonify({'message': 'Insufficient permissions'}), 403
    else:
        # Receptionists/admins can optionally filter by doctor_id
        doctor_id = request.args.get('doctor_id', type=int)
    
    # Get date parameter
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'message': 'Date parameter is required'}), 400
    
    try:
        selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    try:
        queue_service = QueueService()
        
        # Get all appointments for the selected date with optional doctor filter
        appointments = queue_service.get_all_appointments_for_date(selected_date, clinic_id, doctor_id)
        
        # Organize into 4 phases
        phases = {
            'appointments_today': [],  # Scheduled appointments
            'waiting': [],            # Checked in, waiting
            'with_doctor': [],        # In progress
            'completed': []           # Completed
        }
        
        for apt in appointments:
            queue_phase = apt.get('queue_phase', 'appointments_today')
            
            if queue_phase == 'appointments_today':
                phases['appointments_today'].append(apt)
            elif queue_phase == 'waiting':
                phases['waiting'].append(apt)
            elif queue_phase == 'with_doctor':
                phases['with_doctor'].append(apt)
            elif queue_phase == 'completed':
                phases['completed'].append(apt)
        
        # Sort appointments by time
        for phase in phases.values():
            phase.sort(key=lambda x: x.get('start_time', ''))
        
        return jsonify({
            'phases': phases,
            'date': selected_date.isoformat(),
            'clinic_id': clinic_id
        }), 200
        
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error getting queue phases: {str(e)}")
        return jsonify({'message': f'Error getting queue phases: {str(e)}'}), 500

@queue_bp.route('/phases/move', methods=['POST'])
@jwt_required()
def move_patient_phase():
    """Move a patient between phases"""
    from flask import current_app
    from app.models.payment import Payment, PaymentStatus
    
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return jsonify({'message': 'User not found'}), 401
    
    # Allow receptionist, admin, and doctor roles
    if current_user.role not in [UserRole.RECEPTIONIST, UserRole.ADMIN, UserRole.DOCTOR]:
        return jsonify({'message': 'Insufficient permissions'}), 403
    
    data = request.get_json()
    
    visit_id = data.get('visit_id')
    appointment_id = data.get('appointment_id')
    from_phase = data.get('from_phase')
    to_phase = data.get('to_phase')
    
    if not from_phase or not to_phase:
        return jsonify({'message': 'from_phase and to_phase are required'}), 400
    
    if not visit_id and not appointment_id:
        return jsonify({'message': 'Either visit_id or appointment_id is required'}), 400
    
    try:
        queue_service = QueueService()
        
        # Map phase names to visit statuses
        phase_to_status = {
            'appointments_today': 'scheduled',
            'waiting': 'waiting', 
            'with_doctor': 'in_progress',
            'completed': 'completed'
        }
        
        new_status = phase_to_status.get(to_phase)
        if not new_status:
            return jsonify({'message': 'Invalid phase'}), 400
        
        # Role-based restrictions
        is_doctor = current_user.role == UserRole.DOCTOR
        is_receptionist = current_user.role in [UserRole.RECEPTIONIST, UserRole.ADMIN]
        
        # Doctors cannot move appointments TO "with_doctor" phase (only receptionists can)
        if is_doctor and to_phase == 'with_doctor':
            return jsonify({'message': 'Doctors cannot move appointments to "with doctor" phase. Only receptionists can start consultations.'}), 403
        
        # Receptionists cannot move from "with_doctor" to "completed" (only doctors can)
        if is_receptionist and from_phase == 'with_doctor' and to_phase == 'completed':
            return jsonify({'message': 'Receptionists cannot complete appointments. Only doctors can complete consultations.'}), 403
        
        # Handle case where visit_id might be null (moving from appointments_today without visit)
        visit = None
        appointment = None
        
        if visit_id:
            visit = Visit.query.filter_by(id=visit_id).first()
            if visit and visit.appointment_id:
                appointment = Appointment.query.get(visit.appointment_id)
        
        # Doctor can only move their own appointments
        if is_doctor and visit:
            doctor = Doctor.query.filter_by(user_id=current_user.id).first()
            if not doctor:
                return jsonify({'message': 'Doctor profile not found for this user'}), 404
            if visit.doctor_id != doctor.id:
                return jsonify({'message': 'You can only move appointments for your own patients'}), 403
        
        # Special handling for moving from appointments_today to waiting (check-in process)
        # Only receptionists/admins can check-in patients (doctors cannot)
        if from_phase == 'appointments_today' and to_phase == 'waiting':
            if is_doctor:
                return jsonify({'message': 'Only receptionists can check in patients. Doctors cannot perform check-in.'}), 403
            
            # Get appointment if not already retrieved
            if not appointment:
                if not appointment_id:
                    return jsonify({'message': 'appointment_id is required when moving from appointments_today'}), 400
                
                appointment = Appointment.query.get(appointment_id)
                if not appointment:
                    return jsonify({'message': 'Appointment not found'}), 404
            
            # If no visit exists, create one (shouldn't happen normally but handle it)
            if not visit:
                # Create visit by checking in
                queue_number = queue_service.get_next_queue_number(appointment.clinic_id)
                visit = Visit(
                    appointment_id=appointment.id,
                    doctor_id=appointment.doctor_id,
                    patient_id=appointment.patient_id,
                    service_id=appointment.service_id,
                    clinic_id=appointment.clinic_id,
                    check_in_time=datetime.utcnow(),  # Actual check-in time
                    visit_type=VisitType.SCHEDULED,
                    queue_number=queue_number,
                    status=VisitStatus.WAITING
                )
                db.session.add(visit)
            else:
                # Visit exists - update check-in time to current time if it was auto-created
                # (check-in time equals appointment start time means it was auto-created)
                if (appointment and visit.check_in_time and appointment.start_time and
                    abs((visit.check_in_time - appointment.start_time).total_seconds()) < 60):
                    # Auto-created visit - update to actual check-in time
                    visit.check_in_time = datetime.utcnow()
                
                # Ensure visit status is WAITING
                visit.status = VisitStatus.WAITING
            
            # Update appointment status to checked in
            appointment.status = AppointmentStatus.CHECKED_IN
            
            db.session.flush()  # Get the visit.id if it was just created
        else:
            # For other phase transitions, we need a visit
            if not visit:
                return jsonify({'message': 'Visit not found. Cannot move appointment without visit.'}), 404
            
            # Update visit status based on the new phase
            if new_status == 'waiting':
                visit.status = VisitStatus.WAITING
                if not visit.check_in_time:
                    visit.check_in_time = datetime.utcnow()
            elif new_status == 'in_progress':
                visit.status = VisitStatus.IN_PROGRESS
                if not visit.start_time:
                    visit.start_time = datetime.utcnow()
                if not visit.called_time:
                    visit.called_time = datetime.utcnow()
                
                # Keep appointment status as CHECKED_IN (don't change to IN_PROGRESS)
                # The visit status indicates the progress, appointment status stays CHECKED_IN
                if visit.appointment_id:
                    apt_to_update = Appointment.query.get(visit.appointment_id)
                    if apt_to_update and apt_to_update.status != AppointmentStatus.CHECKED_IN:
                        # Only update if not already checked in (shouldn't happen but be safe)
                        apt_to_update.status = AppointmentStatus.CHECKED_IN
            elif new_status == 'completed':
                visit.status = VisitStatus.COMPLETED
                if not visit.end_time:
                    visit.end_time = datetime.utcnow()
                
                # Update appointment status if it exists
                if visit.appointment_id:
                    apt_to_update = Appointment.query.get(visit.appointment_id)
                    if apt_to_update:
                        apt_to_update.status = AppointmentStatus.COMPLETED
                
                # Update payment status to "appointment completed waiting for payment"
                payment = Payment.query.filter_by(visit_id=visit.id).first()
                if payment:
                    from app.models.payment import PaymentStatus
                    payment.status = PaymentStatus.APPOINTMENT_COMPLETED
        
        db.session.commit()
        
        # Emit real-time updates
        queue_data = queue_service.get_clinic_queue(visit.clinic_id)
        socketio.emit('queue_updated', queue_data, room=f'clinic_{visit.clinic_id}')
        
        doctor_queue_data = queue_service.get_doctor_queue(visit.doctor_id)
        socketio.emit('queue_updated', doctor_queue_data, room=f'doctor_{visit.doctor_id}')
        
        # Emit current_appointment_available event when moving to with_doctor
        # This triggers auto-navigation for the doctor
        if to_phase == 'with_doctor' and visit:
            # Get doctor user_id for navigation
            doctor = Doctor.query.get(visit.doctor_id)
            doctor_user_id = None
            if doctor and doctor.user_id:
                doctor_user_id = doctor.user_id
            
            socketio.emit('current_appointment_available', {
                'visit_id': visit.id,
                'appointment_id': visit.appointment_id,
                'doctor_id': visit.doctor_id,
                'doctor_user_id': doctor_user_id,
                'clinic_id': visit.clinic_id,
                'visit': visit.to_dict(),
                'navigate': True  # Flag to trigger navigation
            }, room=f'doctor_{visit.doctor_id}')
        
        # Emit phase update event for the appointment's date
        # Use the appointment date if visit has one, otherwise use today
        appointment_date = None
        if visit.appointment_id:
            appointment = Appointment.query.get(visit.appointment_id)
            if appointment:
                appointment_date = appointment.start_time.date()
        
        if not appointment_date:
            appointment_date = datetime.now().date()
        
        phases_data = queue_service.get_all_appointments_for_date(appointment_date, visit.clinic_id)
        
        # Organize into phases
        phases = {
            'appointments_today': [],
            'waiting': [],
            'with_doctor': [],
            'completed': []
        }
        for apt in phases_data:
            queue_phase = apt.get('queue_phase', 'appointments_today')
            if queue_phase in phases:
                phases[queue_phase].append(apt)
        
        socketio.emit('phases_updated', {
            'phases': phases,
            'clinic_id': visit.clinic_id,
            'date': appointment_date.isoformat(),
            'doctor_id': visit.doctor_id if visit else None
        }, room=f'clinic_{visit.clinic_id}')
        
        # Also emit to doctor's room if applicable
        if visit and visit.doctor_id:
            socketio.emit('phases_updated', {
                'phases': phases,
                'clinic_id': visit.clinic_id,
                'doctor_id': visit.doctor_id,
                'date': appointment_date.isoformat()
            }, room=f'doctor_{visit.doctor_id}')
        
        # Emit appointment_updated event if appointment exists
        if visit.appointment_id:
            appointment = Appointment.query.get(visit.appointment_id)
            if appointment:
                appointment_data = {
                    'appointment': appointment.to_dict(),
                    'clinic_id': appointment.clinic_id,
                    'doctor_id': appointment.doctor_id
                }
                socketio.emit('appointment_updated', appointment_data, room=f'clinic_{appointment.clinic_id}')
                socketio.emit('appointment_updated', appointment_data, room=f'doctor_{appointment.doctor_id}')
        
        return jsonify({
            'message': 'Patient moved successfully',
            'visit': visit.to_dict(),
            'from_phase': from_phase,
            'to_phase': to_phase,
            'new_status': new_status
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error moving patient phase: {str(e)}")
        return jsonify({'message': f'Error moving patient: {str(e)}'}), 500

@queue_bp.route('/statistics/<int:clinic_id>', methods=['GET'])
@jwt_required()
def get_queue_statistics(clinic_id):
    """Get queue statistics for a clinic"""
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
    
    # Get date parameter
    date_str = request.args.get('date')
    date = None
    if date_str:
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    try:
        queue_service = QueueService()
        statistics = queue_service.get_queue_statistics(clinic_id, date)
        return jsonify(statistics), 200
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error getting queue statistics: {str(e)}")
        return jsonify({'message': 'Error retrieving statistics', 'error': str(e)}), 500
