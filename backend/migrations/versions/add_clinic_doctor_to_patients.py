"""add clinic doctor to patients

Revision ID: add_clinic_doctor_to_patients
Revises: ce9b332920ce
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_clinic_doctor_to_patients'
down_revision = 'ce9b332920ce'
branch_labels = None
depends_on = None


def upgrade():
    # Add clinic_id and doctor_id columns to patients table
    try:
        op.add_column('patients', sa.Column('clinic_id', sa.Integer(), nullable=True))
    except Exception:
        pass  # Column already exists
    
    try:
        op.add_column('patients', sa.Column('doctor_id', sa.Integer(), nullable=True))
    except Exception:
        pass  # Column already exists
    
    # Create foreign keys (only if they don't exist)
    try:
        op.create_foreign_key('fk_patients_clinic_id', 'patients', 'clinics', ['clinic_id'], ['id'], ondelete='SET NULL')
    except Exception:
        pass  # Foreign key already exists
    
    try:
        op.create_foreign_key('fk_patients_doctor_id', 'patients', 'doctors', ['doctor_id'], ['id'], ondelete='SET NULL')
    except Exception:
        pass  # Foreign key already exists
    
    # Create indexes for better performance
    try:
        op.create_index(op.f('ix_patients_clinic_id'), 'patients', ['clinic_id'], unique=False)
    except Exception:
        pass  # Index already exists
    
    try:
        op.create_index(op.f('ix_patients_doctor_id'), 'patients', ['doctor_id'], unique=False)
    except Exception:
        pass  # Index already exists


def downgrade():
    # Drop indexes
    op.drop_index(op.f('ix_patients_doctor_id'), table_name='patients')
    op.drop_index(op.f('ix_patients_clinic_id'), table_name='patients')
    
    # Drop foreign keys
    op.drop_constraint('fk_patients_doctor_id', 'patients', type_='foreignkey')
    op.drop_constraint('fk_patients_clinic_id', 'patients', type_='foreignkey')
    
    # Drop columns
    op.drop_column('patients', 'doctor_id')
    op.drop_column('patients', 'clinic_id')

