import pytest
import json
from app import create_app, db
from app.models.user import User, UserRole

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
def test_user(app):
    """Create test user"""
    with app.app_context():
        user = User(
            username='testuser',
            password_hash='hashed_password',
            role=UserRole.RECEPTIONIST
        )
        db.session.add(user)
        db.session.commit()
        return user

def test_login_success(client, test_user):
    """Test successful login"""
    response = client.post('/api/auth/login', 
        json={'username': 'testuser', 'password': 'password123'})
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'access_token' in data
    assert 'user' in data

def test_login_invalid_credentials(client):
    """Test login with invalid credentials"""
    response = client.post('/api/auth/login', 
        json={'username': 'invalid', 'password': 'wrong'})
    
    assert response.status_code == 401
    data = json.loads(response.data)
    assert 'Invalid credentials' in data['message']

def test_login_missing_fields(client):
    """Test login with missing fields"""
    response = client.post('/api/auth/login', 
        json={'username': 'testuser'})
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'Missing required fields' in data['message']

def test_logout(client, test_user):
    """Test logout functionality"""
    # First login to get token
    login_response = client.post('/api/auth/login', 
        json={'username': 'testuser', 'password': 'password123'})
    token = json.loads(login_response.data)['access_token']
    
    # Then logout
    headers = {'Authorization': f'Bearer {token}'}
    response = client.post('/api/auth/logout', headers=headers)
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'Logged out successfully' in data['message']

def test_protected_route_without_token(client):
    """Test accessing protected route without token"""
    response = client.get('/api/dashboard/stats')
    assert response.status_code == 401

def test_protected_route_with_token(client, test_user):
    """Test accessing protected route with valid token"""
    # Login to get token
    login_response = client.post('/api/auth/login', 
        json={'username': 'testuser', 'password': 'password123'})
    token = json.loads(login_response.data)['access_token']
    
    # Access protected route
    headers = {'Authorization': f'Bearer {token}'}
    response = client.get('/api/dashboard/stats', headers=headers)
    
    assert response.status_code == 200
