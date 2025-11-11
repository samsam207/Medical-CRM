from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.doctor import Doctor
from app.models.clinic import Clinic
from app.models.user import User, UserRole
from app.models.doctor_schedule import DoctorSchedule
from app.models.appointment import Appointment
from app.utils.decorators import admin_required, receptionist_required, validate_json, log_audit
from sqlalchemy import or_ as sql_or
from datetime import datetime

doctors_bp = Blueprint('doctors', __name__)

@doctors_bp.route('', methods=['GET'])
@jwt_required()
def get_doctors():
    """Get all doctors with optional availability filter"""
    from app.models.doctor_schedule import DoctorSchedule
    
    clinic_id = request.args.get('clinic_id', type=int)
    specialty = request.args.get('specialty', '').strip()
    search = request.args.get('search', '').strip()
    datetime_str = request.args.get('datetime')
    
    # Use joinedload to eagerly load clinic relationship
    from sqlalchemy.orm import joinedload
    query = Doctor.query.options(joinedload(Doctor.clinic))
    
    # Filter by clinic if provided
    if clinic_id:
        query = query.filter_by(clinic_id=clinic_id)
    
    # Filter by is_active if provided (for booking, only show active doctors)
    is_active_param = request.args.get('is_active', type=str)
    if is_active_param:
        if is_active_param.lower() == 'true':
            query = query.filter_by(is_active=True)
        elif is_active_param.lower() == 'false':
            query = query.filter_by(is_active=False)
    
    # Filter by specialty
    if specialty:
        query = query.filter(Doctor.specialty.ilike(f'%{specialty}%'))
    
    # Search by name or specialty
    if search:
        search_term = f'%{search}%'
        query = query.filter(
            sql_or(
                Doctor.name.ilike(search_term),
                Doctor.specialty.ilike(search_term)
            )
        )
    
    doctors = query.order_by(Doctor.name).all()
    doctor_ids = [doctor.id for doctor in doctors]
    
    # Pre-fetch all schedules in one query to avoid N+1
    schedules = DoctorSchedule.query.filter(
        DoctorSchedule.doctor_id.in_(doctor_ids)
    ).all()
    
    # Group schedules by doctor_id
    schedules_by_doctor = {}
    for schedule in schedules:
        if schedule.doctor_id not in schedules_by_doctor:
            schedules_by_doctor[schedule.doctor_id] = []
        schedules_by_doctor[schedule.doctor_id].append(schedule)
    
    doctor_list = []
    
    # If datetime is provided, check availability
    if datetime_str:
        try:
            dt = datetime.strptime(datetime_str, '%Y-%m-%d %H:%M')
            # Python weekday: Monday=0, Sunday=6
            python_weekday = dt.weekday()
            # Convert to our format: Sunday=0, Monday=1
            day_of_week = (python_weekday + 1) % 7
            hour = dt.hour
            
            for doctor in doctors:
                # Access clinic to ensure it's loaded
                _ = doctor.clinic
                doctor_dict = doctor.to_dict(include_schedule=False)
                # Check if doctor is available at this time
                is_available = doctor.is_available_at(day_of_week, hour)
                doctor_dict['is_available'] = is_available
                doctor_list.append(doctor_dict)
        except ValueError:
            # If datetime parsing fails, just return doctors without availability check
            doctor_list = []
            for doctor in doctors:
                # Access clinic to ensure it's loaded
                _ = doctor.clinic
                doctor_dict = doctor.to_dict(include_schedule=False)
                doctor_list.append(doctor_dict)
    else:
        # No datetime filter - check general availability
        # Ensure clinic relationship is loaded for all doctors
        for doctor in doctors:
            # Access clinic to ensure it's loaded (this will trigger lazy loading if needed)
            _ = doctor.clinic
            doctor_dict = doctor.to_dict(include_schedule=False)
            doctor_schedules = schedules_by_doctor.get(doctor.id, [])
            has_availability = any(s.is_available for s in doctor_schedules)
            doctor_dict['has_schedule'] = len(doctor_schedules) > 0
            doctor_dict['is_available'] = has_availability if doctor_dict['has_schedule'] else True
            doctor_list.append(doctor_dict)
    
    return jsonify({
        'doctors': doctor_list
    }), 200

@doctors_bp.route('/<int:doctor_id>', methods=['GET'])
@jwt_required()
def get_doctor(doctor_id):
    """Get doctor details"""
    doctor = Doctor.query.get_or_404(doctor_id)
    return jsonify({'doctor': doctor.to_dict(include_schedule=True)}), 200

