import sys
sys.path.insert(0, 'backend')

from app import create_app, db
from app.models.appointment import BookingSource
from datetime import datetime

app = create_app()

with app.app_context():
    # Test BookingSource enum
    try:
        # Test converting "phone" to enum
        source1 = BookingSource["PHONE"]
        print(f"✅ BookingSource['PHONE'] works: {source1}")
        
        source2 = BookingSource("phone")
        print(f"✅ BookingSource('phone') works: {source2}")
        
        # Test the conversion used in the code
        test_value = "phone"
        source3 = BookingSource[test_value.upper()]
        print(f"✅ BookingSource['{test_value}'.upper()] works: {source3}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    # Test appointment creation
    try:
        from app.models.appointment import Appointment
        from app.models.service import Service
        from app.models.doctor import Doctor
        from app.utils.helpers import generate_booking_id, calculate_end_time
        
        service = Service.query.get(1)
        print(f"✅ Service found: {service.name if service else 'None'}")
        
        doctor = Doctor.query.get(2)
        print(f"✅ Doctor found: {doctor.name if doctor else 'None'}")
        
        start_time = datetime.fromisoformat('2025-10-22T11:00:00')
        end_time = calculate_end_time(start_time, service.duration)
        booking_id = generate_booking_id()
        
        print(f"✅ Times calculated: {start_time} -> {end_time}")
        print(f"✅ Booking ID: {booking_id}")
        
        # Try to create appointment
        appointment = Appointment(
            booking_id=booking_id,
            clinic_id=1,
            doctor_id=2,
            patient_id=1,
            service_id=1,
            start_time=start_time,
            end_time=end_time,
            booking_source=BookingSource["PHONE"],
            created_by=2,
            notes=None
        )
        
        db.session.add(appointment)
        db.session.flush()
        
        print(f"✅ Appointment created with ID: {appointment.id}")
        
        # Test Visit creation
        from app.models.visit import Visit, VisitStatus, VisitType
        from sqlalchemy import func
        
        max_queue = db.session.query(func.max(Visit.queue_number)).filter(
            Visit.clinic_id == 1,
            func.date(Visit.created_at) == start_time.date()
        ).scalar() or 0
        
        print(f"✅ Max queue number: {max_queue}")
        
        visit = Visit(
            appointment_id=appointment.id,
            doctor_id=2,
            patient_id=1,
            service_id=1,
            clinic_id=1,
            check_in_time=start_time,
            visit_type=VisitType.SCHEDULED,
            queue_number=max_queue + 1,
            status=VisitStatus.WAITING
        )
        
        db.session.add(visit)
        db.session.flush()
        
        print(f"✅ Visit created with ID: {visit.id}")
        
        # Test Payment creation
        from app.models.payment import Payment, PaymentMethod, PaymentStatus
        
        doctor_share = float(service.price) * doctor.share_percentage
        center_share = float(service.price) - doctor_share
        
        print(f"✅ Shares calculated: doctor={doctor_share}, center={center_share}")
        
        payment = Payment(
            visit_id=visit.id,
            patient_id=1,
            total_amount=float(service.price),
            amount_paid=0.0,
            payment_method=PaymentMethod.CASH,
            doctor_share=doctor_share,
            center_share=center_share,
            status=PaymentStatus.PENDING
        )
        
        db.session.add(payment)
        db.session.commit()
        
        print(f"✅ Payment created with ID: {payment.id}")
        print(f"\n🎉 SUCCESS! All records created successfully!")
        
        # Clean up
        db.session.delete(payment)
        db.session.delete(visit)
        db.session.delete(appointment)
        db.session.commit()
        print(f"✅ Test records cleaned up")
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error during creation: {e}")
        import traceback
        traceback.print_exc()

