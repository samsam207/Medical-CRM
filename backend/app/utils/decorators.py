from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User, UserRole
from app.models.audit_log import AuditLog
from app import db

def role_required(roles):
    """Decorator to require specific roles for access"""
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            current_user_id = int(get_jwt_identity())
            user = User.query.get(current_user_id)
            
            if not user:
                return jsonify({'message': 'User not found'}), 401
            
            if user.role.value not in roles:
                return jsonify({'message': 'Insufficient permissions'}), 403
            
            # Add user to kwargs for use in the function
            kwargs['current_user'] = user
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def admin_required(f):
    """Decorator to require admin role"""
    return role_required(['ADMIN'])(f)

def receptionist_required(f):
    """Decorator to require receptionist or admin role"""
    return role_required(['RECEPTIONIST', 'ADMIN'])(f)

def doctor_required(f):
    """Decorator to require doctor or admin role"""
    return role_required(['DOCTOR', 'ADMIN'])(f)

def log_audit(action, entity_type):
    """Decorator to log user actions for audit trail"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get current user from kwargs (added by role_required)
            current_user = kwargs.get('current_user')
            
            # Execute the function
            result = f(*args, **kwargs)
            
            # Log the action if user is authenticated
            if current_user and hasattr(result, 'get_json'):
                try:
                    response_data = result.get_json()
                    entity_id = response_data.get('id') if isinstance(response_data, dict) else None
                    
                    if entity_id:
                        audit_log = AuditLog(
                            user_id=current_user.id,
                            action=action,
                            entity_type=entity_type,
                            entity_id=entity_id,
                            ip_address=request.remote_addr
                        )
                        db.session.add(audit_log)
                        db.session.commit()
                except Exception as e:
                    # Don't fail the request if audit logging fails
                    print(f"Audit logging failed: {e}")
            
            return result
        return decorated_function
    return decorator

def validate_json(required_fields):
    """Decorator to validate JSON request data"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({'message': 'Request must be JSON'}), 400
            
            data = request.get_json()
            if not data:
                return jsonify({'message': 'No JSON data provided'}), 400
            
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                return jsonify({
                    'message': 'Missing required fields',
                    'missing_fields': missing_fields
                }), 400
            
            # Add validated data to kwargs
            kwargs['data'] = data
            return f(*args, **kwargs)
        return decorated_function
    return decorator
