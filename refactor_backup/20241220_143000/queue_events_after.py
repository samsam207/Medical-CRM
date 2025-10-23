from flask_socketio import emit, join_room, leave_room
from app import socketio, db
from app.services.queue_service import QueueService
from app.models.user import User
from flask_jwt_extended import decode_token
from flask import request
import jwt

def verify_jwt_token(token):
    """Verify JWT token and return user"""
    try:
        # Get the secret key from app config
        from flask import current_app
        secret = current_app.config['JWT_SECRET_KEY']
        
        # Verify and decode the token
        decoded = jwt.decode(token, secret, algorithms=['HS256'])
        user_id = decoded['sub']
        
        # Get user from database
        user = User.query.get(user_id)
        return user
    except jwt.ExpiredSignatureError:
        print("JWT token has expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"Invalid JWT token: {e}")
        return None
    except Exception as e:
        print(f"JWT verification failed: {e}")
        return None

@socketio.on('connect')
def handle_connect(auth=None):
    """Handle client connection"""
    # Get token from auth or query params
    token = None
    if auth and 'token' in auth:
        token = auth['token']
    elif request.args.get('token'):
        token = request.args.get('token')
    
    if not token:
        print("No token provided for connection")
        return False
    
    user = verify_jwt_token(token)
    if not user:
        print("Invalid token for connection")
        return False
    
    print(f"User {user.username} connected")
    emit('connected', {'message': 'Connected to queue updates'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print('Client disconnected')

@socketio.on('join_queue_room')
def handle_join_queue_room(data):
    """Join a clinic queue room for real-time updates"""
    # Get token from data or query params
    token = None
    if data and 'token' in data:
        token = data['token']
    elif request.args.get('token'):
        token = request.args.get('token')
    
    if not token:
        emit('error', {'message': 'Authentication required'})
        return False
    
    user = verify_jwt_token(token)
    if not user:
        emit('error', {'message': 'Invalid authentication'})
        return False
    
    clinic_id = data.get('clinic_id')
    if not clinic_id:
        emit('error', {'message': 'clinic_id is required'})
        return
    
    # Join the room
    room = f'clinic_{clinic_id}'
    join_room(room)
    
    # Send current queue state
    queue_service = QueueService()
    queue_data = queue_service.get_clinic_queue(clinic_id)
    emit('queue_updated', queue_data)
    
    print(f"User {user.username} joined room {room}")

@socketio.on('leave_queue_room')
def handle_leave_queue_room(data):
    """Leave a clinic queue room"""
    # Get token from data or query params
    token = None
    if data and 'token' in data:
        token = data['token']
    elif request.args.get('token'):
        token = request.args.get('token')
    
    if not token:
        emit('error', {'message': 'Authentication required'})
        return False
    
    user = verify_jwt_token(token)
    if not user:
        emit('error', {'message': 'Invalid authentication'})
        return False
    
    clinic_id = data.get('clinic_id')
    if not clinic_id:
        emit('error', {'message': 'clinic_id is required'})
        return
    
    # Leave the room
    room = f'clinic_{clinic_id}'
    leave_room(room)
    
    print(f"User {user.username} left room {room}")

@socketio.on('join_doctor_room')
def handle_join_doctor_room(data):
    """Join a doctor queue room for real-time updates"""
    # Get token from data or query params
    token = None
    if data and 'token' in data:
        token = data['token']
    elif request.args.get('token'):
        token = request.args.get('token')
    
    if not token:
        emit('error', {'message': 'Authentication required'})
        return False
    
    user = verify_jwt_token(token)
    if not user:
        emit('error', {'message': 'Invalid authentication'})
        return False
    
    doctor_id = data.get('doctor_id')
    if not doctor_id:
        emit('error', {'message': 'doctor_id is required'})
        return
    
    # Join the room
    room = f'doctor_{doctor_id}'
    join_room(room)
    
    # Send current queue state
    queue_service = QueueService()
    queue_data = queue_service.get_doctor_queue(doctor_id)
    emit('queue_updated', queue_data)
    
    print(f"User {user.username} joined doctor room {room}")

@socketio.on('leave_doctor_room')
def handle_leave_doctor_room(data):
    """Leave a doctor queue room"""
    # Get token from data or query params
    token = None
    if data and 'token' in data:
        token = data['token']
    elif request.args.get('token'):
        token = request.args.get('token')
    
    if not token:
        emit('error', {'message': 'Authentication required'})
        return False
    
    user = verify_jwt_token(token)
    if not user:
        emit('error', {'message': 'Invalid authentication'})
        return False
    
    doctor_id = data.get('doctor_id')
    if not doctor_id:
        emit('error', {'message': 'doctor_id is required'})
        return
    
    # Leave the room
    room = f'doctor_{doctor_id}'
    leave_room(room)
    
    print(f"User {user.username} left doctor room {room}")

def broadcast_queue_update(clinic_id):
    """Broadcast queue update to all clients in clinic room"""
    queue_service = QueueService()
    queue_data = queue_service.get_clinic_queue(clinic_id)
    socketio.emit('queue_updated', queue_data, room=f'clinic_{clinic_id}')

def broadcast_doctor_queue_update(doctor_id):
    """Broadcast queue update to all clients in doctor room"""
    queue_service = QueueService()
    queue_data = queue_service.get_doctor_queue(doctor_id)
    socketio.emit('queue_updated', queue_data, room=f'doctor_{doctor_id}')

# Removed unused broadcast functions - functionality moved to individual route handlers
