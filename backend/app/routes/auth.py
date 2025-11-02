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
from app.utils.decorators import validate_json, receptionist_required
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
    
    return jsonify({
        'users': [user.to_dict() for user in users]
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
