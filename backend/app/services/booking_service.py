from app import db
from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor import Doctor
from app.models.service import Service
from app.utils.helpers import get_time_slots, is_business_hours, calculate_end_time
from datetime import datetime, timedelta

class BookingService:
    """Service for handling appointment booking logic"""
    
    def get_available_slots(self, doctor_id, date):
        """Get available time slots for a doctor on a specific date"""
        from app.models.doctor_schedule import DoctorSchedule
        
        doctor = Doctor.query.get(doctor_id)
        if not doctor:
            return []
        
        # Get day of week for the date
        # Python weekday(): Monday=0, Tuesday=1, ..., Sunday=6
        # Our DB format: Sunday=0, Monday=1, ..., Saturday=6
        python_weekday = date.weekday()  # Python: Monday=0, Sunday=6
        our_day_of_week = (python_weekday + 1) % 7  # Convert to our format
        
        # Get doctor's schedule for this day from DoctorSchedule table
        available_hours = set()
        try:
            doctor_schedules = DoctorSchedule.query.filter_by(
                doctor_id=doctor_id,
                day_of_week=our_day_of_week,
                is_available=True
            ).all()
            
            # Get available hours from DoctorSchedule
            # Filter out invalid hours (must be 0-23) to prevent errors
            if doctor_schedules:
                available_hours = {s.hour for s in doctor_schedules if 0 <= s.hour <= 23}
        except Exception as e:
            # If DoctorSchedule table doesn't exist or query fails, fall back to JSON
            doctor_schedules = []
            available_hours = set()
        
        # If no schedule found in DoctorSchedule or no available hours, fall back to old JSON fields
        if not available_hours:
            # Get doctor's working hours from JSON
            try:
                working_hours = doctor.get_working_hours()
                if working_hours and isinstance(working_hours, dict):
                    start_hour = int(working_hours.get('start', '09:00').split(':')[0])
                    end_hour = int(working_hours.get('end', '17:00').split(':')[0])
                else:
                    # Default working hours if JSON is invalid
                    start_hour = 9
                    end_hour = 17
            except (ValueError, AttributeError, KeyError):
                # Default working hours if parsing fails
                start_hour = 9
                end_hour = 17
            
            # Generate time slots based on working hours
            slots = get_time_slots(start_hour, end_hour, 30, date) if start_hour < end_hour else []
            
            # Build available hours set from working hours (all hours in range)
            available_hours = set(range(start_hour, end_hour))
        else:
            # Use DoctorSchedule table to get available hours
            # Generate slots ONLY for hours that are in the doctor's schedule
            # This ensures slots match exactly what was entered in the schedule
            if available_hours:
                # Filter out invalid hours (must be 0-23)
                valid_hours = {h for h in available_hours if 0 <= h <= 23}
                if not valid_hours:
                    # No valid hours, fall back to default
                    slots = []
                    available_hours = set()
                else:
                    # Generate slots ONLY for each hour that is in the schedule
                    # This ensures we don't generate slots for hours not in the schedule
                    slots = []
                    for hour in sorted(valid_hours):
                        # Generate 30-minute slots for this hour (e.g., hour 9 → 9:00 and 9:30)
                        hour_slots = get_time_slots(hour, hour + 1, 30, date)
                        slots.extend(hour_slots)
                    
                    # Update available_hours to only valid hours
                    available_hours = valid_hours
            else:
                # No available hours, return empty slots
                slots = []
        
        # Get existing appointments for the date
        existing_appointments = db.session.query(Appointment).filter(
            Appointment.doctor_id == doctor_id,
            db.func.date(Appointment.start_time) == date,
            Appointment.status.in_([AppointmentStatus.CONFIRMED, AppointmentStatus.CHECKED_IN])
        ).all()
        
        # Create set of occupied times
        occupied_times = set()
        for appointment in existing_appointments:
            start_time = appointment.start_time.time()
            end_time = appointment.end_time.time()
            
            # Add all 30-minute slots that overlap with this appointment
            current_time = start_time
            while current_time < end_time:
                occupied_times.add(current_time.strftime('%H:%M'))
                current_time = (datetime.combine(date, current_time) + timedelta(minutes=30)).time()
        
        # Get current UTC datetime for comparison
        now_utc = datetime.utcnow()
        current_date = now_utc.date()
        current_time = now_utc.time()
        
        # Filter out occupied slots and check availability
        available_slots = []
        for slot in slots:
            slot_time = datetime.strptime(slot['start_time'], '%H:%M').time()
            slot_hour = slot_time.hour
            
            # Check if this hour is in doctor's available schedule
            if slot_hour not in available_hours:
                available_slots.append({
                    'start_time': slot['start_time'],
                    'end_time': slot['end_time'],
                    'available': False,
                    'reason': 'Not in schedule'
                })
                continue
            
            # Check if slot is occupied by existing appointment
            if slot_time.strftime('%H:%M') in occupied_times:
                available_slots.append({
                    'start_time': slot['start_time'],
                    'end_time': slot['end_time'],
                    'available': False,
                    'reason': 'Booked'
                })
                continue
            
            # Check if slot is in the past (for today only)
            if date == current_date:
                # For today, only show slots in the future
                # Compare time components (hour and minute) to avoid timezone/datetime comparison issues
                slot_hour = slot_time.hour
                slot_minute = slot_time.minute
                current_hour = current_time.hour
                current_minute = current_time.minute
                
                # Check if slot time is in the past
                # Add a small buffer (15 minutes) to allow booking near current time
                is_past = (slot_hour < current_hour) or \
                         (slot_hour == current_hour and slot_minute < current_minute - 15)
                
                if is_past:
                    available_slots.append({
                        'start_time': slot['start_time'],
                        'end_time': slot['end_time'],
                        'available': False,
                        'reason': 'Past time'
                    })
                    continue
            
            # Slot is available
            available_slots.append({
                'start_time': slot['start_time'],
                'end_time': slot['end_time'],
                'available': True
            })
        
        # Return only available slots (filter out unavailable ones for cleaner response)
        # Actually, let's return all slots with availability flag so UI can show why slots aren't available
        return available_slots
    
    def create_appointment(self, data):
        """Create a new appointment with validation"""
        # Validate appointment time
        start_time = datetime.fromisoformat(data['start_time'].replace('Z', '+00:00'))
        service = Service.query.get(data['service_id'])
        if not service:
            raise ValueError("Service not found")
        
        end_time = calculate_end_time(start_time, service.duration)
        
        # Check for conflicts
        conflicting_appointments = db.session.query(Appointment).filter(
            Appointment.doctor_id == data['doctor_id'],
            Appointment.status.in_([AppointmentStatus.CONFIRMED, AppointmentStatus.CHECKED_IN]),
            db.or_(
                # New appointment starts during existing appointment
                db.and_(
                    Appointment.start_time <= start_time,
                    Appointment.end_time > start_time
                ),
                # New appointment ends during existing appointment
                db.and_(
                    Appointment.start_time < end_time,
                    Appointment.end_time >= end_time
                ),
                # New appointment completely contains existing appointment
                db.and_(
                    Appointment.start_time >= start_time,
                    Appointment.end_time <= end_time
                )
            )
        ).first()
        
        if conflicting_appointments:
            raise ValueError("Time slot conflicts with existing appointment")
        
        # Check if doctor works on this day
        doctor = Doctor.query.get(data['doctor_id'])
        if not doctor:
            raise ValueError("Doctor not found")
        
        day_name = start_time.strftime('%A')
        if not doctor.is_working_on_day(day_name):
            raise ValueError(f"Doctor doesn't work on {day_name}")
        
        # Check working hours
        if not is_business_hours(start_time, doctor.get_working_hours()):
            raise ValueError("Appointment outside working hours")
        
        # Create appointment
        appointment = Appointment(
            booking_id=data['booking_id'],
            clinic_id=data['clinic_id'],
            doctor_id=data['doctor_id'],
            patient_id=data['patient_id'],
            service_id=data['service_id'],
            start_time=start_time,
            end_time=end_time,
            booking_source=data['booking_source'],
            created_by=data['created_by'],
            notes=data.get('notes')
        )
        
        db.session.add(appointment)
        db.session.commit()
        
        return appointment
    
    def get_appointment_by_booking_id(self, booking_id):
        """Get appointment by booking ID"""
        return Appointment.query.filter_by(booking_id=booking_id).first()
    
    def cancel_appointment(self, appointment_id):
        """Cancel an appointment"""
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            raise ValueError("Appointment not found")
        
        if appointment.status != AppointmentStatus.CONFIRMED:
            raise ValueError("Only confirmed appointments can be cancelled")
        
        appointment.status = AppointmentStatus.CANCELLED
        db.session.commit()
        
        return appointment
    
    def get_appointments_for_date(self, doctor_id, date):
        """Get all appointments for a doctor on a specific date"""
        return db.session.query(Appointment).filter(
            Appointment.doctor_id == doctor_id,
            db.func.date(Appointment.start_time) == date
        ).order_by(Appointment.start_time).all()
    
    def get_appointments_for_patient(self, patient_id, limit=10):
        """Get recent appointments for a patient"""
        return db.session.query(Appointment).filter(
            Appointment.patient_id == patient_id
        ).order_by(Appointment.start_time.desc()).limit(limit).all()
    
    def create_followup_appointment(self, patient_id, doctor_id, clinic_id, service_id, 
                                  followup_date, original_visit_id):
        """Create automatic follow-up appointment"""
        from app.utils.helpers import generate_booking_id, calculate_end_time
        from app.models.service import Service
        from app.models.appointment import BookingSource
        
        # Get service details
        service = Service.query.get(service_id)
        if not service:
            return None
        
        # Find next available slot on followup_date
        available_slots = self.get_available_slots(doctor_id, followup_date)
        if not available_slots:
            print(f"No available slots for follow-up on {followup_date}")
            return None
        
        # Use first available slot
        first_slot = available_slots[0]
        if not first_slot['available']:
            print(f"First slot not available: {first_slot.get('reason', 'Unknown')}")
            return None
        
        # Create appointment time
        start_time_str = f"{followup_date.strftime('%Y-%m-%d')}T{first_slot['start_time']}:00"
        start_time = datetime.fromisoformat(start_time_str)
        end_time = calculate_end_time(start_time, service.duration)
        
        # Generate booking ID
        booking_id = generate_booking_id()
        
        # Create follow-up appointment
        followup_appointment = Appointment(
            booking_id=booking_id,
            clinic_id=clinic_id,
            doctor_id=doctor_id,
            patient_id=patient_id,
            service_id=service_id,
            start_time=start_time,
            end_time=end_time,
            booking_source=BookingSource.SYSTEM,  # Mark as system-generated
            notes=f"Follow-up appointment for visit #{original_visit_id}"
        )
        
        db.session.add(followup_appointment)
        db.session.commit()
        
        return followup_appointment
