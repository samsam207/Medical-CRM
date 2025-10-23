#!/usr/bin/env python3
import requests
import json

# Test backend health
try:
    response = requests.get('http://localhost:5000/api/health', timeout=5)
    print(f"Health check: {response.status_code}")
    if response.status_code == 200:
        print(f"Response: {response.text}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Health check failed: {e}")

# Test login endpoint
try:
    login_data = {
        "username": "sara_reception",
        "password": "sara123"
    }
    response = requests.post('http://localhost:5000/api/auth/login', 
                           json=login_data, 
                           timeout=10)
    print(f"Login test: {response.status_code}")
    if response.status_code == 200:
        print(f"Login successful: {response.json()}")
    else:
        print(f"Login failed: {response.text}")
except Exception as e:
    print(f"Login test failed: {e}")
