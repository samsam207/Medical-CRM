from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.visit import Visit, VisitStatus, VisitType
from app.models.appointment import Appointment, AppointmentStatus
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.service import Service
from app.models.clinic import Clinic
from app.utils.decorators import receptionist_required, doctor_required, validate_json, log_audit
from app.utils.helpers import get_next_queue_number
from app.services.queue_service import QueueService
from datetime import datetime

visits_bp = Blueprint('visits', __name__)

@visits_bp.route('', methods=['GET'])
@jwt_required()
def get_visits():
    """Get visits with optional filters"""
    # Get query parameters
    clinic_id = request.args.get('clinic_id', type=int)
    doctor_id = request.args.get('doctor_id', type=int)
    patient_id = request.args.get('patient_id', type=int)
    status = request.args.get('status')
    visit_type = request.args.get('visit_type')
    date = request.args.get('date')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    # Build query
    query = Visit.query
    
    if clinic_id:
        query = query.filter(Visit.clinic_id == clinic_id)
    if doctor_id:
        query = query.filter(Visit.doctor_id == doctor_id)
    if patient_id:
        query = query.filter(Visit.patient_id == patient_id)
    if status:
        try:
            status_enum = VisitStatus(status)
            query = query.filter(Visit.status == status_enum)
        except ValueError:
            return jsonify({'message': 'Invalid status'}), 400
    if visit_type:
        try:
            type_enum = VisitType(visit_type)
            query = query.filter(Visit.visit_type == type_enum)
        except ValueError:
            return jsonify({'message': 'Invalid visit_type'}), 400
    if date:
        try:
            date_obj = datetime.strptime(date, '%Y-%m-%d').date()
            query = query.filter(db.func.date(Visit.created_at) == date_obj)
        except ValueError:
            return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Order by created_at desc
    query = query.order_by(Visit.created_at.desc())
    
    # Paginate
    pagination = query.paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    visits = pagination.items
    
    return jsonify({
        'visits': [visit.to_dict() for visit in visits],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': pagination.total,
            'pages': pagination.pages,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    }), 200

@visits_bp.route('/check-in', methods=['POST'])
@receptionist_required
@validate_json(['appointment_id'])
@log_audit('check_in_patient', 'visit')
def check_in_patient(data, current_user):
    """Check in patient for appointment"""
    appointment_id = data['appointment_id']
    appointment = Appointment.query.get_or_404(appointment_id)
    
    # Check if appointment is confirmed
    if appointment.status != AppointmentStatus.CONFIRMED:
        return jsonify({'message': 'Only confirmed appointments can be checked in'}), 400
    
    # Check if already checked in
    if appointment.visit:
        return jsonify({'message': 'Patient already checked in'}), 400
    
    # Get next queue number
    queue_number = get_next_queue_number(appointment.clinic_id)
    
    # Create visit
    visit = Visit(
        appointment_id=appointment_id,
        doctor_id=appointment.doctor_id,
        patient_id=appointment.patient_id,
        service_id=appointment.service_id,
        clinic_id=appointment.clinic_id,
        check_in_time=datetime.utcnow(),
        visit_type=VisitType.SCHEDULED,
        queue_number=queue_number
    )
    
    db.session.add(visit)
    
    # Update appointment status
    appointment.status = AppointmentStatus.CHECKED_IN
    
    db.session.commit()
    
    # Emit queue update via SocketIO
    from app import socketio
    queue_service = QueueService()
    queue_data = queue_service.get_clinic_queue(appointment.clinic_id)
    socketio.emit('queue_updated', queue_data, room=f'clinic_{appointment.clinic_id}')
    
    return jsonify({
        'message': 'Patient checked in successfully',
        'visit': visit.to_dict(),
        'queue_number': queue_number
    }), 201

