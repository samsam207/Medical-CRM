from app import db
from datetime import datetime
import enum
from decimal import Decimal

class PaymentMethod(enum.Enum):
    CASH = "cash"
    VISA = "visa"
    BANK_TRANSFER = "bank_transfer"

class PaymentStatus(enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    REFUNDED = "refunded"

class Payment(db.Model):
    __tablename__ = 'payments'
    
    id = db.Column(db.Integer, primary_key=True)
    visit_id = db.Column(db.Integer, db.ForeignKey('visits.id'), nullable=False, index=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False, index=True)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    amount_paid = db.Column(db.Numeric(10, 2), nullable=False)
    payment_method = db.Column(db.Enum(PaymentMethod), nullable=False)
    status = db.Column(db.Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    doctor_share = db.Column(db.Numeric(10, 2), nullable=False)
    center_share = db.Column(db.Numeric(10, 2), nullable=False)
    paid_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Indexes for performance
    __table_args__ = (
        db.Index('idx_payment_date_status', db.func.date('created_at'), 'status'),
        db.Index('idx_payment_patient_date', 'patient_id', db.func.date('created_at')),
        db.Index('idx_payment_visit', 'visit_id'),
    )
    
    def __init__(self, visit_id, patient_id, total_amount, amount_paid, payment_method, 
                 doctor_share, center_share, status=PaymentStatus.PENDING):
        self.visit_id = visit_id
        self.patient_id = patient_id
        self.total_amount = Decimal(str(total_amount))
        self.amount_paid = Decimal(str(amount_paid))
        self.payment_method = payment_method
        self.doctor_share = Decimal(str(doctor_share))
        self.center_share = Decimal(str(center_share))
        self.status = status
    
    def mark_as_paid(self):
        """Mark payment as paid and set paid_at timestamp"""
        self.status = PaymentStatus.PAID
        self.paid_at = datetime.utcnow()
    
    def to_dict(self):
        """Convert payment to dictionary"""
        return {
            'id': self.id,
            'visit_id': self.visit_id,
            'patient_id': self.patient_id,
            'total_amount': float(self.total_amount),
            'amount_paid': float(self.amount_paid),
            'payment_method': self.payment_method.value if self.payment_method else None,
            'status': self.status.value if self.status else None,
            'doctor_share': float(self.doctor_share),
            'center_share': float(self.center_share),
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Payment {self.id} - {self.amount_paid}>'