@doctors_bp.route('', methods=['POST'])
@admin_required
@validate_json(['name', 'specialty', 'working_days', 'working_hours', 'clinic_id', 'share_percentage'])
@log_audit('create_doctor', 'doctor')
def create_doctor(data, current_user):
    """Create new doctor with optional schedule"""
    from app.models.doctor_schedule import DoctorSchedule
    
    # Validate clinic exists
    clinic = Clinic.query.get(data['clinic_id'])
    if not clinic:
        return jsonify({'message': 'Clinic not found'}), 404
    
    # Validate user_id if provided
    user_id = data.get('user_id')
    if user_id:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404
        if user.role != UserRole.DOCTOR:
            return jsonify({'message': 'User must have DOCTOR role'}), 400
        # Check if user is already linked to another doctor
        existing_doctor = Doctor.query.filter_by(user_id=user_id).first()
        if existing_doctor:
            return jsonify({'message': 'This user is already linked to another doctor'}), 400
    
    # Create doctor
    doctor = Doctor(
        name=data['name'],
        specialty=data['specialty'],
        working_days=data['working_days'],
        working_hours=data['working_hours'],
        clinic_id=data['clinic_id'],
        share_percentage=data.get('share_percentage', 0.7),
        user_id=user_id,
        is_active=data.get('is_active', True)
    )
    
    db.session.add(doctor)
    db.session.flush()  # Get the doctor.id
    
    # Add schedule if provided
    if 'schedule' in data and data['schedule']:
        for schedule_item in data['schedule']:
            # Validate hour (must be 0-23)
            hour = schedule_item.get('hour')
            day_of_week = schedule_item.get('day_of_week')
            
            # Validate hour range
            if hour is None or not isinstance(hour, int) or hour < 0 or hour > 23:
                continue  # Skip invalid hour entries
            
            # Validate day_of_week range (0-6)
            if day_of_week is None or not isinstance(day_of_week, int) or day_of_week < 0 or day_of_week > 6:
                continue  # Skip invalid day entries
            
            schedule = DoctorSchedule(
                doctor_id=doctor.id,
                day_of_week=day_of_week,
                hour=hour,
                is_available=schedule_item.get('is_available', True)
            )
            db.session.add(schedule)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Doctor created successfully',
        'doctor': doctor.to_dict()
    }), 201

@doctors_bp.route('/<int:doctor_id>', methods=['PUT'])
@receptionist_required
@log_audit('update_doctor', 'doctor')
def update_doctor(doctor_id, current_user):
    """Update doctor information (receptionists can update schedules and basic info, admin can update all fields)"""
    from app.models.doctor_schedule import DoctorSchedule
    
    doctor = Doctor.query.get_or_404(doctor_id)
    data = request.get_json()
    
    # Check if user is admin (for restricted fields)
    is_admin = current_user.role == UserRole.ADMIN
    
    # Update fields if provided
    # Receptionists can update basic info and schedules
    # Admin can update everything including sensitive fields
    if 'name' in data:
        doctor.name = data['name']
    if 'specialty' in data:
        doctor.specialty = data['specialty']
    if 'working_days' in data:
        doctor.working_days = data['working_days']
    if 'working_hours' in data:
        doctor.working_hours = data['working_hours']
    if 'clinic_id' in data:
        # Only allow change if admin, or if value hasn't changed (receptionist can include it but not modify)
        new_clinic_id = data['clinic_id']
        if new_clinic_id != doctor.clinic_id:
            if is_admin:
                # Only admin can change clinic assignment
                clinic = Clinic.query.get(new_clinic_id)
                if not clinic:
                    return jsonify({'message': 'Clinic not found'}), 404
                doctor.clinic_id = new_clinic_id
            else:
                # Receptionists cannot change clinic assignment
                return jsonify({'message': 'Only admin can change clinic assignment'}), 403
    if 'share_percentage' in data:
        # Only allow change if admin, or if value hasn't changed
        new_share = data['share_percentage']
        if abs(new_share - doctor.share_percentage) > 0.001:  # Allow for float comparison
            if is_admin:
                # Only admin can change share percentage
                doctor.share_percentage = new_share
            else:
                # Receptionists cannot change share percentage
                return jsonify({'message': 'Only admin can change share percentage'}), 403
    if 'user_id' in data:
        # Only allow change if admin, or if value hasn't changed
        new_user_id = data.get('user_id')
        if new_user_id != doctor.user_id:
            if is_admin:
                # Only admin can change user_id
                doctor.user_id = new_user_id
            else:
                # Receptionists cannot change user_id
                return jsonify({'message': 'Only admin can change user_id'}), 403
    # Only admin can change is_active status (for soft delete)
    if 'is_active' in data:
        if is_admin:
            doctor.is_active = data['is_active']
        # Receptionists cannot change is_active, silently ignore
    
    # Update schedule if provided
    if 'schedule' in data and data['schedule'] is not None:
        # Delete existing schedule
        DoctorSchedule.query.filter_by(doctor_id=doctor_id).delete()
        
        # Add new schedule
        for schedule_item in data['schedule']:
            # Validate hour (must be 0-23)
            hour = schedule_item.get('hour')
            day_of_week = schedule_item.get('day_of_week')
            
            # Validate hour range
            if hour is None or not isinstance(hour, int) or hour < 0 or hour > 23:
                continue  # Skip invalid hour entries
            
            # Validate day_of_week range (0-6)
            if day_of_week is None or not isinstance(day_of_week, int) or day_of_week < 0 or day_of_week > 6:
                continue  # Skip invalid day entries
            
            schedule = DoctorSchedule(
                doctor_id=doctor.id,
                day_of_week=day_of_week,
                hour=hour,
                is_available=schedule_item.get('is_available', True)
            )
            db.session.add(schedule)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Doctor updated successfully',
        'doctor': doctor.to_dict()
    }), 200

