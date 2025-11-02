from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models.clinic import Clinic
from app.models.service import Service
from app.models.doctor import Doctor
from app.utils.decorators import admin_required, receptionist_required, validate_json, log_audit
from sqlalchemy import or_ as sql_or
from datetime import datetime

clinics_bp = Blueprint('clinics', __name__)

@clinics_bp.route('', methods=['GET'])
@jwt_required()
def get_clinics():
    """Get all clinics with optional filters"""
    search = request.args.get('search', '').strip()
    is_active = request.args.get('is_active', type=str)
    
    query = Clinic.query
    
    # Filter by active status
    if is_active:
        if is_active.lower() == 'true':
            query = query.filter_by(is_active=True)
        elif is_active.lower() == 'false':
            query = query.filter_by(is_active=False)
    else:
        # Default: show all clinics for admin pages
        pass
    
    # Search by name or room number
    if search:
        search_term = f'%{search}%'
        query = query.filter(
            sql_or(
                Clinic.name.ilike(search_term),
                Clinic.room_number.ilike(search_term)
            )
        )
    
    clinics = query.order_by(Clinic.name).all()
    
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
@receptionist_required
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
@receptionist_required
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
    # Get all services (active and inactive) so admin can edit/delete inactive ones
    # For booking wizard, frontend can filter by is_active if needed
    services = Service.query.filter_by(clinic_id=clinic_id).all()
    
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
@receptionist_required
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

@clinics_bp.route('/<int:clinic_id>/services/<int:service_id>', methods=['PUT'])
@receptionist_required
@validate_json(['name', 'duration', 'price'])
@log_audit('update_service', 'service')
def update_service(clinic_id, service_id, data, current_user):
    """Update service for clinic"""
    clinic = Clinic.query.get_or_404(clinic_id)
    service = Service.query.filter_by(id=service_id, clinic_id=clinic_id).first_or_404()
    
    service.name = data['name']
    service.duration = data['duration']
    service.price = data['price']
    service.is_active = data.get('is_active', service.is_active)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Service updated successfully',
        'service': service.to_dict()
    }), 200

@clinics_bp.route('/<int:clinic_id>/services/<int:service_id>', methods=['DELETE'])
@receptionist_required
@log_audit('delete_service', 'service')
def delete_service(clinic_id, service_id, current_user):
    """Delete service from clinic"""
    clinic = Clinic.query.get_or_404(clinic_id)
    service = Service.query.filter_by(id=service_id, clinic_id=clinic_id).first_or_404()
    
    # Check if service has any appointments or visits
    from app.models.appointment import Appointment
    from app.models.visit import Visit
    
    if Appointment.query.filter_by(service_id=service_id).count() > 0:
        return jsonify({'message': 'Cannot delete service with existing appointments'}), 400
    if Visit.query.filter_by(service_id=service_id).count() > 0:
        return jsonify({'message': 'Cannot delete service with existing visits'}), 400
    
    db.session.delete(service)
    db.session.commit()
    
    return jsonify({'message': 'Service deleted successfully'}), 200

@clinics_bp.route('/statistics', methods=['GET'])
@jwt_required()
def get_clinic_statistics():
    """Get clinic statistics"""
    try:
        clinic_id = request.args.get('clinic_id', type=int)
        
        # Build base queries with filters
        if clinic_id:
            clinics_query = Clinic.query.filter_by(id=clinic_id)
            services_query = Service.query.filter_by(clinic_id=clinic_id)
            doctors_query = Doctor.query.filter_by(clinic_id=clinic_id)
        else:
            clinics_query = Clinic.query
            services_query = Service.query
            doctors_query = Doctor.query
        
        total_clinics = clinics_query.count()
        active_clinics = clinics_query.filter_by(is_active=True).count()
        inactive_clinics = total_clinics - active_clinics
        
        # Total services
        total_services = services_query.count()
        active_services = services_query.filter_by(is_active=True).count()
        
        # Total doctors
        total_doctors = doctors_query.count()
        
        return jsonify({
            'total_clinics': total_clinics,
            'active_clinics': active_clinics,
            'inactive_clinics': inactive_clinics,
            'total_services': total_services,
            'active_services': active_services,
            'total_doctors': total_doctors
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error retrieving statistics: {str(e)}'}), 500
