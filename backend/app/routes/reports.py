from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models.payment import Payment, PaymentStatus
from app.models.visit import Visit
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.clinic import Clinic
from app.utils.decorators import receptionist_required, doctor_required
from datetime import datetime, timedelta
import csv
import io

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/revenue', methods=['GET'])
@jwt_required()
def get_revenue_report():
    """Get revenue breakdown report"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    doctor_id = request.args.get('doctor_id', type=int)
    clinic_id = request.args.get('clinic_id', type=int)
    
    # Default to last 30 days if no dates provided
    if not start_date:
        start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    if not end_date:
        end_date = datetime.now().strftime('%Y-%m-%d')
    
    try:
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Build query with join to Visit for filtering
    query = db.session.query(Payment).join(Visit, Payment.visit_id == Visit.id).filter(
        Payment.status == PaymentStatus.PAID,
        db.func.date(Payment.created_at) >= start_date_obj,
        db.func.date(Payment.created_at) <= end_date_obj
    )
    
    if clinic_id:
        query = query.filter(Visit.clinic_id == clinic_id)
    if doctor_id:
        query = query.filter(Visit.doctor_id == doctor_id)
    
    payments = query.all()
    
    # Calculate totals
    total_revenue = sum(float(payment.amount_paid) for payment in payments)
    total_doctor_share = sum(float(payment.doctor_share) for payment in payments)
    total_center_share = sum(float(payment.center_share) for payment in payments)
    
    # Group by doctor
    doctor_revenue = {}
    for payment in payments:
        if not payment.visit or not payment.visit.doctor:
            continue
        doctor_name = payment.visit.doctor.name
        if doctor_name not in doctor_revenue:
            doctor_revenue[doctor_name] = {
                'total_revenue': 0,
                'doctor_share': 0,
                'center_share': 0,
                'visit_count': 0
            }
        
        doctor_revenue[doctor_name]['total_revenue'] += float(payment.amount_paid)
        doctor_revenue[doctor_name]['doctor_share'] += float(payment.doctor_share)
        doctor_revenue[doctor_name]['center_share'] += float(payment.center_share)
        doctor_revenue[doctor_name]['visit_count'] += 1
    
    return jsonify({
        'summary': {
            'total_revenue': total_revenue,
            'total_doctor_share': total_doctor_share,
            'total_center_share': total_center_share,
            'payment_count': len(payments)
        },
        'by_doctor': doctor_revenue,
        'date_range': {
            'start_date': start_date,
            'end_date': end_date
        }
    }), 200

@reports_bp.route('/visits', methods=['GET'])
@jwt_required()
def get_visits_report():
    """Get visits per clinic/doctor report"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    clinic_id = request.args.get('clinic_id', type=int)
    doctor_id = request.args.get('doctor_id', type=int)
    
    # Default to last 30 days if no dates provided
    if not start_date:
        start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    if not end_date:
        end_date = datetime.now().strftime('%Y-%m-%d')
    
    try:
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Build query
    query = db.session.query(Visit).filter(
        db.func.date(Visit.created_at) >= start_date_obj,
        db.func.date(Visit.created_at) <= end_date_obj
    )
    
    if clinic_id:
        query = query.filter(Visit.clinic_id == clinic_id)
    if doctor_id:
        query = query.filter(Visit.doctor_id == doctor_id)
    
    visits = query.all()
    
    # Group by clinic
    clinic_stats = {}
    for visit in visits:
        if not visit.clinic:
            continue
        clinic_name = visit.clinic.name
        if clinic_name not in clinic_stats:
            clinic_stats[clinic_name] = {
                'total_visits': 0,
                'scheduled_visits': 0,
                'walk_in_visits': 0,
                'completed_visits': 0
            }
        
        clinic_stats[clinic_name]['total_visits'] += 1
        if visit.visit_type.value == 'scheduled':
            clinic_stats[clinic_name]['scheduled_visits'] += 1
        else:
            clinic_stats[clinic_name]['walk_in_visits'] += 1
        
        if visit.status.value == 'completed':
            clinic_stats[clinic_name]['completed_visits'] += 1
    
    # Group by doctor
    doctor_stats = {}
    for visit in visits:
        if not visit.doctor:
            continue
        doctor_name = visit.doctor.name
        if doctor_name not in doctor_stats:
            doctor_stats[doctor_name] = {
                'total_visits': 0,
                'completed_visits': 0,
                'specialty': visit.doctor.specialty
            }
        
        doctor_stats[doctor_name]['total_visits'] += 1
        if visit.status.value == 'completed':
            doctor_stats[doctor_name]['completed_visits'] += 1
    
    return jsonify({
        'by_clinic': clinic_stats,
        'by_doctor': doctor_stats,
        'total_visits': len(visits),
        'date_range': {
            'start_date': start_date,
            'end_date': end_date
        }
    }), 200