@doctors_bp.route('/<int:doctor_id>', methods=['DELETE'])
@admin_required
@log_audit('delete_doctor', 'doctor')
def delete_doctor(doctor_id, current_user):
    """Hard delete doctor and all related data"""
    from app.models.visit import Visit
    from app.models.payment import Payment
    from app.models.user import User
    from app.models.patient import Patient
    
    doctor = Doctor.query.get_or_404(doctor_id)
    
    try:
        # Get all visits for this doctor first (before deleting anything)
        visits = Visit.query.filter_by(doctor_id=doctor_id).all()
        visit_ids = [visit.id for visit in visits]
        
        # Nullify appointment_id in visits before deleting appointments (visits reference appointments)
        if visit_ids:
            Visit.query.filter(Visit.id.in_(visit_ids)).update({'appointment_id': None}, synchronize_session=False)
        
        # Delete prescriptions for visits of this doctor (prescriptions reference visit_id, must be deleted before visits)
        if visit_ids:
            Prescription.query.filter(Prescription.visit_id.in_(visit_ids)).delete(synchronize_session=False)
        
        # Delete payments for visits of this doctor
        if visit_ids:
            Payment.query.filter(Payment.visit_id.in_(visit_ids)).delete(synchronize_session=False)
        
        # Delete visits for this doctor
        for visit in visits:
            db.session.delete(visit)
        
        # Delete all appointments for this doctor (after visits are deleted)
        appointments = Appointment.query.filter_by(doctor_id=doctor_id).all()
        for appointment in appointments:
            db.session.delete(appointment)
        
        # Delete all doctor schedules
        DoctorSchedule.query.filter_by(doctor_id=doctor_id).delete()
        
        # Delete doctor's user account if exists (only if no other doctors use it and no other appointments reference it)
        if doctor.user_id:
            # Check if this user is only used by this doctor
            other_doctors_with_user = Doctor.query.filter(
                Doctor.user_id == doctor.user_id,
                Doctor.id != doctor_id
            ).count()
            
            # Check if any remaining appointments were created by this user
            # (we've already deleted all appointments for this doctor, so any remaining would be for other doctors)
            remaining_appointments_by_user = Appointment.query.filter_by(created_by=doctor.user_id).count()
            
            if other_doctors_with_user == 0 and remaining_appointments_by_user == 0:
                user = User.query.get(doctor.user_id)
                if user:
                    db.session.delete(user)
        
        # Clear doctor_id from patients (set to NULL)
        Patient.query.filter_by(doctor_id=doctor_id).update({'doctor_id': None})
        
        # Finally delete the doctor
        db.session.delete(doctor)
        db.session.commit()
        
        return jsonify({'message': 'Doctor and all related data deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        from flask import current_app
        error_response = {'message': f'Error deleting doctor: {str(e)}'}
        # Only include traceback in debug mode for security
        if current_app.config.get('DEBUG'):
            import traceback
            error_response['detail'] = traceback.format_exc()
        return jsonify(error_response), 500

@doctors_bp.route('/<int:doctor_id>/schedule', methods=['GET'])
@jwt_required()
def get_doctor_schedule(doctor_id):
    """Get doctor's schedule for a specific date"""
    doctor = Doctor.query.get_or_404(doctor_id)
    date = request.args.get('date')
    
    if not date:
        return jsonify({'message': 'Date parameter is required'}), 400
    
    try:
        date_obj = datetime.strptime(date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Get appointments for the date
    appointments = db.session.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        db.func.date(Appointment.start_time) == date_obj
    ).order_by(Appointment.start_time).all()
    
    return jsonify({
        'doctor': doctor.to_dict(),
        'date': date,
        'appointments': [appointment.to_dict() for appointment in appointments]
    }), 200

@doctors_bp.route('/<int:doctor_id>/schedule', methods=['POST'])
@receptionist_required
@log_audit('update_doctor_schedule', 'doctor_schedule')
def update_doctor_schedule(doctor_id, current_user):
    """Bulk update doctor schedule (receptionists can update schedules)"""
    doctor = Doctor.query.get_or_404(doctor_id)
    data = request.get_json()
    
    if 'schedule' not in data:
        return jsonify({'message': 'Schedule data is required'}), 400
    
    schedule_data = data['schedule']
    
    # Delete existing schedule
    DoctorSchedule.query.filter_by(doctor_id=doctor_id).delete()
    
    # Add new schedule entries
    for schedule_item in schedule_data:
        # Validate hour (must be 0-23)
        hour = schedule_item.get('hour')
        day_of_week = schedule_item.get('day_of_week')
        
        # Validate hour range
        if hour is None or not isinstance(hour, int) or hour < 0 or hour > 23:
            continue  # Skip invalid hour entries
        
        # Validate day_of_week range (0-6)
        if day_of_week is None or not isinstance(day_of_week, int) or day_of_week < 0 or day_of_week > 6:
            continue  # Skip invalid day entries
        
        schedule = DoctorSchedule(
            doctor_id=doctor.id,
            day_of_week=day_of_week,
            hour=hour,
            is_available=schedule_item.get('is_available', True)
        )
        db.session.add(schedule)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Doctor schedule updated successfully',
        'doctor': doctor.to_dict()
    }), 200

