from app import db
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.visit import Visit, VisitStatus
from app.models.doctor import Doctor
from app.utils.helpers import calculate_doctor_share, calculate_center_share
from datetime import datetime

class PaymentService:
    """Service for handling payment processing logic"""
    
    def process_payment(self, visit_id, payment_method, amount_paid):
        """Process payment for a visit"""
        visit = Visit.query.get(visit_id)
        if not visit:
            raise ValueError("Visit not found")
        
        if visit.status != VisitStatus.PENDING_PAYMENT:
            raise ValueError("Visit is not ready for payment")
        
        # Get service price
        service_price = float(visit.service.price)
        
        # Validate payment amount
        if abs(float(amount_paid) - service_price) > 0.01:
            raise ValueError(f"Payment amount {amount_paid} doesn't match service price {service_price}")
        
        # Get doctor's share percentage
        doctor = Doctor.query.get(visit.doctor_id)
        doctor_share_percentage = doctor.share_percentage if doctor else 0.7
        
        # Calculate shares
        total_amount = service_price
        doctor_share = calculate_doctor_share(total_amount, doctor_share_percentage)
        center_share = calculate_center_share(total_amount, doctor_share)
        
        # Create payment
        payment = Payment(
            visit_id=visit_id,
            patient_id=visit.patient_id,
            total_amount=total_amount,
            amount_paid=amount_paid,
            payment_method=payment_method,
            doctor_share=doctor_share,
            center_share=center_share,
            status=PaymentStatus.PAID
        )
        
        # Mark as paid
        payment.mark_as_paid()
        
        db.session.add(payment)
        
        # Update visit status
        visit.status = VisitStatus.COMPLETED
        visit.end_time = datetime.utcnow()
        
        db.session.commit()
        
        return payment
    
    def generate_invoice_data(self, payment_id):
        """Generate invoice data for payment"""
        payment = Payment.query.get(payment_id)
        if not payment:
            raise ValueError("Payment not found")
        
        visit = payment.visit
        patient = visit.patient
        doctor = visit.doctor
        clinic = visit.clinic
        service = visit.service
        
        invoice_data = {
            'invoice_number': f"INV-{payment.id:06d}",
            'date': payment.paid_at.strftime('%Y-%m-%d') if payment.paid_at else payment.created_at.strftime('%Y-%m-%d'),
            'time': payment.paid_at.strftime('%H:%M') if payment.paid_at else payment.created_at.strftime('%H:%M'),
            'patient': {
                'name': patient.name,
                'phone': patient.phone,
                'address': patient.address
            },
            'doctor': {
                'name': doctor.name,
                'specialty': doctor.specialty
            },
            'clinic': {
                'name': clinic.name,
                'room_number': clinic.room_number
            },
            'service': {
                'name': service.name,
                'duration': service.duration
            },
            'payment': {
                'total_amount': float(payment.total_amount),
                'amount_paid': float(payment.amount_paid),
                'discount_amount': float(payment.discount_amount),
                'remaining_amount': payment.remaining_amount,
                'payment_method': payment.payment_method.value,
                'doctor_share': float(payment.doctor_share),
                'center_share': float(payment.center_share)
            },
            'visit': {
                'check_in_time': visit.check_in_time.strftime('%Y-%m-%d %H:%M') if visit.check_in_time else None,
                'start_time': visit.start_time.strftime('%Y-%m-%d %H:%M') if visit.start_time else None,
                'end_time': visit.end_time.strftime('%Y-%m-%d %H:%M') if visit.end_time else None,
                'visit_type': visit.visit_type.value
            }
        }
        
        return invoice_data
    
    def refund_payment(self, payment_id):
        """Refund a payment"""
        payment = Payment.query.get(payment_id)
        if not payment:
            raise ValueError("Payment not found")
        
        if payment.status not in [PaymentStatus.PAID, PaymentStatus.PARTIALLY_PAID]:
            raise ValueError("Only paid or partially paid payments can be refunded")
        
        # Update payment status
        payment.status = PaymentStatus.REFUNDED
        
        # Update visit status back to pending payment
        visit = Visit.query.get(payment.visit_id)
        if visit:
            visit.status = VisitStatus.PENDING_PAYMENT
        
        db.session.commit()
        
        return payment
    
    def get_payment_summary(self, start_date, end_date, doctor_id=None):
        """Get payment summary for date range"""
        query = db.session.query(Payment).filter(
            Payment.status == PaymentStatus.PAID,
            db.func.date(Payment.created_at) >= start_date,
            db.func.date(Payment.created_at) <= end_date
        )
        
        if doctor_id:
            query = query.filter(Payment.visit.has(Visit.doctor_id == doctor_id))
        
        payments = query.all()
        
        total_revenue = sum(float(payment.amount_paid) for payment in payments)
        total_doctor_share = sum(float(payment.doctor_share) for payment in payments)
        total_center_share = sum(float(payment.center_share) for payment in payments)
        
        return {
            'total_payments': len(payments),
            'total_revenue': total_revenue,
            'total_doctor_share': total_doctor_share,
            'total_center_share': total_center_share,
            'average_payment': total_revenue / len(payments) if payments else 0
        }
    
    def get_doctor_earnings(self, doctor_id, start_date, end_date):
        """Get doctor's earnings for date range"""
        payments = db.session.query(Payment).filter(
            Payment.visit.has(Visit.doctor_id == doctor_id),
            Payment.status == PaymentStatus.PAID,
            db.func.date(Payment.created_at) >= start_date,
            db.func.date(Payment.created_at) <= end_date
        ).all()
        
        total_earnings = sum(float(payment.doctor_share) for payment in payments)
        total_visits = len(payments)
        
        return {
            'doctor_id': doctor_id,
            'total_earnings': total_earnings,
            'total_visits': total_visits,
            'average_earnings_per_visit': total_earnings / total_visits if total_visits > 0 else 0
        }
