from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, cache
from app.models.appointment import Appointment, AppointmentStatus, BookingSource
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.service import Service
from app.models.clinic import Clinic
from app.models.user import User
from app.models.visit import Visit, VisitStatus, VisitType
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.utils.decorators import receptionist_required, validate_json, log_audit
from app.utils.validators import validate_appointment_time, validate_phone_number
from app.utils.helpers import generate_booking_id, calculate_end_time
from app.services.booking_service import BookingService
from datetime import datetime, timedelta
import json

appointments_bp = Blueprint('appointments', __name__)

@appointments_bp.route('', methods=['GET'])
@jwt_required()
def get_appointments():
    """Get appointments with optional filters"""
    # Get query parameters
    clinic_id = request.args.get('clinic_id', type=int)
    doctor_id = request.args.get('doctor_id', type=int)
    patient_id = request.args.get('patient_id', type=int)
    date = request.args.get('date')
    status = request.args.get('status')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    # Create cache key
    cache_key = f'appointments_{clinic_id}_{doctor_id}_{patient_id}_{date}_{status}_{page}_{per_page}'
    
    # Try to get from cache first
    cached_result = cache.get(cache_key)
    if cached_result:
        return jsonify(cached_result), 200
    
    # Build query
    query = Appointment.query
    
    if clinic_id:
        query = query.filter(Appointment.clinic_id == clinic_id)
    if doctor_id:
        query = query.filter(Appointment.doctor_id == doctor_id)
    if patient_id:
        query = query.filter(Appointment.patient_id == patient_id)
    if date:
        try:
            date_obj = datetime.strptime(date, '%Y-%m-%d').date()
            query = query.filter(db.func.date(Appointment.start_time) == date_obj)
        except ValueError:
            return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    if status:
        try:
            status_enum = AppointmentStatus(status)
            query = query.filter(Appointment.status == status_enum)
        except ValueError:
            return jsonify({'message': 'Invalid status'}), 400
    
    # Order by start time
    query = query.order_by(Appointment.start_time.desc())
    
    # Paginate
    appointments = query.paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    result = {
        'appointments': [appointment.to_dict() for appointment in appointments.items],
        'total': appointments.total,
        'pages': appointments.pages,
        'current_page': page,
        'per_page': per_page
    }
    
    # Cache for 5 minutes
    cache.set(cache_key, result, timeout=300)
    
    return jsonify(result), 200

@appointments_bp.route('/<int:appointment_id>', methods=['GET'])
@jwt_required()
def get_appointment(appointment_id):
    """Get specific appointment by ID"""
    appointment = Appointment.query.get_or_404(appointment_id)
    return jsonify({'appointment': appointment.to_dict()}), 200

