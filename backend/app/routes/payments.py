from flask import Blueprint, request, jsonify, send_file, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, cache
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.visit import Visit, VisitStatus
from app.models.patient import Patient
from app.utils.decorators import receptionist_required, validate_json, log_audit
from app.utils.validators import validate_payment_amount
from app.services.payment_service import PaymentService
from datetime import datetime
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
from io import BytesIO

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
    
    # Check if payment is pending or partially paid
    if payment.status not in [PaymentStatus.PENDING, PaymentStatus.PARTIALLY_PAID]:
        return jsonify({'message': 'Only pending or partially paid payments can be processed'}), 400
    
    # Validate payment method
    try:
        payment_method_enum = PaymentMethod(data['payment_method'])
    except ValueError:
        return jsonify({'message': 'Invalid payment method'}), 400
    
    # Get discount amount if provided
    discount_amount = float(data.get('discount_amount', 0))
    if discount_amount < 0:
        return jsonify({'message': 'Discount amount cannot be negative'}), 400
    
    if discount_amount > payment.total_amount:
        return jsonify({'message': 'Discount amount cannot exceed total amount'}), 400
    
    # Get amount to be set as total paid (frontend sends the full amount to set)
    new_total_paid = float(data['amount_paid'])
    if new_total_paid <= 0:
        return jsonify({'message': 'Payment amount must be greater than 0'}), 400
    
    # Validate total paid doesn't exceed total amount minus discount
    max_allowed = float(payment.total_amount) - discount_amount
    if new_total_paid > max_allowed:
        return jsonify({'message': f'Total payment cannot exceed ${max_allowed:.2f} after discount'}), 400
    
    # Update payment with discount if this is the first payment
    if payment.status == PaymentStatus.PENDING:
        payment.discount_amount = discount_amount
    
    # Get visit before updates
    visit = payment.visit
    
    # Update payment amounts
    payment.amount_paid = new_total_paid
    payment.payment_method = payment_method_enum
    payment.paid_at = datetime.utcnow()
    
    # Determine payment status
    remaining = float(payment.total_amount) - discount_amount - new_total_paid
    if remaining <= 0.01:  # Account for floating point precision
        payment.status = PaymentStatus.PAID
        # Update visit status to completed
        if visit:
            visit.status = VisitStatus.COMPLETED
            visit.end_time = datetime.utcnow()
    else:
        payment.status = PaymentStatus.PARTIALLY_PAID
    
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

@payments_bp.route('/export', methods=['GET'])
@jwt_required()
def export_payments():
    """Export payments to Excel file"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    date = request.args.get('date')  # Single date for convenience
    
    query = Payment.query
    
    # Handle date range or single date
    if date:
        try:
            date_obj = datetime.strptime(date, '%Y-%m-%d').date()
            query = query.filter(db.func.date(Payment.created_at) == date_obj)
        except ValueError:
            return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    elif start_date or end_date:
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
    
    # Get payments with related data
    payments = query.join(Visit).join(Patient).options(
        db.joinedload(Payment.visit).joinedload(Visit.patient),
        db.joinedload(Payment.visit).joinedload(Visit.doctor),
        db.joinedload(Payment.visit).joinedload(Visit.clinic),
        db.joinedload(Payment.visit).joinedload(Visit.service)
    ).all()
    
    # Create workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Payments"
    
    # Define header styles
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)
    
    # Write headers
    headers = [
        'Payment ID', 'Date', 'Patient Name', 'Phone', 'Doctor', 'Clinic', 'Service',
        'Total Amount', 'Discount', 'Amount Paid', 'Remaining', 'Payment Method', 'Status'
    ]
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_num)
        cell.value = header
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center')
    
    # Write data
    for row_num, payment in enumerate(payments, 2):
        visit = payment.visit
        patient = visit.patient if visit else None
        doctor = visit.doctor if visit else None
        clinic = visit.clinic if visit else None
        service = visit.service if visit else None
        
        ws.cell(row=row_num, column=1, value=payment.id)
        ws.cell(row=row_num, column=2, value=payment.created_at.strftime('%Y-%m-%d %H:%M') if payment.created_at else '')
        ws.cell(row=row_num, column=3, value=patient.name if patient else '')
        ws.cell(row=row_num, column=4, value=patient.phone if patient else '')
        ws.cell(row=row_num, column=5, value=f"Dr. {doctor.name}" if doctor else '')
        ws.cell(row=row_num, column=6, value=clinic.name if clinic else '')
        ws.cell(row=row_num, column=7, value=service.name if service else '')
        ws.cell(row=row_num, column=8, value=float(payment.total_amount))
        ws.cell(row=row_num, column=9, value=float(payment.discount_amount))
        ws.cell(row=row_num, column=10, value=float(payment.amount_paid))
        ws.cell(row=row_num, column=11, value=payment.remaining_amount)
        ws.cell(row=row_num, column=12, value=payment.payment_method.value if payment.payment_method else '')
        ws.cell(row=row_num, column=13, value=payment.status.value if payment.status else '')
    
    # Add total row
    total_row = row_num + 1
    ws.cell(row=total_row, column=7, value='TOTAL')
    ws.cell(row=total_row, column=8, value=f'=SUM(H2:H{row_num})')  # Total Amount
    ws.cell(row=total_row, column=9, value=f'=SUM(I2:I{row_num})')  # Discount
    ws.cell(row=total_row, column=10, value=f'=SUM(J2:J{row_num})')  # Amount Paid
    ws.cell(row=total_row, column=11, value=f'=SUM(K2:K{row_num})')  # Remaining
    
    # Style total row
    for col in [7, 8, 9, 10, 11]:
        cell = ws.cell(row=total_row, column=col)
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="E7E6E6", end_color="E7E6E6", fill_type="solid")
    
    # Adjust column widths
    column_widths = [12, 18, 20, 15, 20, 20, 20, 14, 12, 12, 12, 15, 15]
    for col_num, width in enumerate(column_widths, 1):
        ws.column_dimensions[chr(64 + col_num)].width = width
    
    # Create in-memory file
    excel_file = BytesIO()
    wb.save(excel_file)
    excel_file.seek(0)
    
    # Generate filename
    if date:
        filename = f"payments_{date}.xlsx"
    elif start_date and end_date:
        filename = f"payments_{start_date}_to_{end_date}.xlsx"
    else:
        filename = f"payments_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    return send_file(
        excel_file,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename
    )