@doctors_bp.route('/<int:doctor_id>/activate', methods=['POST'])
@admin_required
@log_audit('activate_doctor', 'doctor')
def activate_doctor(doctor_id, current_user):
    """Activate (soft un-delete) a doctor"""
    doctor = Doctor.query.get_or_404(doctor_id)
    doctor.is_active = True
    db.session.commit()
    
    return jsonify({
        'message': 'Doctor activated successfully',
        'doctor': doctor.to_dict()
    }), 200

@doctors_bp.route('/<int:doctor_id>/deactivate', methods=['POST'])
@admin_required
@log_audit('deactivate_doctor', 'doctor')
def deactivate_doctor(doctor_id, current_user):
    """Deactivate (soft delete) a doctor"""
    doctor = Doctor.query.get_or_404(doctor_id)
    doctor.is_active = False
    db.session.commit()
    
    return jsonify({
        'message': 'Doctor deactivated successfully',
        'doctor': doctor.to_dict()
    }), 200

@doctors_bp.route('/statistics', methods=['GET'])
@jwt_required()
def get_doctor_statistics():
    """Get doctor statistics"""
    try:
        clinic_id = request.args.get('clinic_id', type=int)
        
        # Build base query with filters
        base_query = Doctor.query
        if clinic_id:
            base_query = base_query.filter_by(clinic_id=clinic_id)
        
        total_doctors = base_query.count()
        
        # Count by clinic
        clinic_counts = {}
        doctors_by_clinic_query = db.session.query(
            Doctor.clinic_id,
            db.func.count(Doctor.id).label('count')
        )
        if clinic_id:
            doctors_by_clinic_query = doctors_by_clinic_query.filter_by(clinic_id=clinic_id)
        doctors_by_clinic = doctors_by_clinic_query.group_by(Doctor.clinic_id).all()
        
        for clinic_id_val, count in doctors_by_clinic:
            clinic = Clinic.query.get(clinic_id_val)
            clinic_name = clinic.name if clinic else f'Clinic {clinic_id_val}'
            clinic_counts[clinic_name] = count
        
        # Count by specialty
        specialty_counts = {}
        doctors_by_specialty_query = db.session.query(
            Doctor.specialty,
            db.func.count(Doctor.id).label('count')
        )
        if clinic_id:
            doctors_by_specialty_query = doctors_by_specialty_query.filter_by(clinic_id=clinic_id)
        doctors_by_specialty = doctors_by_specialty_query.group_by(Doctor.specialty).all()
        
        for specialty, count in doctors_by_specialty:
            if specialty:
                specialty_counts[specialty] = count
        
        return jsonify({
            'total_doctors': total_doctors,
            'by_clinic': clinic_counts,
            'by_specialty': specialty_counts
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error retrieving statistics: {str(e)}'}), 500
