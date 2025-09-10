"""Add profile fields to user table

Revision ID: 001_profile_fields
Revises: 
Create Date: 2024-01-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_profile_fields'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new profile fields to users table
    op.add_column('users', sa.Column('age', sa.Integer(), nullable=True))
    op.add_column('users', sa.Column('victim_housing', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('has_trusted_support', sa.Boolean(), nullable=True))
    op.add_column('users', sa.Column('default_confidentiality', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('default_share_with', sa.String(length=255), nullable=True))
    
    # Update existing columns to match new lengths
    op.alter_column('users', 'relationship_status', type_=sa.String(length=100))


def downgrade() -> None:
    # Remove the added profile fields
    op.drop_column('users', 'default_share_with')
    op.drop_column('users', 'default_confidentiality')
    op.drop_column('users', 'has_trusted_support')
    op.drop_column('users', 'victim_housing')
    op.drop_column('users', 'age')
    
    # Revert relationship_status column length
    op.alter_column('users', 'relationship_status', type_=sa.String(length=50))