#!/usr/bin/env python3
"""
API Verification Test Script
Tests all major API endpoints to verify system functionality
"""

import requests
import json
import time

def test_api_endpoints():
    base_url = 'http://localhost:5000/api'
    
    print("=== MEDICAL CRM API VERIFICATION TEST ===\n")
    
    # 1. Test login
    print("1. AUTHENTICATION TEST")
    print("-" * 30)
    login_response = requests.post(f'{base_url}/auth/login', json={'username': 'admin', 'password': 'admin123'})
    print(f"Login Status: {login_response.status_code}")
    
    if login_response.status_code == 200:
        token = login_response.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}
        print("+ Authentication working")
        print(f"Token received: {token[:50]}...")
    else:
        print("- Authentication failed")
        print(f"Error: {login_response.text}")
        return False
    
    print()
    
    # 2. Test dashboard stats
    print("2. DASHBOARD TEST")
    print("-" * 30)
    dashboard_response = requests.get(f'{base_url}/dashboard/stats', headers=headers)
    print(f"Dashboard Status: {dashboard_response.status_code}")
    
    if dashboard_response.status_code == 200:
        print("+ Dashboard API working")
        dashboard_data = dashboard_response.json()
        print(f"Appointments: {dashboard_data.get('appointments', {})}")
        print(f"Visits: {dashboard_data.get('visits', {})}")
        print(f"Payments: {dashboard_data.get('payments', {})}")
    else:
        print("- Dashboard API failed")
        print(f"Error: {dashboard_response.text}")
    
    print()
    
    # 3. Test clinics
    print("3. CLINICS TEST")
    print("-" * 30)
    clinics_response = requests.get(f'{base_url}/clinics', headers=headers)
    print(f"Clinics Status: {clinics_response.status_code}")
    
    if clinics_response.status_code == 200:
        print("+ Clinics API working")
        clinics_data = clinics_response.json()
        clinics_list = clinics_data.get('clinics', [])
        print(f"Found {len(clinics_list)} clinics")
        for clinic in clinics_list[:3]:  # Show first 3
            print(f"  - {clinic.get('name', 'Unknown')} (Room: {clinic.get('room_number', 'N/A')})")
    else:
        print("- Clinics API failed")
        print(f"Error: {clinics_response.text}")
    
    print()
    
    # 4. Test patients
    print("4. PATIENTS TEST")
    print("-" * 30)
    patients_response = requests.get(f'{base_url}/patients', headers=headers)
    print(f"Patients Status: {patients_response.status_code}")
    
    if patients_response.status_code == 200:
        print("+ Patients API working")
        patients_data = patients_response.json()
        patients_list = patients_data.get('patients', [])
        print(f"Found {len(patients_list)} patients")
        for patient in patients_list[:3]:  # Show first 3
            print(f"  - {patient.get('name', 'Unknown')} ({patient.get('phone', 'N/A')})")
    else:
        print("- Patients API failed")
        print(f"Error: {patients_response.text}")
    
    print()
    
    # 5. Test appointments
    print("5. APPOINTMENTS TEST")
    print("-" * 30)
    appointments_response = requests.get(f'{base_url}/appointments', headers=headers)
    print(f"Appointments Status: {appointments_response.status_code}")
    
    if appointments_response.status_code == 200:
        print("+ Appointments API working")
        appointments_data = appointments_response.json()
        appointments_list = appointments_data.get('appointments', [])
        print(f"Found {len(appointments_list)} appointments")
        for appointment in appointments_list[:3]:  # Show first 3
            print(f"  - {appointment.get('booking_id', 'N/A')} - {appointment.get('status', 'Unknown')}")
    else:
        print("- Appointments API failed")
        print(f"Error: {appointments_response.text}")
    
    print()
    
    # 6. Test visits
    print("6. VISITS TEST")
    print("-" * 30)
    visits_response = requests.get(f'{base_url}/visits', headers=headers)
    print(f"Visits Status: {visits_response.status_code}")
    
    if visits_response.status_code == 200:
        print("+ Visits API working")
        visits_data = visits_response.json()
        visits_list = visits_data.get('visits', [])
        print(f"Found {len(visits_list)} visits")
        for visit in visits_list[:3]:  # Show first 3
            print(f"  - Visit {visit.get('id', 'N/A')} - {visit.get('status', 'Unknown')}")
    else:
        print("- Visits API failed")
        print(f"Error: {visits_response.text}")
    
    print()
    
    # 7. Test payments
    print("7. PAYMENTS TEST")
    print("-" * 30)
    payments_response = requests.get(f'{base_url}/payments', headers=headers)
    print(f"Payments Status: {payments_response.status_code}")
    
    if payments_response.status_code == 200:
        print("+ Payments API working")
        payments_data = payments_response.json()
        payments_list = payments_data.get('payments', [])
        print(f"Found {len(payments_list)} payments")
        for payment in payments_list[:3]:  # Show first 3
            print(f"  - Payment {payment.get('id', 'N/A')} - ${payment.get('amount_paid', 0)}")
    else:
        print("- Payments API failed")
        print(f"Error: {payments_response.text}")
    
    print()
    
    # 8. Test doctors
    print("8. DOCTORS TEST")
    print("-" * 30)
    doctors_response = requests.get(f'{base_url}/doctors', headers=headers)
    print(f"Doctors Status: {doctors_response.status_code}")
    
    if doctors_response.status_code == 200:
        print("+ Doctors API working")
        doctors_data = doctors_response.json()
        doctors_list = doctors_data.get('doctors', [])
        print(f"Found {len(doctors_list)} doctors")
        for doctor in doctors_list[:3]:  # Show first 3
            print(f"  - Dr. {doctor.get('name', 'Unknown')} ({doctor.get('specialty', 'N/A')})")
    else:
        print("- Doctors API failed")
        print(f"Error: {doctors_response.text}")
    
    print()
    
    # 9. Test available slots
    print("9. AVAILABLE SLOTS TEST")
    print("-" * 30)
    # Get first doctor ID for testing
    if 'doctors_list' in locals() and doctors_list:
        doctor_id = doctors_list[0].get('id')
        slots_response = requests.get(f'{base_url}/appointments/available-slots', 
                                    headers=headers, 
                                    params={'doctor_id': doctor_id, 'date': '2025-10-21'})
        print(f"Available Slots Status: {slots_response.status_code}")
        
        if slots_response.status_code == 200:
            print("+ Available Slots API working")
            slots_data = slots_response.json()
            slots_list = slots_data.get('available_slots', [])
            print(f"Found {len(slots_list)} available slots")
        else:
            print("- Available Slots API failed")
            print(f"Error: {slots_response.text}")
    else:
        print("! Skipping available slots test - no doctors found")
    
    print()
    print("=== API VERIFICATION COMPLETE ===")
    return True

if __name__ == "__main__":
    test_api_endpoints()