@appointments_bp.route('', methods=['POST'])
@receptionist_required
@validate_json(['clinic_id', 'doctor_id', 'patient_id', 'service_id', 'start_time', 'booking_source'])
@log_audit('create_appointment', 'appointment')
def create_appointment(data, current_user):
    """Create new appointment"""
    try:
        # Validate appointment time
        start_time = datetime.fromisoformat(data['start_time'].replace('Z', '+00:00'))
        service = Service.query.get(data['service_id'])
        if not service:
            return jsonify({'message': 'Service not found'}), 404
        
        end_time = calculate_end_time(start_time, service.duration)
        
        is_valid, message = validate_appointment_time(
            data['doctor_id'], start_time, end_time
        )
        if not is_valid:
            return jsonify({'message': message}), 400
        
        # Generate booking ID
        booking_id = generate_booking_id()
        
        # Create appointment
        appointment = Appointment(
            booking_id=booking_id,
            clinic_id=data['clinic_id'],
            doctor_id=data['doctor_id'],
            patient_id=data['patient_id'],
            service_id=data['service_id'],
            start_time=start_time,
            end_time=end_time,
            booking_source=BookingSource[data['booking_source'].upper()],
            created_by=current_user.id,
            notes=data.get('notes')
        )
        
        db.session.add(appointment)
        db.session.flush()  # Flush to get appointment ID
        
        # Create visit for the appointment
        # Get next queue number for the clinic on this date
        from sqlalchemy import func
        max_queue = db.session.query(func.max(Visit.queue_number)).filter(
            Visit.clinic_id == data['clinic_id'],
            func.date(Visit.created_at) == start_time.date()
        ).scalar() or 0
        
        visit = Visit(
            appointment_id=appointment.id,
            doctor_id=data['doctor_id'],
            patient_id=data['patient_id'],
            service_id=data['service_id'],
            clinic_id=data['clinic_id'],
            check_in_time=start_time,  # Set check-in time to appointment time
            visit_type=VisitType.SCHEDULED,
            queue_number=max_queue + 1,
            status=VisitStatus.WAITING
        )
        
        db.session.add(visit)
        db.session.flush()  # Flush to get visit ID
        
        # Create pending payment for the visit
        doctor = Doctor.query.get(data['doctor_id'])
        doctor_share = float(service.price) * doctor.share_percentage
        center_share = float(service.price) - doctor_share
        
        payment = Payment(
            visit_id=visit.id,
            patient_id=data['patient_id'],
            total_amount=float(service.price),
            amount_paid=0.0,  # No payment made yet
            payment_method=PaymentMethod.CASH,  # Default method
            doctor_share=doctor_share,
            center_share=center_share,
            status=PaymentStatus.PENDING
        )
        
        db.session.add(payment)
        db.session.commit()
        
        # Emit SocketIO event for real-time updates
        from app import socketio
        from app.services.queue_service import QueueService
        
        # Emit appointment created event
        appointment_data = {
            'appointment': appointment.to_dict(),
            'visit': visit.to_dict(),
            'clinic_id': appointment.clinic_id,
            'doctor_id': appointment.doctor_id
        }
        socketio.emit('appointment_created', appointment_data, room=f'clinic_{appointment.clinic_id}')
        socketio.emit('appointment_created', appointment_data, room=f'doctor_{appointment.doctor_id}')
        
        # Emit queue update for the clinic
        queue_service = QueueService()
        queue_data = queue_service.get_clinic_queue(appointment.clinic_id)
        socketio.emit('queue_updated', queue_data, room=f'clinic_{appointment.clinic_id}')
        
        # Invalidate cache for appointments
        cache.delete_memoized(get_appointments)
        
        # Schedule SMS reminder (1 hour before appointment) - DISABLED FOR TESTING
        # try:
        #     from app.tasks.notifications import schedule_sms_reminder
        #     from datetime import timedelta
        #     
        #     reminder_time = start_time - timedelta(hours=1)
        #     if reminder_time > datetime.utcnow():
        #         schedule_sms_reminder.apply_async(
        #             args=[
        #                 appointment.id,
        #                 appointment.patient.phone,
        #                 f"Reminder: You have an appointment with Dr. {appointment.doctor.name} at {start_time.strftime('%H:%M')} on {start_time.strftime('%Y-%m-%d')}"
        #             ],
        #             eta=reminder_time
        #         )
        # except Exception as e:
        #     # Log error but don't fail the appointment creation
        #     print(f"Failed to schedule SMS reminder: {e}")
        print("SMS reminder scheduling disabled for testing")
        
        return jsonify({
            'message': 'Appointment created successfully',
            'appointment': appointment.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({'message': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Failed to create appointment: {str(e)}'}), 500

@appointments_bp.route('/<int:appointment_id>', methods=['PUT'])
@receptionist_required
@log_audit('update_appointment', 'appointment')
def update_appointment(appointment_id, current_user):
    """Update appointment"""
    appointment = Appointment.query.get_or_404(appointment_id)
    data = request.get_json()
    
    # Update fields if provided
    if 'start_time' in data:
        start_time = datetime.fromisoformat(data['start_time'].replace('Z', '+00:00'))
        service = Service.query.get(appointment.service_id)
        end_time = calculate_end_time(start_time, service.duration)
        
        # Validate new time
        is_valid, message = validate_appointment_time(
            appointment.doctor_id, start_time, end_time, appointment_id
        )
        if not is_valid:
            return jsonify({'message': message}), 400
        
        appointment.start_time = start_time
        appointment.end_time = end_time
    
    if 'status' in data:
        try:
            appointment.status = AppointmentStatus(data['status'])
        except ValueError:
            return jsonify({'message': 'Invalid status'}), 400
    
    if 'notes' in data:
        appointment.notes = data['notes']
    
    db.session.commit()
    
    # Emit SocketIO event for real-time updates
    from app import socketio
    from app.services.queue_service import QueueService
    
    # Emit appointment updated event
    appointment_data = {
        'appointment': appointment.to_dict(),
        'clinic_id': appointment.clinic_id,
        'doctor_id': appointment.doctor_id
    }
    socketio.emit('appointment_updated', appointment_data, room=f'clinic_{appointment.clinic_id}')
    socketio.emit('appointment_updated', appointment_data, room=f'doctor_{appointment.doctor_id}')
    
    # Emit queue update for the clinic
    queue_service = QueueService()
    queue_data = queue_service.get_clinic_queue(appointment.clinic_id)
    socketio.emit('queue_updated', queue_data, room=f'clinic_{appointment.clinic_id}')
    
    # Invalidate cache for appointments
    cache.delete_memoized(get_appointments)
    # Also clear all appointment-related cache entries
    cache.clear()
    
    return jsonify({
        'message': 'Appointment updated successfully',
        'appointment': appointment.to_dict()
    }), 200

@appointments_bp.route('/<int:appointment_id>', methods=['DELETE'])
@receptionist_required
@log_audit('cancel_appointment', 'appointment')
def cancel_appointment(appointment_id, current_user):
    """Cancel appointment"""
    appointment = Appointment.query.get_or_404(appointment_id)
    
    # Only allow cancellation of confirmed appointments
    if appointment.status != AppointmentStatus.CONFIRMED:
        return jsonify({'message': 'Only confirmed appointments can be cancelled'}), 400
    
    appointment.status = AppointmentStatus.CANCELLED
    db.session.commit()
    
    # Emit SocketIO event for real-time updates
    from app import socketio
    from app.services.queue_service import QueueService
    
    # Emit appointment cancelled event
    appointment_data = {
        'appointment': appointment.to_dict(),
        'clinic_id': appointment.clinic_id,
        'doctor_id': appointment.doctor_id
    }
    socketio.emit('appointment_cancelled', appointment_data, room=f'clinic_{appointment.clinic_id}')
    socketio.emit('appointment_cancelled', appointment_data, room=f'doctor_{appointment.doctor_id}')
    
    # Emit queue update for the clinic
    queue_service = QueueService()
    queue_data = queue_service.get_clinic_queue(appointment.clinic_id)
    socketio.emit('queue_updated', queue_data, room=f'clinic_{appointment.clinic_id}')
    
    # Invalidate cache for appointments
    cache.delete_memoized(get_appointments)
    
    return jsonify({'message': 'Appointment cancelled successfully'}), 200

@appointments_bp.route('/available-slots', methods=['GET'])
@jwt_required()
def get_available_slots():
    """Get available time slots for booking"""
    clinic_id = request.args.get('clinic_id', type=int)
    doctor_id = request.args.get('doctor_id', type=int)
    date = request.args.get('date')
    
    if not all([clinic_id, doctor_id, date]):
        return jsonify({'message': 'clinic_id, doctor_id, and date are required'}), 400
    
    try:
        date_obj = datetime.strptime(date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Get doctor and clinic info
    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({'message': 'Doctor not found'}), 404
    
    if doctor.clinic_id != clinic_id:
        return jsonify({'message': 'Doctor not assigned to this clinic'}), 400
    
    # Check if doctor works on this day
    day_name = date_obj.strftime('%A')
    if not doctor.is_working_on_day(day_name):
        return jsonify({'message': f'Doctor doesn\'t work on {day_name}'}), 400
    
    # Get available slots using booking service
    booking_service = BookingService()
    available_slots = booking_service.get_available_slots(doctor_id, date_obj)
    
    return jsonify({
        'available_slots': available_slots,
        'doctor': doctor.to_dict(),
        'date': date
    }), 200
