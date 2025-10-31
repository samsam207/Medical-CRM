from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.doctor import Doctor
from app.models.clinic import Clinic
from app.models.user import User, UserRole
from app.models.doctor_schedule import DoctorSchedule
from app.models.appointment import Appointment
from app.utils.decorators import admin_required, validate_json, log_audit
from datetime import datetime

doctors_bp = Blueprint('doctors', __name__)

@doctors_bp.route('', methods=['GET'])
@jwt_required()
def get_doctors():
    """Get all doctors with optional availability filter"""
    from app.models.doctor_schedule import DoctorSchedule
    
    clinic_id = request.args.get('clinic_id', type=int)
    datetime_str = request.args.get('datetime')
    
    query = Doctor.query
    
    # Filter by clinic if provided
    if clinic_id:
        query = query.filter_by(clinic_id=clinic_id)
    
    doctors = query.all()
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
                doctor_dict = doctor.to_dict(include_schedule=False)
                # Check if doctor is available at this time
                is_available = doctor.is_available_at(day_of_week, hour)
                doctor_dict['is_available'] = is_available
                doctor_list.append(doctor_dict)
        except ValueError:
            # If datetime parsing fails, just return doctors without availability check
            doctor_list = [doctor.to_dict(include_schedule=False) for doctor in doctors]
    else:
        # No datetime filter - check general availability
        for doctor in doctors:
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
    
    # Create doctor
    doctor = Doctor(
        name=data['name'],
        specialty=data['specialty'],
        working_days=data['working_days'],
        working_hours=data['working_hours'],
        clinic_id=data['clinic_id'],
        share_percentage=data.get('share_percentage', 0.7),
        user_id=data.get('user_id')
    )
    
    db.session.add(doctor)
    db.session.flush()  # Get the doctor.id
    
    # Add schedule if provided
    if 'schedule' in data and data['schedule']:
        for schedule_item in data['schedule']:
            schedule = DoctorSchedule(
                doctor_id=doctor.id,
                day_of_week=schedule_item['day_of_week'],
                hour=schedule_item['hour'],
                is_available=schedule_item.get('is_available', True)
            )
            db.session.add(schedule)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Doctor created successfully',
        'doctor': doctor.to_dict()
    }), 201

@doctors_bp.route('/<int:doctor_id>', methods=['PUT'])
@admin_required
@log_audit('update_doctor', 'doctor')
def update_doctor(doctor_id, current_user):
    """Update doctor information"""
    from app.models.doctor_schedule import DoctorSchedule
    
    doctor = Doctor.query.get_or_404(doctor_id)
    data = request.get_json()
    
    # Update fields if provided
    if 'name' in data:
        doctor.name = data['name']
    if 'specialty' in data:
        doctor.specialty = data['specialty']
    if 'working_days' in data:
        doctor.working_days = data['working_days']
    if 'working_hours' in data:
        doctor.working_hours = data['working_hours']
    if 'clinic_id' in data:
        # Validate clinic exists
        clinic = Clinic.query.get(data['clinic_id'])
        if not clinic:
            return jsonify({'message': 'Clinic not found'}), 404
        doctor.clinic_id = data['clinic_id']
    if 'share_percentage' in data:
        doctor.share_percentage = data['share_percentage']
    if 'user_id' in data:
        doctor.user_id = data['user_id']
    
    # Update schedule if provided
    if 'schedule' in data and data['schedule'] is not None:
        # Delete existing schedule
        DoctorSchedule.query.filter_by(doctor_id=doctor_id).delete()
        
        # Add new schedule
        for schedule_item in data['schedule']:
            schedule = DoctorSchedule(
                doctor_id=doctor.id,
                day_of_week=schedule_item['day_of_week'],
                hour=schedule_item['hour'],
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
    """Delete doctor"""
    doctor = Doctor.query.get_or_404(doctor_id)
    
    # Check if doctor has any appointments or visits
    if doctor.appointments.count() > 0 or doctor.visits.count() > 0:
        return jsonify({'message': 'Cannot delete doctor with existing appointments or visits'}), 400
    
    db.session.delete(doctor)
    db.session.commit()
    
    return jsonify({'message': 'Doctor deleted successfully'}), 200

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
@admin_required
@log_audit('update_doctor_schedule', 'doctor_schedule')
def update_doctor_schedule(doctor_id, current_user):
    """Bulk update doctor schedule"""
    doctor = Doctor.query.get_or_404(doctor_id)
    data = request.get_json()
    
    if 'schedule' not in data:
        return jsonify({'message': 'Schedule data is required'}), 400
    
    schedule_data = data['schedule']
    
    # Delete existing schedule
    DoctorSchedule.query.filter_by(doctor_id=doctor_id).delete()
    
    # Add new schedule entries
    for schedule_item in schedule_data:
        schedule = DoctorSchedule(
            doctor_id=doctor.id,
            day_of_week=schedule_item['day_of_week'],
            hour=schedule_item['hour'],
            is_available=schedule_item.get('is_available', True)
        )
        db.session.add(schedule)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Doctor schedule updated successfully',
        'doctor': doctor.to_dict()
    }), 200
