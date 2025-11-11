"""add is_active to doctors

Revision ID: add_is_active_to_doctors
Revises: add_clinic_doctor_to_patients
Create Date: 2025-01-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite


# revision identifiers, used by Alembic.
revision = 'add_is_active_to_doctors'
down_revision = 'add_clinic_doctor_to_patients'
branch_labels = None
depends_on = None


def upgrade():
    # Add is_active column to doctors table with default True
    op.add_column('doctors', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'))


def downgrade():
    # Remove is_active column from doctors table
    op.drop_column('doctors', 'is_active')

