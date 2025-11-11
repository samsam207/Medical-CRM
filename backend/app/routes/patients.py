from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required
from app import db, cache
from app.models.patient import Patient, Gender
from app.models.appointment import Appointment
from app.models.visit import Visit
from app.utils.decorators import receptionist_required, validate_json, log_audit
from app.utils.validators import validate_phone_number
from datetime import datetime, timedelta
import csv
from io import StringIO, BytesIO

patients_bp = Blueprint('patients', __name__)

@patients_bp.route('', methods=['GET'])
@jwt_required()
def get_patients():
    """Search patients by phone or name"""
    phone = request.args.get('phone')
    name = request.args.get('name')
    gender = request.args.get('gender')
    clinic_id = request.args.get('clinic_id', type=int)
    doctor_id = request.args.get('doctor_id', type=int)
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    # Create cache key
    cache_key = f'patients_{phone}_{name}_{gender}_{clinic_id}_{doctor_id}_{page}_{per_page}'
    
    # Try to get from cache first
    cached_result = cache.get(cache_key)
    if cached_result:
        return jsonify(cached_result), 200
    
    # Build base query - filter by assigned clinic/doctor first
    query = Patient.query
    
    # Filter by assigned clinic_id (patient's assigned clinic)
    if clinic_id:
        query = query.filter(Patient.clinic_id == clinic_id)
    
    # Filter by assigned doctor_id (patient's assigned doctor)
    if doctor_id:
        query = query.filter(Patient.doctor_id == doctor_id)
    
    # Additional filters
    if phone:
        query = query.filter(Patient.phone.contains(phone))
    if name:
        # Use case-insensitive search
        query = query.filter(Patient.name.ilike(f'%{name}%'))
    if gender and gender != 'all':
        try:
            gender_enum = Gender(gender.lower())
            query = query.filter(Patient.gender == gender_enum)
        except ValueError:
            pass  # Invalid gender value, ignore
    
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
    
    # Validate clinic_id and doctor_id if provided
    clinic_id = data.get('clinic_id')
    doctor_id = data.get('doctor_id')
    
    if clinic_id:
        from app.models.clinic import Clinic
        clinic = Clinic.query.get(clinic_id)
        if not clinic or not clinic.is_active:
            return jsonify({'message': 'Invalid or inactive clinic'}), 400
    
    if doctor_id:
        from app.models.doctor import Doctor
        doctor = Doctor.query.get(doctor_id)
        if not doctor or not doctor.is_active:
            return jsonify({'message': 'Invalid or inactive doctor'}), 400
        
        # If doctor is provided, validate it belongs to the clinic if clinic_id is also provided
        if clinic_id and doctor.clinic_id != clinic_id:
            return jsonify({'message': 'Doctor does not belong to the specified clinic'}), 400
        
        # If only doctor is provided, assign clinic_id from doctor
        if not clinic_id and doctor.clinic_id:
            clinic_id = doctor.clinic_id
    
    # Create patient
    patient = Patient(
        name=data['name'],
        phone=data['phone'],
        address=data.get('address'),
        age=data.get('age'),
        gender=Gender(data['gender'].lower()) if data.get('gender') else None,
        medical_history=data.get('medical_history'),
        clinic_id=clinic_id,
        doctor_id=doctor_id
    )
    
    db.session.add(patient)
    db.session.commit()
    
    # Emit real-time update for patient creation
    from app import socketio
    socketio.emit('patient_created', {
        'patient': patient.to_dict()
    })
    
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
    
    # Update clinic_id and doctor_id if provided
    if 'clinic_id' in data:
        clinic_id = data['clinic_id']
        if clinic_id:
            from app.models.clinic import Clinic
            clinic = Clinic.query.get(clinic_id)
            if not clinic or not clinic.is_active:
                return jsonify({'message': 'Invalid or inactive clinic'}), 400
        patient.clinic_id = clinic_id
    
    if 'doctor_id' in data:
        doctor_id = data['doctor_id']
        if doctor_id:
            from app.models.doctor import Doctor
            doctor = Doctor.query.get(doctor_id)
            if not doctor or not doctor.is_active:
                return jsonify({'message': 'Invalid or inactive doctor'}), 400
            
            # Validate doctor belongs to clinic if clinic_id is set
            if patient.clinic_id and doctor.clinic_id != patient.clinic_id:
                return jsonify({'message': 'Doctor does not belong to the patient\'s clinic'}), 400
            
            # If clinic_id is not set, assign it from doctor
            if not patient.clinic_id and doctor.clinic_id:
                patient.clinic_id = doctor.clinic_id
        else:
            patient.doctor_id = None
    
    patient.updated_at = datetime.utcnow()
    db.session.commit()
    
    # Emit real-time update for patient update
    from app import socketio
    socketio.emit('patient_updated', {
        'patient': patient.to_dict()
    })
    
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

@patients_bp.route('/export', methods=['GET'])
@jwt_required()
def export_patients():
    """Export patients to CSV"""
    try:
        # Get all patients (can add filters later)
        patients = Patient.query.order_by(Patient.name).all()
        
        # Create CSV in memory
        output = StringIO()
        writer = csv.writer(output)
        
        # Write headers
        writer.writerow([
            'ID', 'Name', 'Phone', 'Age', 'Gender', 'Address', 'Medical History', 'Created At'
        ])
        
        # Write data
        for patient in patients:
            writer.writerow([
                patient.id,
                patient.name,
                patient.phone,
                patient.age,
                patient.gender.value if patient.gender else '',
                patient.address or '',
                patient.medical_history or '',
                patient.created_at.strftime('%Y-%m-%d %H:%M:%S') if patient.created_at else ''
            ])
        
        # Create response
        output.seek(0)
        
        # Create a BytesIO for the response
        from io import BytesIO
        csv_bytes = BytesIO()
        csv_bytes.write(output.getvalue().encode('utf-8-sig'))  # UTF-8 with BOM for Excel compatibility
        csv_bytes.seek(0)
        
        return send_file(
            csv_bytes,
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'patients_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.csv'
        )
    except Exception as e:
        return jsonify({'message': f'Error exporting patients: {str(e)}'}), 500

@patients_bp.route('/statistics', methods=['GET'])
@jwt_required()
def get_patient_statistics():
    """Get patient statistics"""
    try:
        from app.models.visit import Visit
        clinic_id = request.args.get('clinic_id', type=int)
        
        # Build base query - filter by clinic if provided
        if clinic_id:
            # Get patients who have visited this clinic
            patient_ids = db.session.query(Visit.patient_id).filter_by(clinic_id=clinic_id).distinct()
            base_query = Patient.query.filter(Patient.id.in_(patient_ids))
        else:
            base_query = Patient.query
        
        total_patients = base_query.count()
        
        # Count by gender
        male_count = base_query.filter_by(gender=Gender.MALE).count()
        female_count = base_query.filter_by(gender=Gender.FEMALE).count()
        other_count = base_query.filter_by(gender=Gender.OTHER).count()
        
        # Recent registrations (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_count = base_query.filter(
            Patient.created_at >= thirty_days_ago
        ).count()
        
        return jsonify({
            'total': total_patients,
            'by_gender': {
                'male': male_count,
                'female': female_count,
                'other': other_count
            },
                'recent': recent_count
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error retrieving statistics: {str(e)}'}), 500
