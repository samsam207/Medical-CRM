from app import db
from app.models.visit import Visit, VisitStatus
from app.models.appointment import Appointment
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.clinic import Clinic
from app.models.service import Service
from app.utils.helpers import get_next_queue_number
from datetime import datetime

class QueueService:
    """Service for handling queue management logic"""
    
    def get_clinic_queue(self, clinic_id):
        """Get live queue for a clinic"""
        # Get all visits for the clinic today
        today = datetime.now().date()
        visits = db.session.query(Visit).filter(
            Visit.clinic_id == clinic_id,
            db.func.date(Visit.created_at) == today
        ).order_by(Visit.queue_number).all()
        
        # Group by status
        queue_data = {
            'clinic_id': clinic_id,
            'waiting': [],
            'called': [],
            'in_progress': [],
            'completed': [],
            'total': len(visits)
        }
        
        for visit in visits:
            visit_info = {
                'id': visit.id,
                'queue_number': visit.queue_number,
                'patient_name': visit.patient.name,
                'patient_phone': visit.patient.phone,
                'doctor_name': visit.doctor.name,
                'service_name': visit.service.name,
                'visit_type': visit.visit_type.value,
                'check_in_time': visit.check_in_time.isoformat() if visit.check_in_time else None,
                'start_time': visit.start_time.isoformat() if visit.start_time else None,
                'end_time': visit.end_time.isoformat() if visit.end_time else None,
                'status': visit.status.value
            }
            
            if visit.status == VisitStatus.WAITING:
                queue_data['waiting'].append(visit_info)
            elif visit.status == VisitStatus.CALLED:
                queue_data['called'].append(visit_info)
            elif visit.status == VisitStatus.IN_PROGRESS:
                queue_data['in_progress'].append(visit_info)
            elif visit.status == VisitStatus.COMPLETED:
                queue_data['completed'].append(visit_info)
        
        return queue_data
    
    def get_doctor_queue(self, doctor_id):
        """Get live queue for a doctor"""
        # Get all visits for the doctor today
        today = datetime.now().date()
        visits = db.session.query(Visit).filter(
            Visit.doctor_id == doctor_id,
            db.func.date(Visit.created_at) == today
        ).order_by(Visit.queue_number).all()
        
        # Group by status
        queue_data = {
            'doctor_id': doctor_id,
            'waiting': [],
            'called': [],
            'in_progress': [],
            'completed': [],
            'total': len(visits)
        }
        
        for visit in visits:
            visit_info = {
                'id': visit.id,
                'queue_number': visit.queue_number,
                'patient_name': visit.patient.name,
                'patient_phone': visit.patient.phone,
                'service_name': visit.service.name,
                'visit_type': visit.visit_type.value,
                'check_in_time': visit.check_in_time.isoformat() if visit.check_in_time else None,
                'start_time': visit.start_time.isoformat() if visit.start_time else None,
                'end_time': visit.end_time.isoformat() if visit.end_time else None,
                'status': visit.status.value
            }
            
            if visit.status == VisitStatus.WAITING:
                queue_data['waiting'].append(visit_info)
            elif visit.status == VisitStatus.CALLED:
                queue_data['called'].append(visit_info)
            elif visit.status == VisitStatus.IN_PROGRESS:
                queue_data['in_progress'].append(visit_info)
            elif visit.status == VisitStatus.COMPLETED:
                queue_data['completed'].append(visit_info)
        
        return queue_data
    
    def check_in_patient(self, appointment_id):
        """Check in patient for appointment"""
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            raise ValueError("Appointment not found")
        
        # Check if already checked in
        if appointment.visit:
            raise ValueError("Patient already checked in")
        
        # Get next queue number
        queue_number = get_next_queue_number(appointment.clinic_id)
        
        # Create visit
        from app.models.visit import VisitType
        from app.models.appointment import AppointmentStatus
        
        visit = Visit(
            appointment_id=appointment_id,
            doctor_id=appointment.doctor_id,
            patient_id=appointment.patient_id,
            service_id=appointment.service_id,
            clinic_id=appointment.clinic_id,
            check_in_time=datetime.utcnow(),
            visit_type=VisitType.SCHEDULED,
            queue_number=queue_number
        )
        
        db.session.add(visit)
        
        # Update appointment status
        appointment.status = AppointmentStatus.CHECKED_IN
        
        db.session.commit()
        
        return visit
    
    def create_walkin_visit(self, patient_id, clinic_id, service_id, doctor_id):
        """Create walk-in visit"""
        # Get next queue number
        queue_number = get_next_queue_number(clinic_id)
        
        # Create visit
        from app.models.visit import VisitType
        
        visit = Visit(
            appointment_id=None,
            doctor_id=doctor_id,
            patient_id=patient_id,
            service_id=service_id,
            clinic_id=clinic_id,
            check_in_time=datetime.utcnow(),
            visit_type=VisitType.WALK_IN,
            queue_number=queue_number
        )
        
        db.session.add(visit)
        db.session.commit()
        
        return visit
    
    def call_patient(self, visit_id):
        """Call next patient in queue"""
        visit = Visit.query.get(visit_id)
        if not visit:
            raise ValueError("Visit not found")
        
        if visit.status != VisitStatus.WAITING:
            raise ValueError("Only waiting patients can be called")
        
        visit.status = VisitStatus.CALLED
        db.session.commit()
        
        return visit
    
    def start_consultation(self, visit_id):
        """Start consultation for patient"""
        visit = Visit.query.get(visit_id)
        if not visit:
            raise ValueError("Visit not found")
        
        if visit.status not in [VisitStatus.CALLED, VisitStatus.WAITING]:
            raise ValueError("Patient must be called or waiting to start consultation")
        
        visit.status = VisitStatus.IN_PROGRESS
        visit.start_time = datetime.utcnow()
        db.session.commit()
        
        return visit
    
    def complete_consultation(self, visit_id):
        """Complete consultation and mark as pending payment"""
        visit = Visit.query.get(visit_id)
        if not visit:
            raise ValueError("Visit not found")
        
        if visit.status != VisitStatus.IN_PROGRESS:
            raise ValueError("Consultation must be in progress to complete")
        
        visit.status = VisitStatus.PENDING_PAYMENT
        visit.end_time = datetime.utcnow()
        db.session.commit()
        
        return visit
    
    def get_next_patient(self, doctor_id):
        """Get next patient in queue for doctor"""
        visit = db.session.query(Visit).filter(
            Visit.doctor_id == doctor_id,
            Visit.status == VisitStatus.WAITING,
            db.func.date(Visit.created_at) == datetime.now().date()
        ).order_by(Visit.queue_number).first()
        
        return visit
    
    def get_queue_position(self, visit_id):
        """Get position of visit in queue"""
        visit = Visit.query.get(visit_id)
        if not visit:
            return None
        
        # Count waiting visits before this one
        position = db.session.query(Visit).filter(
            Visit.clinic_id == visit.clinic_id,
            Visit.status == VisitStatus.WAITING,
            Visit.queue_number < visit.queue_number,
            db.func.date(Visit.created_at) == datetime.now().date()
        ).count() + 1
        
        return position
    
    def get_next_queue_number(self, clinic_id):
        """Get next available queue number for clinic"""
        today = datetime.now().date()
        
        # Get the highest queue number for today
        max_queue = db.session.query(db.func.max(Visit.queue_number)).filter(
            Visit.clinic_id == clinic_id,
            db.func.date(Visit.created_at) == today
        ).scalar()
        
        return (max_queue or 0) + 1