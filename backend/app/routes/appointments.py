from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db, cache
from app.models.appointment import Appointment, AppointmentStatus, BookingSource
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.service import Service
from app.models.clinic import Clinic
from app.models.user import User
from app.models.visit import Visit, VisitStatus, VisitType
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.utils.decorators import receptionist_required, doctor_required, validate_json, log_audit
from app.utils.validators import validate_appointment_time, validate_phone_number
from app.utils.helpers import generate_booking_id, calculate_end_time
from app.services.booking_service import BookingService
from datetime import datetime, timedelta

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
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    status = request.args.get('status')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    # Create cache key
    cache_key = f'appointments_{clinic_id}_{doctor_id}_{patient_id}_{date}_{start_date}_{end_date}_{status}_{page}_{per_page}'
    
    # Try to get from cache first
    cached_result = cache.get(cache_key)
    if cached_result:
        return jsonify(cached_result), 200
    
    # Build query with eager loading to prevent N+1 queries
    from sqlalchemy.orm import joinedload
    query = Appointment.query.options(
        joinedload(Appointment.patient),
        joinedload(Appointment.doctor),
        joinedload(Appointment.clinic),
        joinedload(Appointment.service),
        joinedload(Appointment.visit)
    )
    
    if clinic_id:
        query = query.filter(Appointment.clinic_id == clinic_id)
    if doctor_id:
        query = query.filter(Appointment.doctor_id == doctor_id)
    if patient_id:
        query = query.filter(Appointment.patient_id == patient_id)
    
    # Date filtering - either single date or date range
    if date:
        try:
            date_obj = datetime.strptime(date, '%Y-%m-%d').date()
            query = query.filter(db.func.date(Appointment.start_time) == date_obj)
        except ValueError:
            return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    elif start_date or end_date:
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(db.func.date(Appointment.start_time) >= start_date_obj)
            except ValueError:
                return jsonify({'message': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(db.func.date(Appointment.start_time) <= end_date_obj)
            except ValueError:
                return jsonify({'message': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
    
    if status:
        try:
            # Handle both uppercase and lowercase status values
            status_lower = status.lower()
            status_enum = AppointmentStatus(status_lower)
            query = query.filter(Appointment.status == status_enum)
        except ValueError:
            return jsonify({'message': f'Invalid status: {status}. Valid values: {[s.value for s in AppointmentStatus]}'}), 400
    
    # Note: Removed the filter that excluded appointments with visits
    # This was causing appointments to not appear on the appointments page
    # All appointments should be visible regardless of visit status
    
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

@appointments_bp.route('/statistics', methods=['GET'])
@jwt_required()
def get_appointment_statistics():
    """Get appointment statistics"""
    try:
        # Get date filter (optional, defaults to today)
        date_str = request.args.get('date')
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        clinic_id = request.args.get('clinic_id', type=int)
        doctor_id = request.args.get('doctor_id', type=int)
        
        today = datetime.now().date()
        base_query = Appointment.query
        
        # Apply clinic and doctor filtering
        if clinic_id:
            base_query = base_query.filter(Appointment.clinic_id == clinic_id)
        if doctor_id:
            base_query = base_query.filter(Appointment.doctor_id == doctor_id)
        
        # Apply date filtering
        if date_str:
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
                base_query = base_query.filter(db.func.date(Appointment.start_time) == date_obj)
            except ValueError:
                return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
        elif start_date_str or end_date_str:
            if start_date_str:
                try:
                    start_date_obj = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                    base_query = base_query.filter(db.func.date(Appointment.start_time) >= start_date_obj)
                except ValueError:
                    return jsonify({'message': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
            if end_date_str:
                try:
                    end_date_obj = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                    base_query = base_query.filter(db.func.date(Appointment.start_time) <= end_date_obj)
                except ValueError:
                    return jsonify({'message': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
        else:
            # Default: today's appointments
            base_query = base_query.filter(db.func.date(Appointment.start_time) == today)
        
        # Total appointments
        total_appointments = base_query.count()
        
        # Count by status
        confirmed_count = base_query.filter(Appointment.status == AppointmentStatus.CONFIRMED).count()
        checked_in_count = base_query.filter(Appointment.status == AppointmentStatus.CHECKED_IN).count()
        completed_count = base_query.filter(Appointment.status == AppointmentStatus.COMPLETED).count()
        cancelled_count = base_query.filter(Appointment.status == AppointmentStatus.CANCELLED).count()
        no_show_count = base_query.filter(Appointment.status == AppointmentStatus.NO_SHOW).count()
        
        # Count by clinic - use the same filter conditions
        clinic_counts = {}
        clinic_query = db.session.query(
            Appointment.clinic_id,
            db.func.count(Appointment.id).label('count')
        )
        
        if date_str:
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
                clinic_query = clinic_query.filter(db.func.date(Appointment.start_time) == date_obj)
            except ValueError:
                pass
        elif start_date_str or end_date_str:
            if start_date_str:
                try:
                    start_date_obj = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                    clinic_query = clinic_query.filter(db.func.date(Appointment.start_time) >= start_date_obj)
                except ValueError:
                    pass
            if end_date_str:
                try:
                    end_date_obj = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                    clinic_query = clinic_query.filter(db.func.date(Appointment.start_time) <= end_date_obj)
                except ValueError:
                    pass
        else:
            clinic_query = clinic_query.filter(db.func.date(Appointment.start_time) == today)
        
        appointments_by_clinic = clinic_query.group_by(Appointment.clinic_id).all()
        for clinic_id, count in appointments_by_clinic:
            clinic = Clinic.query.get(clinic_id)
            clinic_name = clinic.name if clinic else f'Clinic {clinic_id}'
            clinic_counts[clinic_name] = count
        
        # Count by doctor
        doctor_counts = {}
        doctor_query = db.session.query(
            Appointment.doctor_id,
            db.func.count(Appointment.id).label('count')
        )
        
        if date_str:
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
                doctor_query = doctor_query.filter(db.func.date(Appointment.start_time) == date_obj)
            except ValueError:
                pass
        elif start_date_str or end_date_str:
            if start_date_str:
                try:
                    start_date_obj = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                    doctor_query = doctor_query.filter(db.func.date(Appointment.start_time) >= start_date_obj)
                except ValueError:
                    pass
            if end_date_str:
                try:
                    end_date_obj = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                    doctor_query = doctor_query.filter(db.func.date(Appointment.start_time) <= end_date_obj)
                except ValueError:
                    pass
        else:
            doctor_query = doctor_query.filter(db.func.date(Appointment.start_time) == today)
        
        appointments_by_doctor = doctor_query.group_by(Appointment.doctor_id).all()
        for doctor_id, count in appointments_by_doctor:
            doctor = Doctor.query.get(doctor_id)
            doctor_name = doctor.name if doctor else f'Doctor {doctor_id}'
            doctor_counts[doctor_name] = count
        
        # Count by booking source
        booking_source_counts = {}
        source_query = db.session.query(
            Appointment.booking_source,
            db.func.count(Appointment.id).label('count')
        )
        
        if date_str:
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
                source_query = source_query.filter(db.func.date(Appointment.start_time) == date_obj)
            except ValueError:
                pass
        elif start_date_str or end_date_str:
            if start_date_str:
                try:
                    start_date_obj = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                    source_query = source_query.filter(db.func.date(Appointment.start_time) >= start_date_obj)
                except ValueError:
                    pass
            if end_date_str:
                try:
                    end_date_obj = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                    source_query = source_query.filter(db.func.date(Appointment.start_time) <= end_date_obj)
                except ValueError:
                    pass
        else:
            source_query = source_query.filter(db.func.date(Appointment.start_time) == today)
        
        appointments_by_source = source_query.group_by(Appointment.booking_source).all()
        for source, count in appointments_by_source:
            if source:
                booking_source_counts[source.value] = count
        
        # Recent appointments (last 7 days)
        seven_days_ago = datetime.now().date() - timedelta(days=7)
        recent_count = Appointment.query.filter(
            Appointment.start_time >= datetime.combine(seven_days_ago, datetime.min.time())
        ).count()
        
        # This week's appointments
        start_of_week = today - timedelta(days=today.weekday())
        this_week_count = Appointment.query.filter(
            Appointment.start_time >= datetime.combine(start_of_week, datetime.min.time())
        ).count()
        
        return jsonify({
            'total': total_appointments,
            'by_status': {
                'confirmed': confirmed_count,
                'checked_in': checked_in_count,
                'completed': completed_count,
                'cancelled': cancelled_count,
                'no_show': no_show_count
            },
            'by_clinic': clinic_counts,
            'by_doctor': doctor_counts,
            'by_booking_source': booking_source_counts,
            'recent': recent_count,
            'this_week': this_week_count
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Error retrieving statistics: {str(e)}'}), 500

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
        if not doctor:
            return jsonify({'message': 'Doctor not found'}), 404
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
        cache.clear()
        
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
        if not service:
            return jsonify({'message': 'Service not found'}), 404
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
            # Handle both uppercase and lowercase status values
            status_lower = data['status'].lower()
            appointment.status = AppointmentStatus(status_lower)
        except ValueError:
            return jsonify({'message': f'Invalid status: {data["status"]}. Valid values: {[s.value for s in AppointmentStatus]}'}), 400
    
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
    # Get optional reason from request body
    data = request.get_json() or {}
    reason = data.get('reason', '')
    
    appointment = Appointment.query.get_or_404(appointment_id)
    
    # Only allow cancellation of confirmed appointments
    if appointment.status != AppointmentStatus.CONFIRMED:
        return jsonify({'message': 'Only confirmed appointments can be cancelled'}), 400
    
    appointment.status = AppointmentStatus.CANCELLED
    
    # Add reason to notes if provided
    if reason:
        if appointment.notes:
            appointment.notes = f"{appointment.notes}\n[Cancelled: {reason}]"
        else:
            appointment.notes = f"[Cancelled: {reason}]"
    
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
    cache.clear()
    
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
    # First check DoctorSchedule table, then fall back to old working_days JSON
    day_of_week = date_obj.weekday()  # Python: Monday=0, Sunday=6
    our_day_of_week = (day_of_week + 1) % 7  # Our format: Sunday=0, Monday=1, ..., Saturday=6
    
    from app.models.doctor_schedule import DoctorSchedule
    has_schedule = DoctorSchedule.query.filter_by(
        doctor_id=doctor_id,
        day_of_week=our_day_of_week,
        is_available=True
    ).first() is not None
    
    # Fall back to old working_days if no DoctorSchedule entry
    if not has_schedule:
        day_name = date_obj.strftime('%A')
        if not doctor.is_working_on_day(day_name):
            return jsonify({'message': f'Doctor doesn\'t work on {day_name}'}), 400
    
    # Get available slots using booking service
    booking_service = BookingService()
    available_slots = booking_service.get_available_slots(doctor_id, date_obj)
    
    # Filter to only return actually available slots (available=True)
    # This is what the frontend expects
    slots = [slot for slot in available_slots if slot.get('available', False)]
    
    return jsonify({
        'slots': slots,  # Only available slots
        'available_slots': slots,  # Alias for backward compatibility with frontend
        'all_slots': available_slots,  # Include all slots with reasons for debugging
        'doctor': doctor.to_dict(),
        'date': date
    }), 200

@appointments_bp.route('/current', methods=['GET'])
@doctor_required
def get_current_appointment(current_user):
    """Get current appointment (IN_PROGRESS visit) for logged-in doctor"""
    from sqlalchemy.orm import joinedload
    
    # Get doctor for current user
    doctor = Doctor.query.filter_by(user_id=current_user.id).first()
    if not doctor:
        return jsonify({'message': 'Doctor profile not found for this user'}), 404
    
    # Find current visit (IN_PROGRESS) for this doctor
    current_visit = Visit.query.filter_by(
        doctor_id=doctor.id,
        status=VisitStatus.IN_PROGRESS
    ).options(
        joinedload(Visit.patient),
        joinedload(Visit.appointment),
        joinedload(Visit.service),
        joinedload(Visit.clinic),
        joinedload(Visit.doctor)
    ).order_by(Visit.start_time.desc()).first()
    
    if not current_visit:
        return jsonify({
            'message': 'No current appointment',
            'has_appointment': False
        }), 200
    
    # Get appointment if exists
    appointment = current_visit.appointment if current_visit.appointment_id else None
    
    # Get patient visit history (to determine if first visit)
    all_patient_visits = Visit.query.filter_by(
        patient_id=current_visit.patient_id
    ).order_by(Visit.created_at.asc()).all()
    
    is_first_visit = len(all_patient_visits) == 1
    
    # Get previous appointments/visits for this patient
    previous_visits = Visit.query.filter(
        Visit.patient_id == current_visit.patient_id,
        Visit.id != current_visit.id,
        Visit.status == VisitStatus.COMPLETED
    ).order_by(Visit.created_at.desc()).limit(5).all()
    
    # Get previous appointments
    previous_appointments = []
    if appointment:
        previous_appointments = Appointment.query.filter(
            Appointment.patient_id == current_visit.patient_id,
            Appointment.id != appointment.id,
            Appointment.status == AppointmentStatus.COMPLETED
        ).order_by(Appointment.start_time.desc()).limit(5).all()
    
    # Build response
    response_data = {
        'has_appointment': True,
        'visit': current_visit.to_dict(),
        'appointment': appointment.to_dict() if appointment else None,
        'patient': current_visit.patient.to_dict() if current_visit.patient else None,
        'service': current_visit.service.to_dict() if current_visit.service else None,
        'clinic': current_visit.clinic.to_dict() if current_visit.clinic else None,
        'doctor': current_visit.doctor.to_dict() if current_visit.doctor else None,
        'is_first_visit': is_first_visit,
        'visit_count': len(all_patient_visits),
        'previous_visits': [visit.to_dict() for visit in previous_visits],
        'previous_appointments': [apt.to_dict() for apt in previous_appointments]
    }
    
    return jsonify(response_data), 200

@appointments_bp.route('/current/complete', methods=['POST'])
@doctor_required
@log_audit('complete_appointment', 'appointment')
def complete_current_appointment(current_user):
    """Complete current appointment - only doctors can do this"""
    from app.services.queue_service import QueueService
    from app import socketio
    
    # Get doctor for current user
    doctor = Doctor.query.filter_by(user_id=current_user.id).first()
    if not doctor:
        return jsonify({'message': 'Doctor profile not found for this user'}), 404
    
    # Find current visit (IN_PROGRESS) for this doctor
    current_visit = Visit.query.filter_by(
        doctor_id=doctor.id,
        status=VisitStatus.IN_PROGRESS
    ).first()
    
    if not current_visit:
        return jsonify({'message': 'No current appointment to complete'}), 404
    
    # Get appointment if exists
    appointment = current_visit.appointment if current_visit.appointment_id else None
    
    # Update visit status to COMPLETED (consultation finished)
    current_visit.status = VisitStatus.COMPLETED
    current_visit.end_time = datetime.utcnow()
    
    # Update appointment status if exists
    if appointment:
        appointment.status = AppointmentStatus.COMPLETED
    
    # Update payment status to "appointment completed waiting for payment"
    from app.models.payment import Payment, PaymentStatus
    payment = Payment.query.filter_by(visit_id=current_visit.id).first()
    if payment:
        payment.status = PaymentStatus.APPOINTMENT_COMPLETED
    
    # Get optional notes from request body
    request_data = request.get_json() or {}
    notes = request_data.get('notes', '')
    if notes and appointment:
        if appointment.notes:
            appointment.notes = f"{appointment.notes}\n[Doctor notes: {notes}]"
        else:
            appointment.notes = f"[Doctor notes: {notes}]"
    
    db.session.commit()
    
    # Emit SocketIO events for real-time updates
    queue_service = QueueService()
    queue_data = queue_service.get_clinic_queue(current_visit.clinic_id)
    socketio.emit('queue_updated', queue_data, room=f'clinic_{current_visit.clinic_id}')
    
    doctor_queue_data = queue_service.get_doctor_queue(doctor.id)
    socketio.emit('queue_updated', doctor_queue_data, room=f'doctor_{doctor.id}')
    
    # Emit appointment completed event
    if appointment:
        appointment_data = {
            'appointment': appointment.to_dict(),
            'visit': current_visit.to_dict(),
            'clinic_id': appointment.clinic_id,
            'doctor_id': appointment.doctor_id
        }
        socketio.emit('appointment_completed', appointment_data, room=f'clinic_{appointment.clinic_id}')
        socketio.emit('appointment_completed', appointment_data, room=f'doctor_{appointment.doctor_id}')
    
    # Emit phases_updated event for real-time sync between dashboards
    appointment_date = None
    if appointment:
        appointment_date = appointment.start_time.date()
    if not appointment_date:
        appointment_date = datetime.now().date()
    
    phases_data = queue_service.get_all_appointments_for_date(appointment_date, current_visit.clinic_id)
    
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
        'clinic_id': current_visit.clinic_id,
        'date': appointment_date.isoformat()
    }, room=f'clinic_{current_visit.clinic_id}')
    
    # Also emit for doctor's room
    socketio.emit('phases_updated', {
        'phases': phases,
        'clinic_id': current_visit.clinic_id,
        'doctor_id': doctor.id,
        'date': appointment_date.isoformat()
    }, room=f'doctor_{doctor.id}')
    
    # Invalidate cache
    cache.clear()
    
    return jsonify({
        'message': 'Appointment completed successfully',
        'appointment': appointment.to_dict() if appointment else None,
        'visit': current_visit.to_dict()
    }), 200
