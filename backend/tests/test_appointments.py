import pytest
import json
from datetime import datetime, timedelta
from app import create_app, db
from app.models.user import User, UserRole
from app.models.clinic import Clinic
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.service import Service
from app.models.appointment import Appointment, AppointmentStatus, BookingSource

@pytest.fixture
def app():
    """Create test app"""
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()

@pytest.fixture
def test_data(app):
    """Create test data"""
    with app.app_context():
        # Create user
        user = User(
            username='receptionist',
            password_hash='hashed_password',
            role=UserRole.RECEPTIONIST
        )
        db.session.add(user)
        
        # Create clinic
        clinic = Clinic(name='Test Clinic', room_number='101')
        db.session.add(clinic)
        
        # Create doctor
        doctor = Doctor(
            name='Dr. Test',
            specialty='General Medicine',
            working_days=['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            working_hours={'start': '09:00', 'end': '17:00'},
            clinic_id=1
        )
        db.session.add(doctor)
        
        # Create patient
        patient = Patient(
            name='Test Patient',
            phone='+1234567890',
            address='123 Test St',
            age=30
        )
        db.session.add(patient)
        
        # Create service
        service = Service(
            clinic_id=1,
            name='Consultation',
            duration=30,
            price=100.00
        )
        db.session.add(service)
        
        db.session.commit()
        
        return {
            'user': user,
            'clinic': clinic,
            'doctor': doctor,
            'patient': patient,
            'service': service
        }

def test_create_appointment_success(client, test_data):
    """Test successful appointment creation"""
    # Login to get token
    login_response = client.post('/api/auth/login', 
        json={'username': 'receptionist', 'password': 'password123'})
    token = json.loads(login_response.data)['access_token']
    
    # Create appointment
    appointment_data = {
        'clinic_id': 1,
        'doctor_id': 1,
        'patient_id': 1,
        'service_id': 1,
        'start_time': (datetime.now() + timedelta(days=1)).isoformat(),
        'booking_source': 'phone'
    }
    
    headers = {'Authorization': f'Bearer {token}'}
    response = client.post('/api/appointments', 
        json=appointment_data, headers=headers)
    
    assert response.status_code == 201
    data = json.loads(response.data)
    assert 'appointment' in data
    assert data['appointment']['clinic_id'] == 1

def test_create_appointment_missing_fields(client, test_data):
    """Test appointment creation with missing fields"""
    # Login to get token
    login_response = client.post('/api/auth/login', 
        json={'username': 'receptionist', 'password': 'password123'})
    token = json.loads(login_response.data)['access_token']
    
    # Create appointment with missing fields
    appointment_data = {
        'clinic_id': 1,
        'doctor_id': 1
        # Missing required fields
    }
    
    headers = {'Authorization': f'Bearer {token}'}
    response = client.post('/api/appointments', 
        json=appointment_data, headers=headers)
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'Missing required fields' in data['message']

def test_get_appointments(client, test_data):
    """Test getting appointments list"""
    # Login to get token
    login_response = client.post('/api/auth/login', 
        json={'username': 'receptionist', 'password': 'password123'})
    token = json.loads(login_response.data)['access_token']
    
    headers = {'Authorization': f'Bearer {token}'}
    response = client.get('/api/appointments', headers=headers)
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'appointments' in data
    assert 'total' in data

def test_get_available_slots(client, test_data):
    """Test getting available time slots"""
    # Login to get token
    login_response = client.post('/api/auth/login', 
        json={'username': 'receptionist', 'password': 'password123'})
    token = json.loads(login_response.data)['access_token']
    
    # Get available slots
    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
    headers = {'Authorization': f'Bearer {token}'}
    response = client.get(f'/api/appointments/available-slots?doctor_id=1&clinic_id=1&date={tomorrow}', 
        headers=headers)
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'available_slots' in data
    assert 'doctor' in data

def test_cancel_appointment(client, test_data):
    """Test canceling an appointment"""
    # Login to get token
    login_response = client.post('/api/auth/login', 
        json={'username': 'receptionist', 'password': 'password123'})
    token = json.loads(login_response.data)['access_token']
    
    # Create appointment first
    appointment_data = {
        'clinic_id': 1,
        'doctor_id': 1,
        'patient_id': 1,
        'service_id': 1,
        'start_time': (datetime.now() + timedelta(days=1)).isoformat(),
        'booking_source': 'phone'
    }
    
    headers = {'Authorization': f'Bearer {token}'}
    create_response = client.post('/api/appointments', 
        json=appointment_data, headers=headers)
    appointment_id = json.loads(create_response.data)['appointment']['id']
    
    # Cancel appointment
    response = client.delete(f'/api/appointments/{appointment_id}', headers=headers)
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'cancelled successfully' in data['message']
