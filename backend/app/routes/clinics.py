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
    clinic = Clinic.query.get_or_404(clinic_id)
    doctors = Doctor.query.filter_by(clinic_id=clinic_id).all()
    
    return jsonify({
        'data': {
            'doctors': [doctor.to_dict() for doctor in doctors]
        }
    }), 200

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
