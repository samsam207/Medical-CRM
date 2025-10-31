from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.clinic import Clinic
from app.models.service import Service
from app.models.doctor import Doctor
from app.utils.decorators import admin_required, validate_json, log_audit
from datetime import datetime

clinics_bp = Blueprint('clinics', __name__)

@clinics_bp.route('', methods=['GET'])
@jwt_required()
def get_clinics():
    """Get all clinics"""
    clinics = Clinic.query.filter_by(is_active=True).all()
    return jsonify({
        'clinics': [clinic.to_dict() for clinic in clinics]
    }), 200

@clinics_bp.route('/<int:clinic_id>', methods=['GET'])
@jwt_required()
def get_clinic(clinic_id):
    """Get clinic details"""
    clinic = Clinic.query.get_or_404(clinic_id)
    return jsonify({'clinic': clinic.to_dict()}), 200

@clinics_bp.route('', methods=['POST'])
@admin_required
@validate_json(['name', 'room_number'])
@log_audit('create_clinic', 'clinic')
def create_clinic(data, current_user):
    """Create new clinic"""
    clinic = Clinic(
        name=data['name'],
        room_number=data['room_number'],
        is_active=data.get('is_active', True)
    )
    
    db.session.add(clinic)
    db.session.commit()
    
    return jsonify({
        'message': 'Clinic created successfully',
        'clinic': clinic.to_dict()
    }), 201

@clinics_bp.route('/<int:clinic_id>', methods=['PUT'])
@admin_required
@log_audit('update_clinic', 'clinic')
def update_clinic(clinic_id, current_user):
    """Update clinic information"""
    clinic = Clinic.query.get_or_404(clinic_id)
    data = request.get_json()
    
    # Update fields if provided
    if 'name' in data:
        clinic.name = data['name']
    if 'room_number' in data:
        clinic.room_number = data['room_number']
    if 'is_active' in data:
        clinic.is_active = data['is_active']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Clinic updated successfully',
        'clinic': clinic.to_dict()
    }), 200

@clinics_bp.route('/<int:clinic_id>/services', methods=['GET'])
@jwt_required()
def get_clinic_services(clinic_id):
    """Get services for a specific clinic"""
    clinic = Clinic.query.get_or_404(clinic_id)
    services = Service.query.filter_by(clinic_id=clinic_id, is_active=True).all()
    
    return jsonify({
        'clinic': clinic.to_dict(),
        'services': [service.to_dict() for service in services]
    }), 200

@clinics_bp.route('/<int:clinic_id>/doctors', methods=['GET'])
@jwt_required()
def get_clinic_doctors(clinic_id):
    """Get doctors for a specific clinic"""
    from sqlalchemy.orm import joinedload
    from app.models.doctor_schedule import DoctorSchedule
    
    clinic = Clinic.query.get_or_404(clinic_id)
    
    # Eager load schedules to avoid N+1 queries
    doctors = Doctor.query.filter_by(clinic_id=clinic_id).all()
    
    # Pre-fetch all schedules for these doctors in one query
    doctor_ids = [doctor.id for doctor in doctors]
    schedules = DoctorSchedule.query.filter(
        DoctorSchedule.doctor_id.in_(doctor_ids)
    ).all()
    
    # Group schedules by doctor_id
    schedules_by_doctor = {}
    for schedule in schedules:
        if schedule.doctor_id not in schedules_by_doctor:
            schedules_by_doctor[schedule.doctor_id] = []
        schedules_by_doctor[schedule.doctor_id].append(schedule)
    
    # Check if each doctor has any available schedule
    doctor_list = []
    for doctor in doctors:
        doctor_dict = doctor.to_dict(include_schedule=False)
        # Replace schedule with pre-fetched data
        doctor_dict['schedule'] = [s.to_dict() for s in schedules_by_doctor.get(doctor.id, [])]
        # Check if doctor has any available hours
        has_availability = any(s.is_available for s in schedules_by_doctor.get(doctor.id, []))
        doctor_dict['has_schedule'] = len(doctor_dict['schedule']) > 0
        doctor_dict['is_available'] = has_availability if doctor_dict['has_schedule'] else True
        doctor_list.append(doctor_dict)
    
    return jsonify({
        'data': {
            'doctors': doctor_list
        }
    }), 200

@clinics_bp.route('/<int:clinic_id>', methods=['DELETE'])
@admin_required
@log_audit('delete_clinic', 'clinic')
def delete_clinic(clinic_id, current_user):
    """Delete clinic"""
    from app.models.doctor import Doctor
    from app.models.service import Service
    from app.models.appointment import Appointment
    
    clinic = Clinic.query.get_or_404(clinic_id)
    
    # Check if clinic has any doctors, services, or appointments
    if Doctor.query.filter_by(clinic_id=clinic_id).count() > 0:
        return jsonify({'message': 'Cannot delete clinic with existing doctors'}), 400
    if Service.query.filter_by(clinic_id=clinic_id).count() > 0:
        return jsonify({'message': 'Cannot delete clinic with existing services'}), 400
    if Appointment.query.filter_by(clinic_id=clinic_id).count() > 0:
        return jsonify({'message': 'Cannot delete clinic with existing appointments'}), 400
    
    db.session.delete(clinic)
    db.session.commit()
    
    return jsonify({'message': 'Clinic deleted successfully'}), 200

@clinics_bp.route('/<int:clinic_id>/services', methods=['POST'])
@admin_required
@validate_json(['name', 'duration', 'price'])
@log_audit('create_service', 'service')
def create_service(clinic_id, data, current_user):
    """Create new service for clinic"""
    clinic = Clinic.query.get_or_404(clinic_id)
    
    service = Service(
        clinic_id=clinic_id,
        name=data['name'],
        duration=data['duration'],
        price=data['price'],
        is_active=data.get('is_active', True)
    )
    
    db.session.add(service)
    db.session.commit()
    
    return jsonify({
        'message': 'Service created successfully',
        'service': service.to_dict()
    }), 201
