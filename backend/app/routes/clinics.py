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
@receptionist_required
@log_audit('update_clinic', 'clinic')
def update_clinic(clinic_id, current_user):
    """Update clinic information (receptionists and admins can edit)"""
    clinic = Clinic.query.get_or_404(clinic_id)
    data = request.get_json()
    
    # Check if user is admin (for is_active field)
    from app.models.user import UserRole
    is_admin = current_user.role == UserRole.ADMIN
    
    # Update fields if provided
    if 'name' in data:
        clinic.name = data['name']
    if 'room_number' in data:
        clinic.room_number = data['room_number']
    # Only admin can change is_active status (for soft delete)
    if 'is_active' in data and is_admin:
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
    
    # Get is_active filter if provided (for booking, only show active doctors)
    is_active_param = request.args.get('is_active', type=str)
    doctor_query = Doctor.query.filter_by(clinic_id=clinic_id)
    if is_active_param:
        if is_active_param.lower() == 'true':
            doctor_query = doctor_query.filter_by(is_active=True)
        elif is_active_param.lower() == 'false':
            doctor_query = doctor_query.filter_by(is_active=False)
    
    # Eager load schedules to avoid N+1 queries
    doctors = doctor_query.all()
    
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
    """Hard delete clinic and all related data"""
    from app.models.doctor import Doctor
    from app.models.service import Service
    from app.models.appointment import Appointment
    from app.models.visit import Visit
    from app.models.patient import Patient
    from app.models.doctor_schedule import DoctorSchedule
    from app.models.prescription import Prescription
    from app.models.payment import Payment
    from app.models.user import User
    from app.models.notification import Notification
    from app.models.audit_log import AuditLog
    
    clinic = Clinic.query.get_or_404(clinic_id)
    
    # Debug: Log what we're about to delete
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Starting deletion of clinic {clinic_id} ({clinic.name})")
    
    try:
        # Get all related doctors first
        doctors = Doctor.query.filter_by(clinic_id=clinic_id).all()
        logger.info(f"Found {len(doctors)} doctors in clinic {clinic_id}")
        
        # Delete all related data for doctors in this clinic
        for doctor in doctors:
            logger.info(f"Processing doctor {doctor.id} ({doctor.name})")
            doctor_id = doctor.id
            
            # Get all visits for this doctor first (before deleting anything)
            doctor_visits = Visit.query.filter_by(doctor_id=doctor_id).all()
            doctor_visit_ids = [visit.id for visit in doctor_visits]
            
            if doctor_visit_ids:
                logger.info(f"  Found {len(doctor_visit_ids)} visits for doctor {doctor_id}")
                # Delete prescriptions for visits of this doctor (prescriptions reference visit_id)
                try:
                    presc_count = Prescription.query.filter(Prescription.visit_id.in_(doctor_visit_ids)).delete(synchronize_session=False)
                    logger.info(f"  Deleted {presc_count} prescriptions")
                except Exception as e:
                    logger.error(f"  Error deleting prescriptions: {e}")
                    raise
                
                # Delete payments for visits of this doctor
                try:
                    payment_count = Payment.query.filter(Payment.visit_id.in_(doctor_visit_ids)).delete(synchronize_session=False)
                    logger.info(f"  Deleted {payment_count} payments")
                except Exception as e:
                    logger.error(f"  Error deleting payments: {e}")
                    raise
                
                # Nullify appointment_id in visits before deleting appointments (visits reference appointments)
                try:
                    updated_count = Visit.query.filter(Visit.id.in_(doctor_visit_ids)).update({'appointment_id': None}, synchronize_session=False)
                    logger.info(f"  Nullified appointment_id in {updated_count} visits")
                except Exception as e:
                    logger.error(f"  Error nullifying appointment_id: {e}")
                    raise
            
            # Delete visits for this doctor
            logger.info(f"  Deleting {len(doctor_visits)} visits")
            for visit in doctor_visits:
                try:
                    db.session.delete(visit)
                except Exception as e:
                    logger.error(f"  Error deleting visit {visit.id}: {e}")
                    raise
            
            # Get appointments for this doctor before deleting
            appointments = Appointment.query.filter_by(doctor_id=doctor_id).all()
            appointment_ids = [appt.id for appt in appointments]
            logger.info(f"  Found {len(appointment_ids)} appointments for doctor {doctor_id}")
            
            # Delete notifications for these appointments (notifications reference appointments)
            if appointment_ids:
                try:
                    notif_count = Notification.query.filter(Notification.related_appointment_id.in_(appointment_ids)).delete(synchronize_session=False)
                    logger.info(f"  Deleted {notif_count} notifications")
                except Exception as e:
                    logger.error(f"  Error deleting notifications: {e}")
                    raise
            
            # Delete appointments for this doctor
            logger.info(f"  Deleting {len(appointments)} appointments")
            for appointment in appointments:
                try:
                    db.session.delete(appointment)
                except Exception as e:
                    logger.error(f"  Error deleting appointment {appointment.id}: {e}")
                    raise
            
            # Flush after deleting visits and appointments for this doctor to ensure they're committed
            try:
                db.session.flush()
                logger.info(f"  Flushed session after deleting visits/appointments for doctor {doctor_id}")
            except Exception as e:
                logger.error(f"  Error flushing session after doctor {doctor_id} deletions: {e}")
                raise
            
            # Delete doctor schedules
            try:
                schedule_count = DoctorSchedule.query.filter_by(doctor_id=doctor_id).delete(synchronize_session=False)
                logger.info(f"  Deleted {schedule_count} doctor schedules")
            except Exception as e:
                logger.error(f"  Error deleting doctor schedules: {e}")
                raise
            
            # Delete doctor's user account if exists (only if no other doctors use it and no other appointments reference it)
            if doctor.user_id:
                # Check if this user is only used by this doctor
                other_doctors_with_user = Doctor.query.filter(
                    Doctor.user_id == doctor.user_id,
                    Doctor.id != doctor_id
                ).count()
                
                # Check if any remaining appointments were created by this user
                # (we've already deleted all appointments for this doctor, so any remaining would be for other doctors)
                # Use a safer query that doesn't fail if user_id is None
                remaining_appointments_by_user = 0
                if doctor.user_id:
                    try:
                        remaining_appointments_by_user = Appointment.query.filter_by(created_by=doctor.user_id).count()
                    except Exception as e:
                        logger.warning(f"Error checking appointments for user {doctor.user_id}: {e}")
                        # If we can't check, assume there are appointments and don't delete the user
                        remaining_appointments_by_user = 1
                
                if other_doctors_with_user == 0 and remaining_appointments_by_user == 0:
                    user = User.query.get(doctor.user_id)
                    if user:
                        # Delete audit log entries for this user BEFORE deleting the user
                        # (audit_log.user_id has NOT NULL constraint, so we must delete these entries first)
                        try:
                            audit_count = AuditLog.query.filter_by(user_id=doctor.user_id).delete(synchronize_session=False)
                            logger.info(f"  Deleted {audit_count} audit log entries for user {doctor.user_id}")
                        except Exception as e:
                            logger.error(f"  Error deleting audit logs for user {doctor.user_id}: {e}")
                            raise
                        
                        # Now delete the user
                        try:
                            db.session.delete(user)
                            logger.info(f"  Deleted user account {doctor.user_id}")
                        except Exception as e:
                            logger.error(f"  Error deleting user {doctor.user_id}: {e}")
                            raise
        
        # Handle any remaining visits/appointments for this clinic BEFORE deleting services
        # (visits and appointments have service_id foreign keys that are NOT NULL)
        # This should be rare, but we handle it for data integrity
        # Use a fresh query after all doctor-related deletions by flushing first
        try:
            db.session.flush()  # Flush pending deletions before querying for remaining records
            logger.info("Flushed session before checking remaining visits/appointments")
        except Exception as e:
            logger.error(f"Error flushing session before remaining records check: {e}")
            raise
        
        remaining_visits = Visit.query.filter_by(clinic_id=clinic_id).all()
        logger.info(f"Found {len(remaining_visits)} remaining visits for clinic {clinic_id}")
        if remaining_visits:
            remaining_visit_ids = [visit.id for visit in remaining_visits]
            
            try:
                # Nullify appointment_id before deleting appointments
                updated_count = Visit.query.filter(Visit.id.in_(remaining_visit_ids)).update({'appointment_id': None}, synchronize_session=False)
                logger.info(f"  Nullified appointment_id in {updated_count} remaining visits")
            except Exception as e:
                logger.error(f"  Error nullifying appointment_id in remaining visits: {e}")
                raise
            
            try:
                # Delete prescriptions for remaining visits
                presc_count = Prescription.query.filter(Prescription.visit_id.in_(remaining_visit_ids)).delete(synchronize_session=False)
                logger.info(f"  Deleted {presc_count} prescriptions for remaining visits")
            except Exception as e:
                logger.error(f"  Error deleting prescriptions for remaining visits: {e}")
                raise
            
            try:
                # Delete payments for remaining visits
                payment_count = Payment.query.filter(Payment.visit_id.in_(remaining_visit_ids)).delete(synchronize_session=False)
                logger.info(f"  Deleted {payment_count} payments for remaining visits")
            except Exception as e:
                logger.error(f"  Error deleting payments for remaining visits: {e}")
                raise
            
            # Delete remaining visits
            logger.info(f"  Deleting {len(remaining_visits)} remaining visits")
            for visit in remaining_visits:
                try:
                    db.session.delete(visit)
                except Exception as e:
                    logger.error(f"  Error deleting remaining visit {visit.id}: {e}")
                    raise
        
        # Delete any remaining appointments for this clinic (must be after visits are deleted, but BEFORE services)
        # Flush to ensure visits are deleted before querying for remaining appointments
        try:
            db.session.flush()  # Flush to ensure visits are deleted before querying
            logger.info("Flushed session before checking remaining appointments")
        except Exception as e:
            logger.error(f"Error flushing session before remaining appointments check: {e}")
            raise
        
        remaining_appointments = Appointment.query.filter_by(clinic_id=clinic_id).all()
        logger.info(f"Found {len(remaining_appointments)} remaining appointments for clinic {clinic_id}")
        remaining_appointment_ids = [appt.id for appt in remaining_appointments]
        
        # Delete notifications for remaining appointments (notifications reference appointments)
        if remaining_appointment_ids:
            try:
                notif_count = Notification.query.filter(Notification.related_appointment_id.in_(remaining_appointment_ids)).delete(synchronize_session=False)
                logger.info(f"  Deleted {notif_count} notifications for remaining appointments")
            except Exception as e:
                logger.error(f"  Error deleting notifications for remaining appointments: {e}")
                raise
        
        # Delete remaining appointments
        logger.info(f"  Deleting {len(remaining_appointments)} remaining appointments")
        for appointment in remaining_appointments:
            try:
                db.session.delete(appointment)
            except Exception as e:
                logger.error(f"  Error deleting remaining appointment {appointment.id}: {e}")
                raise
        
        # Flush session to ensure all visits and appointments are deleted before deleting services
        try:
            db.session.flush()
            logger.info("Session flushed successfully after deleting all visits and appointments")
        except Exception as e:
            logger.error(f"Error flushing session: {e}")
            raise
        
        # Delete all doctors in this clinic (after all their data is deleted and flushed)
        logger.info(f"Deleting {len(doctors)} doctors")
        for doctor in doctors:
            try:
                db.session.delete(doctor)
                logger.info(f"Marked doctor {doctor.id} for deletion")
            except Exception as e:
                logger.error(f"Error deleting doctor {doctor.id}: {e}")
                raise
        
        # Flush after deleting doctors to ensure they're committed before deleting services
        try:
            db.session.flush()
            logger.info("Session flushed after deleting doctors")
        except Exception as e:
            logger.error(f"Error flushing session after deleting doctors: {e}")
            raise
        
        # Delete all services for this clinic (must be AFTER all visits and appointments are deleted)
        # because visits and appointments have service_id foreign keys that are NOT NULL
        # First, verify that no appointments or visits still reference these services
        services = Service.query.filter_by(clinic_id=clinic_id).all()
        service_ids = [s.id for s in services]
        logger.info(f"Found {len(services)} services to delete: {service_ids}")
        
        if service_ids:
            # Check for any remaining appointments that reference these services
            remaining_appts_with_services = Appointment.query.filter(
                Appointment.service_id.in_(service_ids)
            ).count()
            if remaining_appts_with_services > 0:
                error_msg = f"Found {remaining_appts_with_services} appointments still referencing services. Cannot delete services."
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            # Check for any remaining visits that reference these services
            remaining_visits_with_services = Visit.query.filter(
                Visit.service_id.in_(service_ids)
            ).count()
            if remaining_visits_with_services > 0:
                error_msg = f"Found {remaining_visits_with_services} visits still referencing services. Cannot delete services."
                logger.error(error_msg)
                raise ValueError(error_msg)
        
        logger.info(f"Deleting {len(services)} services")
        for service in services:
            try:
                db.session.delete(service)
                logger.info(f"Marked service {service.id} for deletion")
            except Exception as e:
                logger.error(f"Error deleting service {service.id}: {e}")
                raise
        
        # Flush after deleting services to ensure they're committed
        try:
            db.session.flush()
            logger.info("Session flushed after deleting services")
        except Exception as e:
            logger.error(f"Error flushing session after deleting services: {e}")
            raise
        
        # Clear clinic_id from patients (set to NULL)
        try:
            patient_count = Patient.query.filter_by(clinic_id=clinic_id).count()
            if patient_count > 0:
                updated_count = Patient.query.filter_by(clinic_id=clinic_id).update({'clinic_id': None}, synchronize_session=False)
                logger.info(f"Cleared clinic_id from {updated_count} patients")
        except Exception as e:
            logger.error(f"Error clearing clinic_id from patients: {e}")
            raise
        
        # Finally delete the clinic
        try:
            logger.info(f"Deleting clinic {clinic_id}")
            db.session.delete(clinic)
            db.session.commit()
            logger.info(f"Successfully deleted clinic {clinic_id}")
        except Exception as e:
            logger.error(f"Error committing clinic deletion: {e}")
            raise
        
        return jsonify({'message': 'Clinic and all related data deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        from flask import current_app
        import traceback
        import logging
        
        # Log the full error for debugging
        logger = logging.getLogger(__name__)
        logger.error(f"Error deleting clinic {clinic_id}: {str(e)}")
        logger.error(traceback.format_exc())
        
        error_response = {'message': f'Error deleting clinic: {str(e)}'}
        # Only include traceback in debug mode for security
        if current_app.config.get('DEBUG'):
            error_response['detail'] = traceback.format_exc()
            error_response['clinic_id'] = clinic_id
        return jsonify(error_response), 500

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

@clinics_bp.route('/<int:clinic_id>/activate', methods=['POST'])
@admin_required
@log_audit('activate_clinic', 'clinic')
def activate_clinic(clinic_id, current_user):
    """Activate (soft un-delete) a clinic"""
    clinic = Clinic.query.get_or_404(clinic_id)
    clinic.is_active = True
    db.session.commit()
    
    return jsonify({
        'message': 'Clinic activated successfully',
        'clinic': clinic.to_dict()
    }), 200

@clinics_bp.route('/<int:clinic_id>/deactivate', methods=['POST'])
@admin_required
@log_audit('deactivate_clinic', 'clinic')
def deactivate_clinic(clinic_id, current_user):
    """Deactivate (soft delete) a clinic"""
    clinic = Clinic.query.get_or_404(clinic_id)
    clinic.is_active = False
    db.session.commit()
    
    return jsonify({
        'message': 'Clinic deactivated successfully',
        'clinic': clinic.to_dict()
    }), 200

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
