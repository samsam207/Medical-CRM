from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from app import db
from app.models.prescription import Prescription
from app.models.visit import Visit, VisitStatus
from app.models.doctor import Doctor
from app.models.user import User, UserRole
from app.utils.decorators import doctor_required, validate_json, log_audit
from app.utils.validators import validate_file_upload, sanitize_filename
import os
from datetime import datetime

prescriptions_bp = Blueprint('prescriptions', __name__)

@prescriptions_bp.route('', methods=['POST'])
@doctor_required
@validate_json(['visit_id', 'diagnosis', 'medications'])
@log_audit('create_prescription', 'prescription')
def create_prescription(data, current_user):
    """Create prescription for visit"""
    visit_id = data['visit_id']
    visit = Visit.query.get_or_404(visit_id)
    
    # Check if visit belongs to current doctor
    doctor = Doctor.query.filter_by(user_id=current_user.id).first()
    if not doctor or visit.doctor_id != doctor.id:
        return jsonify({'message': 'Unauthorized to create prescription for this visit'}), 403
    
    # Check if visit is in progress
    if visit.status != VisitStatus.IN_PROGRESS:
        return jsonify({'message': 'Visit must be in progress to create prescription'}), 400
    
    # Check if prescription already exists
    if visit.prescription:
        return jsonify({'message': 'Prescription already exists for this visit'}), 400
    
    # Create prescription
    prescription = Prescription(
        visit_id=visit_id,
        doctor_id=doctor.id,
        diagnosis=data['diagnosis'],
        medications=data['medications'],
        notes=data.get('notes')
    )
    
    db.session.add(prescription)
    
    # Update visit status to pending payment
    visit.status = VisitStatus.PENDING_PAYMENT
    visit.end_time = datetime.utcnow()
    
    # Create automatic follow-up appointment (2 weeks later)
    if data.get('schedule_followup', True):
        from app.services.booking_service import BookingService
        from datetime import timedelta
        
        followup_date = datetime.utcnow() + timedelta(days=14)
        booking_service = BookingService()
        
        try:
            followup_appointment = booking_service.create_followup_appointment(
                patient_id=visit.patient_id,
                doctor_id=visit.doctor_id,
                clinic_id=visit.clinic_id,
                service_id=visit.service_id,
                followup_date=followup_date,
                original_visit_id=visit.id
            )
            
            if followup_appointment:
                print(f"Follow-up appointment created: {followup_appointment.booking_id}")
        except Exception as e:
            print(f"Failed to create follow-up appointment: {e}")
            # Don't fail the prescription creation if follow-up fails
    
    db.session.commit()
    
    return jsonify({
        'message': 'Prescription created successfully',
        'prescription': prescription.to_dict()
    }), 201

@prescriptions_bp.route('/<int:visit_id>', methods=['GET'])
@jwt_required()
def get_prescription(visit_id):
    """Get prescription by visit ID"""
    visit = Visit.query.get_or_404(visit_id)
    
    if not visit.prescription:
        return jsonify({'message': 'No prescription found for this visit'}), 404
    
    return jsonify({'prescription': visit.prescription.to_dict()}), 200

@prescriptions_bp.route('/<int:prescription_id>', methods=['PUT'])
@doctor_required
@log_audit('update_prescription', 'prescription')
def update_prescription(prescription_id, current_user):
    """Update prescription"""
    prescription = Prescription.query.get_or_404(prescription_id)
    
    # Check if prescription belongs to current doctor
    doctor = Doctor.query.filter_by(user_id=current_user.id).first()
    if not doctor or prescription.visit.doctor_id != doctor.id:
        return jsonify({'message': 'Unauthorized to update this prescription'}), 403
    
    data = request.get_json()
    
    # Update fields if provided
    if 'diagnosis' in data:
        prescription.diagnosis = data['diagnosis']
    if 'medications' in data:
        prescription.medications = data['medications']
    if 'notes' in data:
        prescription.notes = data['notes']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Prescription updated successfully',
        'prescription': prescription.to_dict()
    }), 200

@prescriptions_bp.route('/upload-image', methods=['POST'])
@doctor_required
@log_audit('upload_prescription_image', 'prescription')
def upload_prescription_image(current_user):
    """Upload prescription image"""
    if 'file' not in request.files:
        return jsonify({'message': 'No file provided'}), 400
    
    file = request.files['file']
    visit_id = request.form.get('visit_id')
    
    if not visit_id:
        return jsonify({'message': 'visit_id is required'}), 400
    
    # Validate file
    is_valid, message = validate_file_upload(file)
    if not is_valid:
        return jsonify({'message': message}), 400
    
    # Get visit and check authorization
    visit = Visit.query.get_or_404(visit_id)
    doctor = Doctor.query.filter_by(user_id=current_user.id).first()
    if not doctor or visit.doctor_id != doctor.id:
        return jsonify({'message': 'Unauthorized to upload image for this visit'}), 403
    
    # Get or create prescription
    prescription = visit.prescription
    if not prescription:
        prescription = Prescription(
            visit_id=visit_id,
            doctor_id=doctor.id,
            diagnosis="",
            medications=""
        )
        db.session.add(prescription)
    
    # Create upload directory for visit
    visit_upload_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'prescriptions', str(visit_id))
    os.makedirs(visit_upload_dir, exist_ok=True)
    
    # Generate filename
    filename = sanitize_filename(file.filename)
    file_extension = filename.split('.')[-1]
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    safe_filename = f"prescription_{timestamp}.{file_extension}"
    
    # Save file
    file_path = os.path.join(visit_upload_dir, safe_filename)
    file.save(file_path)
    
    # Update prescription with image path
    prescription.image_path = file_path
    db.session.commit()
    
    return jsonify({
        'message': 'Image uploaded successfully',
        'image_path': file_path,
        'prescription': prescription.to_dict()
    }), 200

@prescriptions_bp.route('/image/<int:prescription_id>', methods=['GET'])
@jwt_required()
def get_prescription_image(prescription_id):
    """Get prescription image"""
    prescription = Prescription.query.get_or_404(prescription_id)
    
    if not prescription.image_path or not os.path.exists(prescription.image_path):
        return jsonify({'message': 'Image not found'}), 404
    
    from flask import send_file
    return send_file(prescription.image_path)
