"""add called_time to visits

Revision ID: add_called_time_to_visits
Revises: add_performance_indexes
Create Date: 2025-10-26 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite


# revision identifiers, used by Alembic.
revision = 'add_called_time_to_visits'
down_revision = 'add_performance_indexes'
branch_labels = None
depends_on = None


def upgrade():
    # Add called_time column to visits table
    op.add_column('visits', sa.Column('called_time', sa.DateTime(), nullable=True))


def downgrade():
    # Remove called_time column from visits table
    op.drop_column('visits', 'called_time')

