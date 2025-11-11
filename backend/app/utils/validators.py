import re
from datetime import datetime
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app import db

def validate_phone_number(phone):
    """Validate phone number format"""
    # Remove all non-digit characters
    phone_digits = re.sub(r'\D', '', phone)
    
    # Check if it's a valid length (7-15 digits)
    if len(phone_digits) < 7 or len(phone_digits) > 15:
        return False
    
    # Check if it contains only digits
    if not phone_digits.isdigit():
        return False
    
    return True

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_appointment_time(doctor_id, start_time, end_time, appointment_id=None):
    """Validate appointment time doesn't conflict with existing appointments"""
    from app.models.appointment import AppointmentStatus
    
    # Check if doctor exists
    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return False, "Doctor not found"
    
    # Check if appointment is within working hours using DoctorSchedule table
    appointment_date = start_time.date()
    day_name = appointment_date.strftime('%A')
    
    # Python weekday(): Monday=0, Tuesday=1, ..., Sunday=6
    # Our DB format: Sunday=0, Monday=1, ..., Saturday=6
    day_of_week = appointment_date.weekday()  # Python: Monday=0, Sunday=6
    our_day_of_week = (day_of_week + 1) % 7  # Our format: Sunday=0, Monday=1, ..., Saturday=6
    
    # Calculate all hours covered by this appointment
    from datetime import timedelta
    hours_to_check = []
    current_check_time = start_time
    while current_check_time < end_time:
        hours_to_check.append(current_check_time.hour)
        current_check_time += timedelta(minutes=30)
    
    # Remove duplicates while preserving order
    hours_to_check = list(dict.fromkeys(hours_to_check))
    
    # Check DoctorSchedule table first
    from app.models.doctor_schedule import DoctorSchedule
    
    # Check if doctor has any schedule entries for this day
    has_any_schedule = DoctorSchedule.query.filter_by(
        doctor_id=doctor_id,
        day_of_week=our_day_of_week,
        is_available=True
    ).first() is not None
    
    if has_any_schedule:
        # Check if all required hours are available in DoctorSchedule
        schedule_entries = DoctorSchedule.query.filter_by(
            doctor_id=doctor_id,
            day_of_week=our_day_of_week,
            is_available=True
        ).filter(DoctorSchedule.hour.in_(hours_to_check)).all()
        
        available_hours = {entry.hour for entry in schedule_entries}
        missing_hours = set(hours_to_check) - available_hours
        
        if len(missing_hours) > 0:
            return False, f"Appointment spans hours not in doctor's schedule: {sorted(missing_hours)}"
        # If all hours are available, validation passes for DoctorSchedule
    else:
        # No DoctorSchedule entries found - fall back to old working_days and working_hours JSON fields
        if not doctor.is_working_on_day(day_name):
            return False, f"Doctor doesn't work on {day_name}"
        
        # Check working hours using old JSON field
        working_hours = doctor.get_working_hours()
        if not working_hours or not isinstance(working_hours, dict):
            # Default working hours if not set
            working_hours = {'start': '09:00', 'end': '17:00'}
        
        start_hour_str = working_hours.get('start', '09:00')
        end_hour_str = working_hours.get('end', '17:00')
        
        try:
            start_hour = datetime.strptime(start_hour_str, '%H:%M').time()
            end_hour = datetime.strptime(end_hour_str, '%H:%M').time()
        except (ValueError, TypeError):
            # Default working hours if parsing fails
            start_hour = datetime.strptime('09:00', '%H:%M').time()
            end_hour = datetime.strptime('17:00', '%H:%M').time()
        
        # Check if appointment is within working hours
        # Appointment can start at or after start_hour, and end at or before end_hour
        if start_time.time() < start_hour or end_time.time() > end_hour:
            return False, "Appointment outside working hours"
    
    # Check for conflicts with existing appointments
    conflicting_appointments = db.session.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.status.in_([AppointmentStatus.CONFIRMED, AppointmentStatus.CHECKED_IN]),
        Appointment.id != appointment_id,  # Exclude current appointment if updating
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
        return False, "Time slot conflicts with existing appointment"
    
    return True, "Valid"

def validate_payment_amount(visit_id, amount_paid):
    """Validate payment amount matches service price"""
    from app.models.visit import Visit
    
    visit = Visit.query.get(visit_id)
    if not visit:
        return False, "Visit not found"
    
    service_price = float(visit.service.price)
    
    if abs(float(amount_paid) - service_price) > 0.01:  # Allow small floating point differences
        return False, f"Payment amount {amount_paid} doesn't match service price {service_price}"
    
    return True, "Valid"

def validate_file_upload(file, allowed_extensions=None):
    """Validate uploaded file"""
    if not file:
        return False, "No file provided"
    
    if file.filename == '':
        return False, "No file selected"
    
    if allowed_extensions is None:
        allowed_extensions = {'png', 'jpg', 'jpeg', 'pdf'}
    
    # Check file extension
    if '.' not in file.filename:
        return False, "File has no extension"
    
    file_extension = file.filename.rsplit('.', 1)[1].lower()
    if file_extension not in allowed_extensions:
        return False, f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
    
    # Check file size (5MB limit)
    file.seek(0, 2)  # Seek to end
    file_size = file.tell()
    file.seek(0)  # Reset to beginning
    
    if file_size > 5 * 1024 * 1024:  # 5MB
        return False, "File too large. Maximum size is 5MB"
    
    return True, "Valid"

def sanitize_filename(filename):
    """Sanitize filename for safe storage"""
    # Remove path components
    filename = filename.split('/')[-1]
    filename = filename.split('\\')[-1]
    
    # Remove or replace dangerous characters
    filename = re.sub(r'[^\w\-_\.]', '_', filename)
    
    # Ensure filename isn't empty
    if not filename:
        filename = 'uploaded_file'
    
    return filename