@visits_bp.route('/walk-in', methods=['POST'])
@receptionist_required
@validate_json(['patient_id', 'clinic_id', 'service_id', 'doctor_id'])
@log_audit('create_walkin_visit', 'visit')
def create_walkin_visit(data, current_user):
    """Create walk-in visit"""
    # Get next queue number
    queue_number = get_next_queue_number(data['clinic_id'])
    
    # Create visit
    visit = Visit(
        appointment_id=None,
        doctor_id=data['doctor_id'],
        patient_id=data['patient_id'],
        service_id=data['service_id'],
        clinic_id=data['clinic_id'],
        check_in_time=datetime.utcnow(),
        visit_type=VisitType.WALK_IN,
        queue_number=queue_number
    )
    
    db.session.add(visit)
    db.session.commit()
    
    # Emit queue update via SocketIO
    from app import socketio
    queue_service = QueueService()
    queue_data = queue_service.get_clinic_queue(data['clinic_id'])
    socketio.emit('queue_updated', queue_data, room=f'clinic_{data["clinic_id"]}')
    
    return jsonify({
        'message': 'Walk-in visit created successfully',
        'visit': visit.to_dict(),
        'queue_number': queue_number
    }), 201

@visits_bp.route('/queue', methods=['GET'])
@jwt_required()
def get_queue():
    """Get live queue for clinic"""
    clinic_id = request.args.get('clinic_id', type=int)
    doctor_id = request.args.get('doctor_id', type=int)
    
    if not clinic_id and not doctor_id:
        return jsonify({'message': 'clinic_id or doctor_id is required'}), 400
    
    queue_service = QueueService()
    
    if clinic_id:
        queue_data = queue_service.get_clinic_queue(clinic_id)
    else:
        queue_data = queue_service.get_doctor_queue(doctor_id)
    
    return jsonify(queue_data), 200

@visits_bp.route('/<int:visit_id>', methods=['GET'])
@jwt_required()
def get_visit(visit_id):
    """Get visit details"""
    visit = Visit.query.get_or_404(visit_id)
    return jsonify({'visit': visit.to_dict()}), 200

@visits_bp.route('/<int:visit_id>/status', methods=['PUT'])
@doctor_required
@validate_json(['status'])
@log_audit('update_visit_status', 'visit')
def update_visit_status(visit_id, data, current_user):
    """Update visit status"""
    visit = Visit.query.get_or_404(visit_id)
    
    try:
        new_status = VisitStatus(data['status'])
    except ValueError:
        return jsonify({'message': 'Invalid status'}), 400
    
    # Update status
    visit.status = new_status
    
    # Set start/end times based on status
    if new_status == VisitStatus.IN_PROGRESS and not visit.start_time:
        visit.start_time = datetime.utcnow()
    elif new_status == VisitStatus.COMPLETED and not visit.end_time:
        visit.end_time = datetime.utcnow()
    
    db.session.commit()
    
    # Emit queue update
    from app import socketio
    queue_service = QueueService()
    queue_data = queue_service.get_clinic_queue(visit.clinic_id)
    socketio.emit('queue_updated', queue_data, room=f'clinic_{visit.clinic_id}')
    
    return jsonify({
        'message': 'Visit status updated successfully',
        'visit': visit.to_dict()
    }), 200

@visits_bp.route('/<int:visit_id>/call', methods=['POST'])
@doctor_required
@log_audit('call_patient', 'visit')
def call_patient(visit_id, current_user):
    """Call next patient in queue"""
    visit = Visit.query.get_or_404(visit_id)
    
    if visit.status != VisitStatus.WAITING:
        return jsonify({'message': 'Only waiting patients can be called'}), 400
    
    # Update status to called
    visit.status = VisitStatus.CALLED
    db.session.commit()
    
    # Emit queue update
    from app import socketio
    queue_service = QueueService()
    queue_data = queue_service.get_clinic_queue(visit.clinic_id)
    socketio.emit('queue_updated', queue_data, room=f'clinic_{visit.clinic_id}')
    
    return jsonify({
        'message': 'Patient called successfully',
        'visit': visit.to_dict()
    }), 200
