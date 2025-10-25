from datetime import datetime, timedelta
from app.models.appointment import Appointment
from app import db

def generate_booking_id():
    """Generate unique booking ID in format A-YYYY-MMDD-XXXX"""
    today = datetime.now()
    date_str = today.strftime('%Y-%m%d')
    
    # Get the last booking ID for today
    last_appointment = db.session.query(Appointment).filter(
        Appointment.booking_id.like(f'A-{date_str}-%')
    ).order_by(Appointment.booking_id.desc()).first()
    
    if last_appointment:
        # Extract sequence number and increment
        try:
            last_sequence = int(last_appointment.booking_id.split('-')[-1])
            new_sequence = last_sequence + 1
        except (ValueError, IndexError):
            new_sequence = 1
    else:
        new_sequence = 1
    
    # Format with leading zeros (4 digits)
    sequence_str = f"{new_sequence:04d}"
    
    return f"A-{date_str}-{sequence_str}"

def calculate_doctor_share(total_amount, doctor_share_percentage):
    """Calculate doctor's share of payment"""
    return total_amount * doctor_share_percentage

def calculate_center_share(total_amount, doctor_share):
    """Calculate center's share of payment"""
    return total_amount - doctor_share

def get_next_queue_number(clinic_id, date=None):
    """Get next queue number for clinic on given date"""
    if date is None:
        date = datetime.now().date()
    
    # Get the highest queue number for the clinic on the given date
    from app.models.visit import Visit
    
    max_queue = db.session.query(db.func.max(Visit.queue_number)).filter(
        Visit.clinic_id == clinic_id,
        db.func.date(Visit.created_at) == date
    ).scalar()
    
    return (max_queue or 0) + 1

def format_datetime_for_display(dt):
    """Format datetime for display in UI"""
    if not dt:
        return None
    return dt.strftime('%Y-%m-%d %H:%M')

def format_time_for_display(dt):
    """Format time for display in UI"""
    if not dt:
        return None
    return dt.strftime('%H:%M')

def get_working_days_list():
    """Get list of working days"""
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

def get_time_slots(start_hour=9, end_hour=17, slot_duration=30, date=None):
    """Generate time slots for appointment booking"""
    slots = []
    if date is None:
        date = datetime.now().date()
    
    current_time = datetime.combine(date, datetime.min.time().replace(hour=start_hour, minute=0, second=0, microsecond=0))
    end_time = datetime.combine(date, datetime.min.time().replace(hour=end_hour, minute=0, second=0, microsecond=0))
    
    while current_time < end_time:
        slots.append({
            'start_time': current_time.strftime('%H:%M'),
            'end_time': (current_time + timedelta(minutes=slot_duration)).strftime('%H:%M'),
            'value': current_time.strftime('%H:%M')
        })
        current_time += timedelta(minutes=slot_duration)
    
    return slots

def is_business_hours(dt, working_hours):
    """Check if datetime is within business hours"""
    if not dt or not working_hours:
        return False
    
    time_str = dt.strftime('%H:%M')
    start_time = working_hours.get('start', '09:00')
    end_time = working_hours.get('end', '17:00')
    
    return start_time <= time_str <= end_time

def get_appointment_duration(service_duration):
    """Get appointment duration in minutes"""
    return service_duration

def calculate_end_time(start_time, duration_minutes):
    """Calculate end time from start time and duration"""
    return start_time + timedelta(minutes=duration_minutes)

def get_date_range_days(start_date, end_date):
    """Get list of dates between start and end date"""
    dates = []
    current_date = start_date
    
    while current_date <= end_date:
        dates.append(current_date)
        current_date += timedelta(days=1)
    
    return dates

def is_weekend(date):
    """Check if date is weekend"""
    return date.weekday() >= 5  # Saturday = 5, Sunday = 6

def get_weekday_name(date):
    """Get weekday name from date"""
    return date.strftime('%A')