@reports_bp.route('/doctor-shares', methods=['GET'])
@jwt_required()
def get_doctor_shares_report():
    """Get doctor vs center shares report"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    doctor_id = request.args.get('doctor_id', type=int)
    clinic_id = request.args.get('clinic_id', type=int)
    
    # Default to last 30 days if no dates provided
    if not start_date:
        start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    if not end_date:
        end_date = datetime.now().strftime('%Y-%m-%d')
    
    try:
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Build query with join to Visit for filtering
    query = db.session.query(Payment).join(Visit, Payment.visit_id == Visit.id).filter(
        Payment.status == PaymentStatus.PAID,
        db.func.date(Payment.created_at) >= start_date_obj,
        db.func.date(Payment.created_at) <= end_date_obj
    )
    
    if clinic_id:
        query = query.filter(Visit.clinic_id == clinic_id)
    if doctor_id:
        query = query.filter(Visit.doctor_id == doctor_id)
    
    # Get payments in date range
    payments = query.all()
    
    # Calculate totals
    total_revenue = sum(float(payment.amount_paid) for payment in payments)
    total_doctor_share = sum(float(payment.doctor_share) for payment in payments)
    total_center_share = sum(float(payment.center_share) for payment in payments)
    
    # Group by doctor
    doctor_shares = {}
    for payment in payments:
        if not payment.visit or not payment.visit.doctor:
            continue
        doctor_name = payment.visit.doctor.name
        if doctor_name not in doctor_shares:
            doctor_shares[doctor_name] = {
                'total_revenue': 0,
                'doctor_share': 0,
                'center_share': 0,
                'share_percentage': payment.visit.doctor.share_percentage
            }
        
        doctor_shares[doctor_name]['total_revenue'] += float(payment.amount_paid)
        doctor_shares[doctor_name]['doctor_share'] += float(payment.doctor_share)
        doctor_shares[doctor_name]['center_share'] += float(payment.center_share)
    
    return jsonify({
        'summary': {
            'total_revenue': total_revenue,
            'total_doctor_share': total_doctor_share,
            'total_center_share': total_center_share,
            'doctor_share_percentage': (total_doctor_share / total_revenue * 100) if total_revenue > 0 else 0,
            'center_share_percentage': (total_center_share / total_revenue * 100) if total_revenue > 0 else 0
        },
        'by_doctor': doctor_shares,
        'date_range': {
            'start_date': start_date,
            'end_date': end_date
        }
    }), 200

@reports_bp.route('/export', methods=['GET'])
@jwt_required()
def export_report():
    """Export report as CSV"""
    from flask_jwt_extended import get_jwt_identity
    from app.models.user import User, UserRole
    
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 401
    
    # Allow receptionist, admin, and doctor roles
    if user.role not in [UserRole.RECEPTIONIST, UserRole.ADMIN, UserRole.DOCTOR]:
        return jsonify({'message': 'Insufficient permissions'}), 403
    
    report_type = request.args.get('type', 'revenue')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    clinic_id = request.args.get('clinic_id', type=int)
    doctor_id = request.args.get('doctor_id', type=int)
    
    # Default to last 30 days if no dates provided
    if not start_date:
        start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    if not end_date:
        end_date = datetime.now().strftime('%Y-%m-%d')
    
    try:
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    if report_type == 'revenue':
        # Revenue report
        writer.writerow(['Date', 'Doctor', 'Patient', 'Service', 'Amount Paid', 'Doctor Share', 'Center Share'])
        
        # Build query with join to Visit for filtering
        query = db.session.query(Payment).join(Visit, Payment.visit_id == Visit.id).filter(
            Payment.status == PaymentStatus.PAID,
            db.func.date(Payment.created_at) >= start_date_obj,
            db.func.date(Payment.created_at) <= end_date_obj
        )
        
        if clinic_id:
            query = query.filter(Visit.clinic_id == clinic_id)
        if doctor_id:
            query = query.filter(Visit.doctor_id == doctor_id)
        
        payments = query.all()
        
        for payment in payments:
            if not payment.visit or not payment.visit.doctor or not payment.visit.patient or not payment.visit.service:
                continue
            writer.writerow([
                payment.created_at.strftime('%Y-%m-%d'),
                payment.visit.doctor.name,
                payment.visit.patient.name,
                payment.visit.service.name,
                payment.amount_paid,
                payment.doctor_share,
                payment.center_share
            ])
    
    elif report_type == 'visits':
        # Visits report
        writer.writerow(['Date', 'Clinic', 'Doctor', 'Patient', 'Service', 'Visit Type', 'Status'])
        
        # Build query with filters
        query = db.session.query(Visit).filter(
            db.func.date(Visit.created_at) >= start_date_obj,
            db.func.date(Visit.created_at) <= end_date_obj
        )
        
        if clinic_id:
            query = query.filter(Visit.clinic_id == clinic_id)
        if doctor_id:
            query = query.filter(Visit.doctor_id == doctor_id)
        
        visits = query.all()
        
        for visit in visits:
            if not visit.clinic or not visit.doctor or not visit.patient or not visit.service:
                continue
            writer.writerow([
                visit.created_at.strftime('%Y-%m-%d'),
                visit.clinic.name,
                visit.doctor.name,
                visit.patient.name,
                visit.service.name,
                visit.visit_type.value,
                visit.status.value
            ])
    
    else:
        return jsonify({'message': 'Invalid report type'}), 400
    
    # Return CSV
    output.seek(0)
    csv_data = output.getvalue()
    output.close()
    
    from flask import Response
    return Response(
        csv_data,
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename={report_type}_report_{start_date}_to_{end_date}.csv'}
    )
