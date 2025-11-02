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
    
    def get_clinic_queue(self, clinic_id, start_date=None, end_date=None):
        """Get live queue for a clinic with optional date range filtering"""
        from datetime import timedelta
        
        # Default to today if no dates provided
        if not start_date:
            start_date = datetime.now().date()
        if not end_date:
            end_date = start_date
        
        visits = db.session.query(Visit).filter(
            Visit.clinic_id == clinic_id,
            db.func.date(Visit.created_at) >= start_date,
            db.func.date(Visit.created_at) <= end_date
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
            if not visit.patient or not visit.doctor or not visit.service:
                continue
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
    
    def get_doctor_queue(self, doctor_id, start_date=None, end_date=None):
        """Get live queue for a doctor with optional date range filtering"""
        from datetime import timedelta
        
        # Default to today if no dates provided
        if not start_date:
            start_date = datetime.now().date()
        if not end_date:
            end_date = start_date
        
        visits = db.session.query(Visit).filter(
            Visit.doctor_id == doctor_id,
            db.func.date(Visit.created_at) >= start_date,
            db.func.date(Visit.created_at) <= end_date
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
            if not visit.patient or not visit.service:
                continue
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
        visit.called_time = datetime.utcnow()
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
    
    def complete_consultation(self, visit_id, notes=''):
        """Complete consultation and mark as completed"""
        from flask import current_app
        
        # Log the attempt
        current_app.logger.info(f"Starting completion for visit_id={visit_id}")
        
        # Use filter_by instead of get to avoid primary key issues
        visit = Visit.query.filter_by(id=visit_id).first()
        if not visit:
            current_app.logger.error(f"Visit not found: {visit_id}")
            raise ValueError(f"Visit not found: {visit_id}")
        
        current_app.logger.info(f"Visit found: id={visit.id}, status={visit.status}, appointment_id={visit.appointment_id}")
        
        # Check if visit is in correct status
        if visit.status != VisitStatus.IN_PROGRESS:
            current_app.logger.error(f"Invalid status for completion: current={visit.status}, expected=IN_PROGRESS")
            raise ValueError(f"Consultation must be in progress to complete. Current status: {visit.status}")
        
        # Update visit
        visit.status = VisitStatus.COMPLETED
        visit.end_time = datetime.utcnow()
        
        # Update appointment status if visit has an appointment
        if visit.appointment_id:
            from app.models.appointment import AppointmentStatus
            appointment = Appointment.query.get(visit.appointment_id)
            if appointment:
                appointment.status = AppointmentStatus.COMPLETED
                current_app.logger.info(f"Updated appointment {appointment.id} to COMPLETED")
        
        # Commit changes
        try:
            db.session.commit()
            current_app.logger.info(f"Successfully completed visit {visit.id}")
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Database error completing visit {visit.id}: {str(e)}")
            import traceback
            current_app.logger.error(traceback.format_exc())
            raise ValueError(f"Database error: {str(e)}")
        
        return visit
    
    def get_next_patient(self, doctor_id):
        """Get next patient in queue for doctor"""
        from datetime import timedelta
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        
        visit = db.session.query(Visit).filter(
            Visit.doctor_id == doctor_id,
            Visit.status == VisitStatus.WAITING,
            db.func.date(Visit.created_at) >= week_ago
        ).order_by(Visit.queue_number).first()
        
        return visit
    
    def get_queue_position(self, visit_id):
        """Get position of visit in queue"""
        visit = Visit.query.get(visit_id)
        if not visit:
            return None
        
        # Count waiting visits before this one
        from datetime import timedelta
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        
        position = db.session.query(Visit).filter(
            Visit.clinic_id == visit.clinic_id,
            Visit.status == VisitStatus.WAITING,
            Visit.queue_number < visit.queue_number,
            db.func.date(Visit.created_at) >= week_ago
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
    
    def get_upcoming_appointments(self, date, clinic_id=None):
        """Get confirmed appointments for a specific date that haven't been checked in"""
        from app.models.appointment import AppointmentStatus
        
        query = db.session.query(Appointment).filter(
            db.func.date(Appointment.start_time) == date,
            Appointment.status == AppointmentStatus.CONFIRMED,
            ~db.session.query(Visit).filter(Visit.appointment_id == Appointment.id).exists()
        )
        
        if clinic_id:
            query = query.filter(Appointment.clinic_id == clinic_id)
        
        appointments = query.order_by(Appointment.start_time).all()
        
        # Convert to dict format
        appointments_data = []
        for apt in appointments:
            appointments_data.append({
                'id': apt.id,
                'booking_id': apt.booking_id,
                'patient_name': apt.patient.name,
                'patient_phone': apt.patient.phone,
                'doctor_name': apt.doctor.name,
                'clinic_name': apt.clinic.name,
                'service_name': apt.service.name,
                'start_time': apt.start_time.isoformat(),
                'end_time': apt.end_time.isoformat(),
                'notes': apt.notes
            })
        
        return appointments_data

    def get_all_appointments_for_date(self, date, clinic_id=None, doctor_id=None):
        """Get all appointments for a specific date organized by queue phase"""
        from app.models.appointment import AppointmentStatus
        
        # Get all appointments for the date (include all active statuses)
        query = db.session.query(Appointment).filter(
            db.func.date(Appointment.start_time) == date,
            Appointment.status.in_([
                AppointmentStatus.CONFIRMED, 
                AppointmentStatus.CHECKED_IN,
                AppointmentStatus.COMPLETED
            ])
        )
        
        if clinic_id:
            query = query.filter(Appointment.clinic_id == clinic_id)
        
        if doctor_id:
            query = query.filter(Appointment.doctor_id == doctor_id)
        
        appointments = query.order_by(Appointment.start_time).all()
        
        # Convert to dict format with proper queue phase mapping
        appointments_data = []
        for apt in appointments:
            # Check if appointment has a visit
            visit = Visit.query.filter_by(appointment_id=apt.id).first()
            
            if visit:
                from app.models.appointment import AppointmentStatus
                from app.models.visit import VisitStatus
                
                visit_status = visit.status.value.lower()
                
                # Simplified logic: Determine phase based on appointment status and visit status
                # Key rule: If appointment status is CONFIRMED, patient hasn't checked in yet
                # If appointment status is CHECKED_IN or COMPLETED, patient has checked in
                
                if apt.status == AppointmentStatus.CONFIRMED:
                    # Appointment is confirmed but patient hasn't checked in
                    # Check if visit is auto-created (check_in_time equals appointment start_time)
                    # Auto-created visits should appear in appointments_today
                    if (visit.check_in_time and apt.start_time and 
                        abs((visit.check_in_time - apt.start_time).total_seconds()) < 60):
                        # Auto-created visit (check-in time matches appointment time within 1 minute)
                        queue_phase = 'appointments_today'
                        visit_status = 'scheduled'
                    elif visit.status in [VisitStatus.CALLED, VisitStatus.IN_PROGRESS, VisitStatus.COMPLETED]:
                        # Visit has progressed beyond auto-created state, but appointment status wasn't updated
                        # This means patient has checked in - use visit status to determine phase
                        if visit.status == VisitStatus.COMPLETED:
                            queue_phase = 'completed'
                        elif visit.status == VisitStatus.IN_PROGRESS:
                            queue_phase = 'with_doctor'
                        else:  # CALLED or WAITING
                            queue_phase = 'waiting'
                    else:
                        # Visit exists but status suggests not checked in yet
                        queue_phase = 'appointments_today'
                        visit_status = 'scheduled'
                else:
                    # Appointment status is CHECKED_IN or COMPLETED - patient has checked in
                    # Map visit status to queue phase
                    if visit.status == VisitStatus.COMPLETED:
                        queue_phase = 'completed'
                    elif visit.status == VisitStatus.IN_PROGRESS:
                        queue_phase = 'with_doctor'
                    elif visit.status in [VisitStatus.WAITING, VisitStatus.CALLED]:
                        queue_phase = 'waiting'
                    else:
                        queue_phase = 'waiting'  # Default fallback
            else:
                # No visit means it's a scheduled appointment - patient hasn't checked in
                queue_phase = 'appointments_today'
                visit_status = 'scheduled'
            
            # Get payment for this visit if it exists
            payment_id = None
            if visit:
                from app.models.payment import Payment
                payment = Payment.query.filter_by(visit_id=visit.id).first()
                if payment:
                    payment_id = payment.id
            
            appointments_data.append({
                'id': apt.id,
                'booking_id': apt.booking_id,
                'patient_name': apt.patient.name,
                'patient_phone': apt.patient.phone,
                'doctor_name': apt.doctor.name,
                'clinic_name': apt.clinic.name,
                'service_name': apt.service.name,
                'start_time': apt.start_time.isoformat(),
                'end_time': apt.end_time.isoformat(),
                'notes': apt.notes,
                'visit_status': visit_status,
                'queue_phase': queue_phase,
                'visit_id': visit.id if visit else None,
                'payment_id': payment_id
            })
        
        return appointments_data
    
    def reorder_queue(self, visit_id, new_position):
        """Reorder queue by moving a visit to a new position"""
        visit = Visit.query.get(visit_id)
        if not visit:
            raise ValueError("Visit not found")
        
        if visit.status != VisitStatus.WAITING:
            raise ValueError("Only waiting patients can be reordered")
        
        # Get all waiting visits for the same clinic on the same day
        today = datetime.now().date()
        waiting_visits = db.session.query(Visit).filter(
            Visit.clinic_id == visit.clinic_id,
            Visit.status == VisitStatus.WAITING,
            db.func.date(Visit.created_at) == today,
            Visit.id != visit_id
        ).order_by(Visit.queue_number).all()
        
        # Insert the visit at the new position
        if new_position <= 0:
            new_position = 1
        if new_position > len(waiting_visits) + 1:
            new_position = len(waiting_visits) + 1
        
        # Update queue numbers
        new_queue_number = new_position
        for i, waiting_visit in enumerate(waiting_visits):
            if i + 1 >= new_position:
                waiting_visit.queue_number = i + 2
            else:
                waiting_visit.queue_number = i + 1
        
        visit.queue_number = new_queue_number
        db.session.commit()
        
        return visit
    
    def cancel_visit(self, visit_id, reason="Cancelled by receptionist"):
        """Cancel a visit and remove from queue"""
        visit = Visit.query.get(visit_id)
        if not visit:
            raise ValueError("Visit not found")
        
        # Update visit status
        visit.status = VisitStatus.NO_SHOW
        visit.notes = f"Cancelled: {reason}"
        
        # Update appointment status if exists
        if visit.appointment:
            from app.models.appointment import AppointmentStatus
            visit.appointment.status = AppointmentStatus.CANCELLED
        
        db.session.commit()
        
        return visit
    
    def create_walkin_visit(self, patient_id, clinic_id, service_id, doctor_id, notes=""):
        """Create walk-in visit with automatic queue number assignment"""
        # Get next queue number
        queue_number = self.get_next_queue_number(clinic_id)
        
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
            queue_number=queue_number,
            status=VisitStatus.WAITING,
            notes=notes
        )
        
        db.session.add(visit)
        db.session.commit()
        
        return visit
    
    def get_queue_statistics(self, clinic_id, date=None):
        """Get queue statistics for a clinic on a specific date"""
        from flask import current_app
        
        if not date:
            date = datetime.now().date()
        
        try:
            # Validate clinic_id
            if clinic_id is None:
                raise ValueError("clinic_id is required")
            
            # Get all visits for the date
            visits = db.session.query(Visit).filter(
                Visit.clinic_id == clinic_id,
                db.func.date(Visit.created_at) == date
            ).all()
            
            current_app.logger.info(f"Retrieved {len(visits)} visits for clinic {clinic_id} on {date}")
        except ValueError as e:
            current_app.logger.error(f"Validation error in get_queue_statistics: {str(e)}")
            raise
        except Exception as e:
            # Log specific error
            current_app.logger.error(f"Database error in get_queue_statistics: {str(e)}")
            import traceback
            current_app.logger.error(traceback.format_exc())
            # Return empty stats instead of raising
            return {
                'date': date.isoformat(),
                'total_appointments': 0,
                'waiting_count': 0,
                'called_count': 0,
                'in_progress_count': 0,
                'completed_count': 0,
                'avg_wait_time_minutes': 0,
                'avg_consultation_time_minutes': 0,
                'error': str(e)
            }
        
        # Calculate statistics
        total_appointments = len(visits)
        waiting_count = len([v for v in visits if v.status == VisitStatus.WAITING])
        called_count = len([v for v in visits if v.status == VisitStatus.CALLED])
        in_progress_count = len([v for v in visits if v.status == VisitStatus.IN_PROGRESS])
        completed_count = len([v for v in visits if v.status == VisitStatus.COMPLETED])
        
        # Calculate average wait time (for completed visits)
        completed_visits = [v for v in visits if v.status == VisitStatus.COMPLETED and v.check_in_time and v.start_time]
        avg_wait_time = 0
        if completed_visits:
            total_wait = sum([
                (v.start_time - v.check_in_time).total_seconds() / 60 
                for v in completed_visits
            ])
            avg_wait_time = total_wait / len(completed_visits)
        
        # Calculate average consultation time
        consultation_visits = [v for v in visits if v.status == VisitStatus.COMPLETED and v.start_time and v.end_time]
        avg_consultation_time = 0
        if consultation_visits:
            total_consultation = sum([
                (v.end_time - v.start_time).total_seconds() / 60 
                for v in consultation_visits
            ])
            avg_consultation_time = total_consultation / len(consultation_visits)
        
        return {
            'date': date.isoformat(),
            'total_appointments': total_appointments,
            'waiting_count': waiting_count,
            'called_count': called_count,
            'in_progress_count': in_progress_count,
            'completed_count': completed_count,
            'avg_wait_time_minutes': round(avg_wait_time, 1),
            'avg_consultation_time_minutes': round(avg_consultation_time, 1)
        }