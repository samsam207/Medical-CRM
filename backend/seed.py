#!/usr/bin/env python3
"""
Database Seeding Script for Medical CRM
Run this script to populate the database with initial data
"""

import os
import sys
from datetime import datetime, timedelta

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.user import User, UserRole
from app.models.clinic import Clinic
from app.models.doctor import Doctor
from app.models.patient import Patient, Gender
from app.models.service import Service
from app.models.appointment import Appointment, AppointmentStatus, BookingSource
from app.models.visit import Visit, VisitStatus, VisitType
from app.models.prescription import Prescription
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.notification import Notification, NotificationType, NotificationStatus

def seed_database():
    """Seed the database with initial data"""
    app = create_app()
    
    with app.app_context():
        # Create tables
        db.create_all()
        
        print("Creating initial data...")
        
        # Create users
        print("Creating users...")
        users_data = [
            {'username': 'admin', 'password': 'admin123', 'role': UserRole.ADMIN},
            {'username': 'sara_reception', 'password': 'sara123', 'role': UserRole.RECEPTIONIST},
            {'username': 'dr_mohamed', 'password': 'doctor123', 'role': UserRole.DOCTOR},
            {'username': 'dr_laila', 'password': 'doctor123', 'role': UserRole.DOCTOR},
            {'username': 'dr_ahmed', 'password': 'doctor123', 'role': UserRole.DOCTOR}
        ]
        
        users = {}
        for user_data in users_data:
            existing_user = User.query.filter_by(username=user_data['username']).first()
            if not existing_user:
                user = User(
                    username=user_data['username'],
                    password=user_data['password'],
                    role=user_data['role']
                )
                db.session.add(user)
                users[user_data['username']] = user
            else:
                users[user_data['username']] = existing_user
        
        db.session.commit()
        
        # Create clinics
        print("Creating clinics...")
        clinics = [
            Clinic(name='Dermatology', room_number='R101', is_active=True),
            Clinic(name='Internal Medicine', room_number='R102', is_active=True),
            Clinic(name='Dentistry', room_number='R103', is_active=True)
        ]
        
        for clinic in clinics:
            db.session.add(clinic)
        db.session.commit()
        
        # Create doctors
        print("Creating doctors...")
        doctors = [
            Doctor(
                name='Dr. Mohamed',
                specialty='Internal Medicine',
                working_days=['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                working_hours={'start': '09:00', 'end': '17:00'},
                clinic_id=2,  # Internal Medicine
                share_percentage=0.7,
                user_id=users['dr_mohamed'].id
            ),
            Doctor(
                name='Dr. Laila',
                specialty='Dermatology',
                working_days=['Monday', 'Wednesday', 'Friday'],
                working_hours={'start': '10:00', 'end': '16:00'},
                clinic_id=1,  # Dermatology
                share_percentage=0.7,
                user_id=users['dr_laila'].id
            ),
            Doctor(
                name='Dr. Ahmed',
                specialty='Dentistry',
                working_days=['Tuesday', 'Thursday', 'Saturday'],
                working_hours={'start': '09:00', 'end': '18:00'},
                clinic_id=3,  # Dentistry
                share_percentage=0.7,
                user_id=users['dr_ahmed'].id
            )
        ]
        
        for doctor in doctors:
            db.session.add(doctor)
        
        # Add doctor record for admin user
        admin_doctor = Doctor(
            name='Dr. Admin',
            specialty='General Medicine',
            working_days=['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            working_hours={'start': '09:00', 'end': '17:00'},
            clinic_id=2,  # Internal Medicine
            share_percentage=0.7,
            user_id=users['admin'].id
        )
        db.session.add(admin_doctor)
        db.session.commit()
        
        # Create patients
        print("Creating patients...")
        patients = [
            Patient(
                name='Yasmine Ahmed',
                phone='+1234567890',
                address='123 Main St, Cairo',
                age=28,
                gender=Gender.FEMALE,
                medical_history='No known allergies'
            ),
            Patient(
                name='Nour Hassan',
                phone='+1234567891',
                address='456 Oak Ave, Cairo',
                age=35,
                gender=Gender.FEMALE,
                medical_history='Diabetes type 2'
            ),
            Patient(
                name='Fatma Mohamed',
                phone='+1234567892',
                address='789 Pine St, Cairo',
                age=42,
                gender=Gender.FEMALE,
                medical_history='Hypertension'
            ),
            Patient(
                name='Ahmed Ali',
                phone='+1234567893',
                address='321 Elm St, Cairo',
                age=31,
                gender=Gender.MALE,
                medical_history='No known conditions'
            ),
            Patient(
                name='Khaled Omar',
                phone='+1234567894',
                address='654 Maple Ave, Cairo',
                age=55,
                gender=Gender.MALE,
                medical_history='Heart condition'
            )
        ]
        
        for patient in patients:
            db.session.add(patient)
        db.session.commit()
        
        # Create services
        print("Creating services...")
        services = [
            # Dermatology services
            Service(clinic_id=1, name='Skin Consultation', duration=30, price=100.00, is_active=True),
            Service(clinic_id=1, name='Acne Treatment', duration=45, price=150.00, is_active=True),
            Service(clinic_id=1, name='Mole Removal', duration=60, price=200.00, is_active=True),
            
            # Internal Medicine services
            Service(clinic_id=2, name='General Checkup', duration=30, price=80.00, is_active=True),
            Service(clinic_id=2, name='Blood Pressure Check', duration=15, price=40.00, is_active=True),
            Service(clinic_id=2, name='Diabetes Management', duration=45, price=120.00, is_active=True),
            
            # Dentistry services
            Service(clinic_id=3, name='Dental Cleaning', duration=60, price=80.00, is_active=True),
            Service(clinic_id=3, name='Tooth Extraction', duration=30, price=100.00, is_active=True),
            Service(clinic_id=3, name='Dental Filling', duration=45, price=120.00, is_active=True)
        ]
        
        for service in services:
            db.session.add(service)
        db.session.commit()
        
        # Create sample appointments
        print("Creating sample appointments...")
        today = datetime.now().date()
        tomorrow = today + timedelta(days=1)
        
        appointments = [
            Appointment(
                booking_id='A-2025-0101-0001',
                clinic_id=1,
                doctor_id=2,  # Dr. Laila
                patient_id=1,  # Yasmine
                service_id=1,  # Skin Consultation
                start_time=datetime.combine(today, datetime.min.time().replace(hour=10)),
                end_time=datetime.combine(today, datetime.min.time().replace(hour=10, minute=30)),
                status=AppointmentStatus.CONFIRMED,
                booking_source=BookingSource.PHONE,
                created_by=users['sara_reception'].id,
                notes='Regular checkup'
            ),
            Appointment(
                booking_id='A-2025-0101-0002',
                clinic_id=2,
                doctor_id=1,  # Dr. Mohamed
                patient_id=2,  # Nour
                service_id=4,  # General Checkup
                start_time=datetime.combine(today, datetime.min.time().replace(hour=11)),
                end_time=datetime.combine(today, datetime.min.time().replace(hour=11, minute=30)),
                status=AppointmentStatus.CONFIRMED,
                booking_source=BookingSource.PHONE,
                created_by=users['sara_reception'].id,
                notes='Diabetes follow-up'
            ),
            Appointment(
                booking_id='A-2025-0101-0003',
                clinic_id=3,
                doctor_id=3,  # Dr. Ahmed
                patient_id=3,  # Fatma
                service_id=7,  # Dental Cleaning
                start_time=datetime.combine(tomorrow, datetime.min.time().replace(hour=14)),
                end_time=datetime.combine(tomorrow, datetime.min.time().replace(hour=15)),
                status=AppointmentStatus.CONFIRMED,
                booking_source=BookingSource.PHONE,
                created_by=users['sara_reception'].id,
                notes='Regular cleaning'
            )
        ]
        
        for appointment in appointments:
            db.session.add(appointment)
        
        # Add more confirmed appointments for today (without visits) for testing check-in
        additional_appointments = [
            Appointment(
                booking_id='A-2025-0101-0004',
                clinic_id=1,  # Dermatology
                doctor_id=2,  # Dr. Laila
                patient_id=1,  # Yasmine
                service_id=2,  # Acne Treatment
                start_time=datetime.combine(today, datetime.min.time().replace(hour=14)),
                end_time=datetime.combine(today, datetime.min.time().replace(hour=14, minute=45)),
                status=AppointmentStatus.CONFIRMED,
                booking_source=BookingSource.PHONE,
                created_by=users['sara_reception'].id,
                notes='Acne treatment appointment'
            ),
            Appointment(
                booking_id='A-2025-0101-0005',
                clinic_id=2,  # Internal Medicine
                doctor_id=1,  # Dr. Mohamed
                patient_id=2,  # Nour
                service_id=5,  # Blood Pressure Check
                start_time=datetime.combine(today, datetime.min.time().replace(hour=15)),
                end_time=datetime.combine(today, datetime.min.time().replace(hour=15, minute=15)),
                status=AppointmentStatus.CONFIRMED,
                booking_source=BookingSource.PHONE,
                created_by=users['sara_reception'].id,
                notes='Blood pressure monitoring'
            ),
            Appointment(
                booking_id='A-2025-0101-0006',
                clinic_id=3,  # Dentistry
                doctor_id=3,  # Dr. Ahmed
                patient_id=3,  # Fatma
                service_id=8,  # Tooth Extraction
                start_time=datetime.combine(today, datetime.min.time().replace(hour=16)),
                end_time=datetime.combine(today, datetime.min.time().replace(hour=16, minute=30)),
                status=AppointmentStatus.CONFIRMED,
                booking_source=BookingSource.PHONE,
                created_by=users['sara_reception'].id,
                notes='Tooth extraction appointment'
            )
        ]
        
        for appointment in additional_appointments:
            db.session.add(appointment)
        db.session.commit()
        
        # Create sample visits
        print("Creating sample visits...")
        visits = [
            Visit(
                appointment_id=1,
                doctor_id=2,
                patient_id=1,
                service_id=1,
                clinic_id=1,
                check_in_time=datetime.now() - timedelta(hours=2),
                start_time=datetime.now() - timedelta(hours=1, minutes=30),
                end_time=datetime.now() - timedelta(hours=1),
                status=VisitStatus.COMPLETED,
                visit_type=VisitType.SCHEDULED,
                queue_number=1
            ),
            Visit(
                appointment_id=2,
                doctor_id=1,
                patient_id=2,
                service_id=4,
                clinic_id=2,
                check_in_time=datetime.now() - timedelta(hours=1),
                start_time=datetime.now() - timedelta(minutes=30),
                end_time=datetime.now() - timedelta(minutes=15),
                status=VisitStatus.PENDING_PAYMENT,
                visit_type=VisitType.SCHEDULED,
                queue_number=1
            )
        ]
        
        for visit in visits:
            db.session.add(visit)
        db.session.commit()
        
        # Create sample prescriptions
        print("Creating sample prescriptions...")
        prescriptions = [
            Prescription(
                visit_id=1,
                doctor_id=2,  # Dr. Laila
                diagnosis='Mild acne, no serious concerns',
                medications='Topical cream - apply twice daily',
                notes='Follow up in 2 weeks if condition persists'
            ),
            Prescription(
                visit_id=2,
                doctor_id=1,  # Dr. Mohamed
                diagnosis='Diabetes well controlled',
                medications='Continue current medication, monitor blood sugar',
                notes='Schedule next appointment in 3 months'
            )
        ]
        
        for prescription in prescriptions:
            db.session.add(prescription)
        db.session.commit()
        
        # Create sample payments
        print("Creating sample payments...")
        payments = [
            Payment(
                visit_id=1,
                patient_id=1,
                total_amount=100.00,
                amount_paid=100.00,
                payment_method=PaymentMethod.CASH,
                status=PaymentStatus.PAID,
                doctor_share=70.00,
                center_share=30.00
            )
        ]
        
        for payment in payments:
            db.session.add(payment)
            # Mark as paid to set paid_at timestamp
            payment.mark_as_paid()
        db.session.commit()
        
        # Create sample notifications
        print("Creating sample notifications...")
        notifications = [
            Notification(
                recipient='+1234567890',
                notification_type=NotificationType.SMS_CONFIRMATION,
                message='Your appointment with Dr. Laila has been confirmed for today at 10:00 AM',
                scheduled_time=datetime.now() - timedelta(hours=1),
                related_appointment_id=1
            ),
            Notification(
                recipient='+1234567891',
                notification_type=NotificationType.SMS_REMINDER,
                message='Reminder: You have an appointment with Dr. Mohamed tomorrow at 11:00 AM',
                scheduled_time=datetime.now() + timedelta(hours=1),
                related_appointment_id=2
            )
        ]
        
        for notification in notifications:
            db.session.add(notification)
        db.session.commit()
        
        print("Database seeded successfully!")
        print("\nInitial users created:")
        print("Admin: admin / admin123")
        print("Receptionist: sara_reception / sara123")
        print("\nSample data created:")
        print("- 3 Clinics (Dermatology, Internal Medicine, Dentistry)")
        print("- 3 Doctors (Dr. Mohamed, Dr. Laila, Dr. Ahmed)")
        print("- 5 Patients (Yasmine, Nour, Fatma, Ahmed, Khaled)")
        print("- 9 Services (3 per clinic)")
        print("- 3 Sample appointments")
        print("- 2 Sample visits")
        print("- 2 Sample prescriptions")
        print("- 1 Sample payment")
        print("- 2 Sample notifications")

if __name__ == '__main__':
    seed_database()
