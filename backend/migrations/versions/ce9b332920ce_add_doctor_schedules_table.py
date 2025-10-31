"""add_doctor_schedules_table

Revision ID: ce9b332920ce
Revises: add_called_time_to_visits
Create Date: 2025-10-27 23:49:07.472621

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ce9b332920ce'
down_revision = 'add_called_time_to_visits'
branch_labels = None
depends_on = None


def upgrade():
    # Create doctor_schedules table
    op.create_table(
        'doctor_schedules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('doctor_id', sa.Integer(), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.Column('hour', sa.Integer(), nullable=False),
        sa.Column('is_available', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['doctor_id'], ['doctors.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('doctor_id', 'day_of_week', 'hour', name='_doctor_day_hour_uc')
    )
    
    # Create indexes
    op.create_index('idx_doctor_schedule_availability', 'doctor_schedules', ['doctor_id', 'day_of_week', 'hour'])
    op.create_index(op.f('ix_doctor_schedules_doctor_id'), 'doctor_schedules', ['doctor_id'], unique=False)


def downgrade():
    # Drop indexes
    op.drop_index(op.f('ix_doctor_schedules_doctor_id'), table_name='doctor_schedules')
    op.drop_index('idx_doctor_schedule_availability', table_name='doctor_schedules')
    
    # Drop table
    op.drop_table('doctor_schedules')
