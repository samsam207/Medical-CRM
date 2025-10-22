#!/usr/bin/env python3
"""
Simple Post-Fix Verification Audit
Medical CRM System - React + Flask
"""

import requests
import time
import json

def run_audit():
    print("=== COMPREHENSIVE POST-FIX VERIFICATION AUDIT ===")
    print("Medical CRM System - React + Flask")
    print("=" * 60)

    # Wait for backend
    print("Waiting for backend...")
    time.sleep(5)

    # Test 1: Backend Health
    print("\n1. BACKEND HEALTH CHECK")
    try:
        health_response = requests.get('http://localhost:5000/api/health', timeout=10)
        if health_response.status_code == 200:
            print("+ Backend health: PASS")
            health_data = health_response.json()
            print(f"  Status: {health_data.get('status', 'unknown')}")
        else:
            print("- Backend health: FAIL")
    except Exception as e:
        print(f"- Backend health: ERROR - {e}")

    # Test 2: Authentication
    print("\n2. AUTHENTICATION TEST")
    try:
        login_response = requests.post('http://localhost:5000/api/auth/login', 
                                     json={'username': 'admin', 'password': 'admin123'})
        if login_response.status_code == 200:
            print("+ Authentication: PASS")
            token = login_response.json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
        else:
            print("- Authentication: FAIL")
            headers = None
    except Exception as e:
        print(f"- Authentication: ERROR - {e}")
        headers = None

    # Test 3: API Endpoints
    print("\n3. API ENDPOINTS TEST")
    if headers:
        endpoints = [
            ('/dashboard/stats', 'Dashboard'),
            ('/clinics', 'Clinics'),
            ('/doctors', 'Doctors'),
            ('/patients', 'Patients'),
            ('/appointments', 'Appointments'),
            ('/visits', 'Visits'),
            ('/payments', 'Payments')
        ]
        
        passed = 0
        total = len(endpoints)
        
        for endpoint, name in endpoints:
            try:
                response = requests.get(f'http://localhost:5000/api{endpoint}', headers=headers)
                if response.status_code == 200:
                    print(f"+ {name}: PASS")
                    passed += 1
                else:
                    print(f"- {name}: FAIL ({response.status_code})")
            except Exception as e:
                print(f"- {name}: ERROR - {e}")
        
        print(f"  API Success Rate: {passed}/{total} ({passed/total*100:.1f}%)")
    else:
        print("- API Endpoints: SKIPPED (No auth)")

    # Test 4: Frontend
    print("\n4. FRONTEND TEST")
    try:
        frontend_response = requests.get('http://localhost:3000')
        if frontend_response.status_code == 200:
            print("+ Frontend: PASS")
            print(f"  Content length: {len(frontend_response.text)} chars")
        else:
            print("- Frontend: FAIL")
    except Exception as e:
        print(f"- Frontend: ERROR - {e}")

    # Test 5: Security
    print("\n5. SECURITY TEST")
    try:
        # Test unauthorized access
        unauth_response = requests.get('http://localhost:5000/api/dashboard/stats')
        if unauth_response.status_code == 401:
            print("+ Unauthorized access protection: PASS")
        else:
            print("- Unauthorized access protection: FAIL")
    except Exception as e:
        print(f"- Security test: ERROR - {e}")

    # Test 6: Performance
    print("\n6. PERFORMANCE TEST")
    if headers:
        performance_endpoints = ['/health', '/dashboard/stats', '/clinics', '/patients']
        response_times = []
        
        for endpoint in performance_endpoints:
            try:
                start_time = time.time()
                response = requests.get(f'http://localhost:5000/api{endpoint}', headers=headers)
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                response_times.append(response_time)
                print(f"  {endpoint}: {response_time:.2f}ms")
            except Exception as e:
                print(f"  {endpoint}: ERROR - {e}")
        
        if response_times:
            avg_time = sum(response_times) / len(response_times)
            print(f"  Average response time: {avg_time:.2f}ms")
            if avg_time < 1000:
                print("+ Performance: PASS")
            else:
                print("- Performance: FAIL (Too slow)")

    print("\n=== AUDIT COMPLETE ===")

if __name__ == "__main__":
    run_audit()
