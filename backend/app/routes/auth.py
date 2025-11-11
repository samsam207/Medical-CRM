from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, 
    create_refresh_token, 
    jwt_required, 
    get_jwt_identity,
    get_jwt
)
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from app import db, limiter
from app.models.user import User, TokenBlocklist, UserRole
from app.models.doctor import Doctor
from app.models.audit_log import AuditLog
from app.utils.decorators import validate_json, receptionist_required, admin_required
from app.utils.validators import validate_phone_number
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("5 per minute")
@validate_json(['username', 'password'])
def login(data):
    """User login endpoint"""
    username = data['username']
    password = data['password']
    
    # Find user by username
    user = User.query.filter_by(username=username).first()
    
    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid username or password'}), 401
    
    # Create tokens (convert user.id to string to avoid JWT validation issues)
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
    
    # Log login action
    audit_log = AuditLog(
        user_id=user.id,
        action='login',
        entity_type='user',
        entity_id=user.id,
        ip_address=request.remote_addr
    )
    db.session.add(audit_log)
    db.session.commit()
    
    # Get doctor info if user is a doctor
    user_dict = user.to_dict()
    if user.role == UserRole.DOCTOR:
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        if doctor:
            user_dict['doctor_id'] = doctor.id
            user_dict['clinic_id'] = doctor.clinic_id
    
    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user_dict
    }), 200

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    current_user_id = get_jwt_identity()
    user = User.query.get(int(current_user_id))
    
    if not user:
        return jsonify({'message': 'User not found'}), 401
    
    new_access_token = create_access_token(identity=current_user_id)
    
    return jsonify({
        'access_token': new_access_token
    }), 200

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """User logout endpoint"""
    jti = get_jwt()['jti']
    
    # Add token to blacklist
    blacklisted_token = TokenBlocklist(jti=jti)
    db.session.add(blacklisted_token)
    
    # Log logout action
    current_user_id = int(get_jwt_identity())
    audit_log = AuditLog(
        user_id=current_user_id,
        action='logout',
        entity_type='user',
        entity_id=current_user_id,
        ip_address=request.remote_addr
    )
    db.session.add(audit_log)
    db.session.commit()
    
    return jsonify({'message': 'Logout successful'}), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user information"""
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 401
    
    user_dict = user.to_dict()
    
    # Add doctor info if user is a doctor
    if user.role == UserRole.DOCTOR:
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        if doctor:
            user_dict['doctor_id'] = doctor.id
            user_dict['clinic_id'] = doctor.clinic_id
    
    return jsonify({
        'user': user_dict
    }), 200

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
@validate_json(['current_password', 'new_password'])
def change_password(data):
    """Change user password"""
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 401
    
    current_password = data['current_password']
    new_password = data['new_password']
    
    # Verify current password
    if not user.check_password(current_password):
        return jsonify({'message': 'Current password is incorrect'}), 400
    
    # Update password
    user.set_password(new_password)
    db.session.commit()
    
    # Log password change
    audit_log = AuditLog(
        user_id=user.id,
        action='change_password',
        entity_type='user',
        entity_id=user.id,
        ip_address=request.remote_addr
    )
    db.session.add(audit_log)
    db.session.commit()
    
    return jsonify({'message': 'Password changed successfully'}), 200

@auth_bp.route('/users', methods=['GET'])
@receptionist_required
def get_users(current_user):
    """Get users with optional role filter (receptionist/admin only)"""
    role_filter = request.args.get('role')
    
    query = User.query
    
    if role_filter:
        try:
            role = UserRole(role_filter.upper())
            query = query.filter_by(role=role)
        except ValueError:
            return jsonify({'message': 'Invalid role'}), 400
    
    users = query.order_by(User.username).all()
    
    # Include linked doctor information for doctor users
    users_data = []
    for user in users:
        user_dict = user.to_dict(include_doctor=True)
        users_data.append(user_dict)
    
    return jsonify({
        'users': users_data
    }), 200

@auth_bp.route('/users/available-doctors', methods=['GET'])
@receptionist_required
def get_available_doctor_users(current_user):
    """Get doctor users that don't have a doctor record yet (for linking to doctors)"""
    # Get all doctor users
    doctor_users = User.query.filter_by(role=UserRole.DOCTOR).all()
    
    # Get all existing doctor records with user_id set
    existing_doctor_user_ids = db.session.query(Doctor.user_id).filter(
        Doctor.user_id.isnot(None)
    ).distinct().all()
    existing_user_ids = [row[0] for row in existing_doctor_user_ids]
    
    # Filter to only users that don't have a doctor record
    available_users = [
        user.to_dict() for user in doctor_users 
        if user.id not in existing_user_ids
    ]
    
    return jsonify({
        'users': available_users
    }), 200

