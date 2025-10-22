from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.doctor import Doctor
from app.models.clinic import Clinic
from app.models.user import User, UserRole
from app.utils.decorators import admin_required, validate_json, log_audit
from datetime import datetime

doctors_bp = Blueprint('doctors', __name__)

@doctors_bp.route('', methods=['GET'])
@jwt_required()
def get_doctors():
    """Get all doctors"""
    doctors = Doctor.query.all()
    return jsonify({
        'doctors': [doctor.to_dict() for doctor in doctors]
    }), 200

@doctors_bp.route('/<int:doctor_id>', methods=['GET'])
@jwt_required()
def get_doctor(doctor_id):
    """Get doctor details"""
    doctor = Doctor.query.get_or_404(doctor_id)
    return jsonify({'doctor': doctor.to_dict()}), 200

@doctors_bp.route('', methods=['POST'])
@admin_required
@validate_json(['name', 'specialty', 'working_days', 'working_hours', 'clinic_id', 'share_percentage'])
@log_audit('create_doctor', 'doctor')
def create_doctor(data, current_user):
    """Create new doctor"""
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
