import requests
import json

# Login as receptionist
login_data = {'username': 'sara_reception', 'password': 'sara123'}
login_resp = requests.post('http://localhost:5000/api/auth/login', json=login_data)
token = login_resp.json()['access_token']
print(f"Login successful, token: {token[:20]}...")

# Get clinics
clinics_resp = requests.get('http://localhost:5000/api/clinics', 
                           headers={'Authorization': f'Bearer {token}'})
clinics = clinics_resp.json()
print(f"Found {len(clinics.get('clinics', []))} clinics")

# Get doctors
doctors_resp = requests.get('http://localhost:5000/api/doctors', 
                           headers={'Authorization': f'Bearer {token}'})
doctors = doctors_resp.json()
print(f"Found {len(doctors.get('doctors', []))} doctors")

# Get patients
patients_resp = requests.get('http://localhost:5000/api/patients', 
                           headers={'Authorization': f'Bearer {token}'})
patients = patients_resp.json()
print(f"Found {len(patients.get('patients', []))} patients")

# Get services
services_resp = requests.get('http://localhost:5000/api/services', 
                           headers={'Authorization': f'Bearer {token}'})
services = services_resp.json()
print(f"Found {len(services.get('services', []))} services")

# Create a new appointment for tomorrow (10/28/2025)
if clinics.get('clinics') and doctors.get('doctors') and patients.get('patients') and services.get('services'):
    clinic_id = clinics['clinics'][0]['id']
    doctor_id = doctors['doctors'][0]['id']
    patient_id = patients['patients'][0]['id']
    service_id = services['services'][0]['id']
    
    appointment_data = {
        'patient_id': patient_id,
        'doctor_id': doctor_id,
        'service_id': service_id,
        'clinic_id': clinic_id,
        'start_time': '2025-10-28T10:00:00',
        'end_time': '2025-10-28T10:30:00',
        'notes': 'Test appointment for 500 error testing'
    }
    
    print(f"Creating appointment with data: {appointment_data}")
    
    create_resp = requests.post('http://localhost:5000/api/appointments', 
                               json=appointment_data,
                               headers={'Authorization': f'Bearer {token}'})
    
    print(f"Create appointment response status: {create_resp.status_code}")
    print(f"Create appointment response: {create_resp.text}")
    
    if create_resp.status_code == 201:
        appointment = create_resp.json()
        appointment_id = appointment['appointment']['id']
        print(f"Created appointment with ID: {appointment_id}")
        
        # Now check in the appointment
        checkin_data = {'appointment_id': appointment_id}
        checkin_resp = requests.post('http://localhost:5000/api/queue/checkin', 
                                   json=checkin_data,
                                   headers={'Authorization': f'Bearer {token}'})
        
        print(f"Check-in response status: {checkin_resp.status_code}")
        print(f"Check-in response: {checkin_resp.text}")
        
        if checkin_resp.status_code == 201:
            visit = checkin_resp.json()['visit']
            visit_id = visit['id']
            print(f"Checked in with visit ID: {visit_id}")
            
            # Start consultation
            start_data = {'visit_id': visit_id}
            start_resp = requests.post('http://localhost:5000/api/queue/start', 
                                     json=start_data,
                                     headers={'Authorization': f'Bearer {token}'})
            
            print(f"Start consultation response status: {start_resp.status_code}")
            print(f"Start consultation response: {start_resp.text}")
            
            if start_resp.status_code == 200:
                print("Appointment is now in progress and ready for testing!")
            else:
                print("Failed to start consultation")
        else:
            print("Failed to check in appointment")
    else:
        print("Failed to create appointment")
else:
    print("Missing required data to create appointment")