@auth_bp.route('/users', methods=['POST'])
@jwt_required()
@validate_json(['username', 'password', 'role'])
def create_user(data):
    """Create new user (admin only)"""
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get(current_user_id)
    
    if not current_user or current_user.role != UserRole.ADMIN:
        return jsonify({'message': 'Admin access required'}), 403
    
    username = data['username']
    password = data['password']
    role_str = data['role']
    
    # Validate role
    try:
        role = UserRole(role_str)
    except ValueError:
        return jsonify({'message': 'Invalid role'}), 400
    
    # Check if username already exists
    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username already exists'}), 400
    
    # Create user
    user = User(username=username, password=password, role=role)
    db.session.add(user)
    db.session.commit()
    
    # Log user creation
    audit_log = AuditLog(
        user_id=current_user.id,
        action='create_user',
        entity_type='user',
        entity_id=user.id,
        ip_address=request.remote_addr
    )
    db.session.add(audit_log)
    db.session.commit()
    
    return jsonify({
        'message': 'User created successfully',
        'user': user.to_dict()
    }), 201

@auth_bp.route('/users/<int:user_id>', methods=['PUT'])
@admin_required
@validate_json([])
def update_user(user_id, data, current_user):
    """Update user (admin only)"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    # Update username if provided
    if 'username' in data:
        new_username = data['username'].strip()
        if not new_username:
            return jsonify({'message': 'Username cannot be empty'}), 400
        if new_username != user.username:
            # Check if username already exists
            existing_user = User.query.filter_by(username=new_username).first()
            if existing_user and existing_user.id != user.id:
                return jsonify({'message': 'Username already exists'}), 400
            user.username = new_username
    
    # Update password if provided
    if 'password' in data and data['password']:
        user.set_password(data['password'])
    
    # Update role if provided
    if 'role' in data:
        try:
            new_role = UserRole(data['role'].upper())
            # If changing from DOCTOR to another role, check if linked to doctor
            if user.role == UserRole.DOCTOR and new_role != UserRole.DOCTOR:
                linked_doctor = Doctor.query.filter_by(user_id=user_id).first()
                if linked_doctor:
                    return jsonify({
                        'message': f'Cannot change role: User is linked to doctor "{linked_doctor.name}". Please unlink the doctor first.'
                    }), 400
            user.role = new_role
        except ValueError:
            return jsonify({'message': 'Invalid role'}), 400
    
    db.session.commit()
    
    # Log user update
    try:
        audit_log = AuditLog(
            user_id=current_user.id,
            action='update_user',
            entity_type='user',
            entity_id=user.id,
            ip_address=request.remote_addr
        )
        db.session.add(audit_log)
        db.session.commit()
    except Exception as e:
        # Don't fail the request if audit logging fails
        db.session.rollback()
        print(f"Audit logging failed: {e}")
    
    return jsonify({
        'message': 'User updated successfully',
        'user': user.to_dict(include_doctor=True)
    }), 200

@auth_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id, current_user):
    """Delete user (admin only)"""
    from app.models.appointment import Appointment
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    # Set up logging
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Starting deletion of user {user_id}")
    
    try:
        # Check if user is linked to a doctor
        warning = None
        linked_doctor = Doctor.query.filter_by(user_id=user_id).first()
        if linked_doctor:
            warning = f'User is linked to doctor: {linked_doctor.name} (ID: {linked_doctor.id}). The doctor record will be unlinked.'
            # Unlink doctor before deleting user
            linked_doctor.user_id = None
            # Flush to ensure doctor unlinking is committed before proceeding
            db.session.flush()
        
        # Check if user has created any appointments (created_by has NOT NULL constraint)
        appointments_count = Appointment.query.filter_by(created_by=user_id).count()
        if appointments_count > 0:
            # Rollback any changes (like doctor unlinking) before returning
            db.session.rollback()
            return jsonify({
                'message': f'Cannot delete user: User has created {appointments_count} appointment(s). Please delete or reassign these appointments first.'
            }), 400
        
        # Delete audit logs for this user BEFORE deleting the user
        # (audit_log.user_id has NOT NULL constraint, so we must delete these entries first)
        try:
            audit_count = AuditLog.query.filter_by(user_id=user_id).delete(synchronize_session=False)
            logger.info(f"Deleted {audit_count} audit log entries for user {user_id}")
        except Exception as e:
            logger.error(f"Error deleting audit logs for user {user_id}: {e}")
            raise
        
        # Flush to ensure audit logs are deleted before deleting user
        try:
            db.session.flush()
            logger.info("Flushed session after deleting audit logs")
        except Exception as e:
            logger.error(f"Error flushing session after deleting audit logs: {e}")
            raise
        
        # Delete user
        try:
            db.session.delete(user)
            db.session.commit()
            logger.info(f"Successfully deleted user {user_id}")
        except Exception as e:
            logger.error(f"Error committing user deletion: {e}")
            raise
        
        # Log user deletion (in a separate try-catch so it doesn't affect user deletion)
        try:
            audit_log = AuditLog(
                user_id=current_user.id,
                action='delete_user',
                entity_type='user',
                entity_id=user_id,
                ip_address=request.remote_addr
            )
            db.session.add(audit_log)
            db.session.commit()
        except Exception as e:
            # Don't fail the request if audit logging fails
            # Note: User deletion was already committed, so this rollback only affects the audit log
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Audit logging failed for user deletion: {e}")
            # Rollback only the audit log addition, user deletion is already committed
            try:
                db.session.rollback()
            except Exception:
                pass  # Ignore rollback errors
        
        response = {
            'message': 'User deleted successfully',
        }
        if warning:
            response['warning'] = warning
        
        return jsonify(response), 200
        
    except Exception as e:
        db.session.rollback()
        from flask import current_app
        import traceback
        import logging
        
        logger = logging.getLogger(__name__)
        logger.error(f"Error deleting user {user_id}: {str(e)}")
        logger.error(traceback.format_exc())
        
        error_response = {'message': f'Error deleting user: {str(e)}'}
        # Only include traceback in debug mode for security
        if current_app.config.get('DEBUG'):
            error_response['detail'] = traceback.format_exc()
        return jsonify(error_response), 500

@auth_bp.route('/users/<int:user_id>/link-doctor', methods=['POST'])
@admin_required
@validate_json(['doctor_id'])
def link_user_to_doctor(user_id, data, current_user):
    """Link a doctor user to a doctor record (admin only)"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    # Validate user is a doctor
    if user.role != UserRole.DOCTOR:
        return jsonify({'message': 'User must have DOCTOR role'}), 400
    
    doctor_id = data['doctor_id']
    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({'message': 'Doctor not found'}), 404
    
    # Check if doctor is already linked to another user
    if doctor.user_id and doctor.user_id != user_id:
        existing_user = User.query.get(doctor.user_id)
        return jsonify({
            'message': f'Doctor is already linked to user: {existing_user.username if existing_user else "Unknown"}'
        }), 400
    
    # Check if user is already linked to another doctor
    existing_doctor = Doctor.query.filter_by(user_id=user_id).first()
    if existing_doctor and existing_doctor.id != doctor_id:
        return jsonify({
            'message': f'User is already linked to doctor: {existing_doctor.name}'
        }), 400
    
    # Link doctor to user
    doctor.user_id = user_id
    db.session.commit()
    
    # Log linking action
    try:
        audit_log = AuditLog(
            user_id=current_user.id,
            action='link_user_to_doctor',
            entity_type='user',
            entity_id=user_id,
            ip_address=request.remote_addr
        )
        db.session.add(audit_log)
        db.session.commit()
    except Exception as e:
        # Don't fail the request if audit logging fails
        db.session.rollback()
        print(f"Audit logging failed: {e}")
    
    return jsonify({
        'message': 'User linked to doctor successfully',
        'user': user.to_dict(include_doctor=True),
        'doctor': doctor.to_dict()
    }), 200

@auth_bp.route('/users/<int:user_id>/unlink-doctor', methods=['POST'])
@admin_required
def unlink_user_from_doctor(user_id, current_user):
    """Unlink a doctor user from doctor record (admin only)"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    # Find linked doctor
    doctor = Doctor.query.filter_by(user_id=user_id).first()
    if not doctor:
        return jsonify({'message': 'User is not linked to any doctor'}), 400
    
    # Unlink doctor from user
    doctor_id = doctor.id
    doctor.user_id = None
    db.session.commit()
    
    # Log unlinking action
    try:
        audit_log = AuditLog(
            user_id=current_user.id,
            action='unlink_user_from_doctor',
            entity_type='user',
            entity_id=user_id,
            ip_address=request.remote_addr
        )
        db.session.add(audit_log)
        db.session.commit()
    except Exception as e:
        # Don't fail the request if audit logging fails
        db.session.rollback()
        print(f"Audit logging failed: {e}")
    
    return jsonify({
        'message': 'User unlinked from doctor successfully',
        'user': user.to_dict(include_doctor=True),
        'doctor': doctor.to_dict()
    }), 200
