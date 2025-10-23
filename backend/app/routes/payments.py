from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, cache
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.visit import Visit, VisitStatus
from app.models.patient import Patient
from app.utils.decorators import receptionist_required, validate_json, log_audit
from app.utils.validators import validate_payment_amount
from app.services.payment_service import PaymentService
from datetime import datetime

payments_bp = Blueprint('payments', __name__)

@payments_bp.route('', methods=['GET'])
@jwt_required()
def get_payments():
    """Get payments with optional filters"""
    patient_id = request.args.get('patient_id', type=int)
    status = request.args.get('status')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    query = Payment.query
    
    if patient_id:
        query = query.filter(Payment.patient_id == patient_id)
    if status:
        try:
            status_enum = PaymentStatus(status)
            query = query.filter(Payment.status == status_enum)
        except ValueError:
            return jsonify({'message': 'Invalid status'}), 400
    if start_date:
        try:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(db.func.date(Payment.created_at) >= start_date_obj)
        except ValueError:
            return jsonify({'message': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
    if end_date:
        try:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(db.func.date(Payment.created_at) <= end_date_obj)
        except ValueError:
            return jsonify({'message': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
    
    # Order by creation date
    query = query.order_by(Payment.created_at.desc())
    
    # Paginate
    payments = query.paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'payments': [payment.to_dict() for payment in payments.items],
        'total': payments.total,
        'pages': payments.pages,
        'current_page': page,
        'per_page': per_page
    }), 200

@payments_bp.route('/<int:payment_id>', methods=['GET'])
@jwt_required()
def get_payment(payment_id):
    """Get payment details"""
    payment = Payment.query.get_or_404(payment_id)
    return jsonify({'payment': payment.to_dict()}), 200

@payments_bp.route('/<int:payment_id>/process', methods=['PUT'])
@receptionist_required
@validate_json(['amount_paid', 'payment_method'])
@log_audit('process_existing_payment', 'payment')
def process_existing_payment(payment_id, data, current_user):
    """Process an existing pending payment"""
    payment = Payment.query.get_or_404(payment_id)
    
    # Check if payment is pending
    if payment.status != PaymentStatus.PENDING:
        return jsonify({'message': 'Only pending payments can be processed'}), 400
    
    # Validate payment method
    try:
        payment_method_enum = PaymentMethod(data['payment_method'])
    except ValueError:
        return jsonify({'message': 'Invalid payment method'}), 400
    
    # Validate payment amount
    amount_paid = float(data['amount_paid'])
    if amount_paid <= 0:
        return jsonify({'message': 'Payment amount must be greater than 0'}), 400
    
    if amount_paid > payment.total_amount:
        return jsonify({'message': 'Payment amount cannot exceed total amount'}), 400
    
    # Update payment
    payment.amount_paid = amount_paid
    payment.payment_method = payment_method_enum
    payment.status = PaymentStatus.PAID
    payment.paid_at = datetime.utcnow()
    
    # Update visit status to completed
    visit = payment.visit
    if visit:
        visit.status = VisitStatus.COMPLETED
        visit.end_time = datetime.utcnow()
    
    db.session.commit()
    
    # Emit real-time update for payment processing
    from app import socketio
    from app.services.queue_service import QueueService
    
    # Emit payment processed event
    socketio.emit('payment_processed', {
        'payment': payment.to_dict(),
        'visit': visit.to_dict() if visit else None
    })
    
    # Emit queue updates if visit exists
    if visit:
        queue_service = QueueService()
        queue_data = queue_service.get_clinic_queue(visit.clinic_id)
        socketio.emit('queue_updated', queue_data, room=f'clinic_{visit.clinic_id}')
        
        doctor_queue_data = queue_service.get_doctor_queue(visit.doctor_id)
        socketio.emit('queue_updated', doctor_queue_data, room=f'doctor_{visit.doctor_id}')
    
    # Invalidate cache
    cache.delete_memoized(get_payments)
    
    return jsonify({
        'message': 'Payment processed successfully',
        'payment': payment.to_dict()
    }), 200

@payments_bp.route('', methods=['POST'])
@receptionist_required
@validate_json(['visit_id', 'payment_method', 'amount_paid'])
@log_audit('process_payment', 'payment')
def process_payment(data, current_user):
    """Process payment for visit"""
    visit_id = data['visit_id']
    payment_method = data['payment_method']
    amount_paid = data['amount_paid']
    
    # Get visit
    visit = Visit.query.get_or_404(visit_id)
    
    # Check if visit is ready for payment
    if visit.status != VisitStatus.PENDING_PAYMENT:
        return jsonify({'message': 'Visit is not ready for payment'}), 400
    
    # Validate payment amount
    is_valid, message = validate_payment_amount(visit_id, amount_paid)
    if not is_valid:
        return jsonify({'message': message}), 400
    
    # Validate payment method
    try:
        payment_method_enum = PaymentMethod(payment_method)
    except ValueError:
        return jsonify({'message': 'Invalid payment method'}), 400
    
    # Process payment using service
    payment_service = PaymentService()
    payment = payment_service.process_payment(
        visit_id=visit_id,
        payment_method=payment_method_enum,
        amount_paid=amount_paid
    )
    
    # Update visit status
    visit.status = VisitStatus.COMPLETED
    visit.end_time = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        'message': 'Payment processed successfully',
        'payment': payment.to_dict(),
        'invoice': payment_service.generate_invoice_data(payment.id)
    }), 201

@payments_bp.route('/invoice/<int:visit_id>', methods=['GET'])
@jwt_required()
def get_invoice(visit_id):
    """Generate printable invoice for visit"""
    visit = Visit.query.get_or_404(visit_id)
    
    if not visit.payment:
        return jsonify({'message': 'No payment found for this visit'}), 404
    
    payment_service = PaymentService()
    invoice_data = payment_service.generate_invoice_data(visit.payment.id)
    
    return jsonify({'invoice': invoice_data}), 200

@payments_bp.route('/refund/<int:payment_id>', methods=['POST'])
@receptionist_required
@log_audit('refund_payment', 'payment')
def refund_payment(payment_id, current_user):
    """Refund payment"""
    payment = Payment.query.get_or_404(payment_id)
    
    if payment.status != PaymentStatus.PAID:
        return jsonify({'message': 'Only paid payments can be refunded'}), 400
    
    # Update payment status
    payment.status = PaymentStatus.REFUNDED
    
    # Update visit status back to pending payment
    visit = Visit.query.get(payment.visit_id)
    if visit:
        visit.status = VisitStatus.PENDING_PAYMENT
    
    db.session.commit()
    
    return jsonify({
        'message': 'Payment refunded successfully',
        'payment': payment.to_dict()
    }), 200
