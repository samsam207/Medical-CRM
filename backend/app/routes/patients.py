from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, cache
from app.models.patient import Patient, Gender
from app.models.appointment import Appointment
from app.models.visit import Visit
from app.utils.decorators import receptionist_required, validate_json, log_audit
from app.utils.validators import validate_phone_number
from datetime import datetime

patients_bp = Blueprint('patients', __name__)

@patients_bp.route('', methods=['GET'])
@jwt_required()
def get_patients():
    """Search patients by phone or name"""
    phone = request.args.get('phone')
    name = request.args.get('name')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    # Create cache key
    cache_key = f'patients_{phone}_{name}_{page}_{per_page}'
    
    # Try to get from cache first
    cached_result = cache.get(cache_key)
    if cached_result:
        return jsonify(cached_result), 200
    
    query = Patient.query
    
    if phone:
        query = query.filter(Patient.phone.contains(phone))
    if name:
        query = query.filter(Patient.name.contains(name))
    
    # Order by name
    query = query.order_by(Patient.name)
    
    # Paginate
    patients = query.paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    result = {
        'patients': [patient.to_dict() for patient in patients.items],
        'total': patients.total,
        'pages': patients.pages,
        'current_page': page,
        'per_page': per_page
    }
    
    # Cache for 5 minutes
    cache.set(cache_key, result, timeout=300)
    
    return jsonify(result), 200

@patients_bp.route('/<int:patient_id>', methods=['GET'])
@jwt_required()
def get_patient(patient_id):
    """Get patient details with history"""
    patient = Patient.query.get_or_404(patient_id)
    
    # Get recent appointments
    recent_appointments = db.session.query(Appointment).filter(
        Appointment.patient_id == patient_id
    ).order_by(Appointment.start_time.desc()).limit(10).all()
    
    # Get recent visits
    recent_visits = db.session.query(Visit).filter(
        Visit.patient_id == patient_id
    ).order_by(Visit.created_at.desc()).limit(10).all()
    
    patient_data = patient.to_dict()
    patient_data['recent_appointments'] = [apt.to_dict() for apt in recent_appointments]
    patient_data['recent_visits'] = [visit.to_dict() for visit in recent_visits]
    
    return jsonify({'patient': patient_data}), 200

@patients_bp.route('', methods=['POST'])
@receptionist_required
@validate_json(['name', 'phone'])
@log_audit('create_patient', 'patient')
def create_patient(data, current_user):
    """Create new patient"""
    # Validate phone number
    if not validate_phone_number(data['phone']):
        return jsonify({'message': 'Invalid phone number format'}), 400
    
    # Check if patient already exists
    existing_patient = Patient.query.filter_by(phone=data['phone']).first()
    if existing_patient:
        return jsonify({'message': 'Patient with this phone number already exists'}), 400
    
    # Create patient
    patient = Patient(
        name=data['name'],
        phone=data['phone'],
        address=data.get('address'),
        age=data.get('age'),
        gender=Gender(data['gender'].lower()) if data.get('gender') else None,
        medical_history=data.get('medical_history')
    )
    
    db.session.add(patient)
    db.session.commit()
    
    return jsonify({
        'message': 'Patient created successfully',
        'patient': patient.to_dict()
    }), 201

@patients_bp.route('/<int:patient_id>', methods=['DELETE'])
@receptionist_required
@log_audit('delete_patient', 'patient')
def delete_patient(patient_id, current_user):
    """Delete patient"""
    patient = Patient.query.get_or_404(patient_id)
    
    # Check if patient has any appointments or visits
    if patient.appointments.count() > 0 or patient.visits.count() > 0:
        return jsonify({'message': 'Cannot delete patient with existing appointments or visits'}), 400
    
    db.session.delete(patient)
    db.session.commit()
    
    return jsonify({'message': 'Patient deleted successfully'}), 200

@patients_bp.route('/<int:patient_id>', methods=['PUT'])
@receptionist_required
@log_audit('update_patient', 'patient')
def update_patient(patient_id, current_user):
    """Update patient information"""
    patient = Patient.query.get_or_404(patient_id)
    data = request.get_json()
    
    # Validate phone number if provided
    if 'phone' in data:
        if not validate_phone_number(data['phone']):
            return jsonify({'message': 'Invalid phone number format'}), 400
        
        # Check if phone is already taken by another patient
        existing_patient = Patient.query.filter(
            Patient.phone == data['phone'],
            Patient.id != patient_id
        ).first()
        if existing_patient:
            return jsonify({'message': 'Phone number already taken by another patient'}), 400
        
        patient.phone = data['phone']
    
    # Update other fields
    if 'name' in data:
        patient.name = data['name']
    if 'address' in data:
        patient.address = data['address']
    if 'age' in data:
        patient.age = data['age']
    if 'gender' in data:
        try:
            patient.gender = Gender(data['gender'])
        except ValueError:
            return jsonify({'message': 'Invalid gender'}), 400
    if 'medical_history' in data:
        patient.medical_history = data['medical_history']
    
    patient.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': 'Patient updated successfully',
        'patient': patient.to_dict()
    }), 200

@patients_bp.route('/search', methods=['GET'])
@jwt_required()
def search_patients():
    """Quick patient search for booking"""
    query = request.args.get('q', '')
    
    if len(query) < 2:
        return jsonify({'patients': []}), 200
    
    # Search by phone or name
    patients = Patient.query.filter(
        db.or_(
            Patient.phone.contains(query),
            Patient.name.contains(query)
        )
    ).limit(10).all()
    
    return jsonify({
        'patients': [patient.to_dict() for patient in patients]
    }), 200
