"""Initial migration

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'admin_users',
        sa.Column('id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('username', sa.String(50), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username'),
        sa.UniqueConstraint('email'),
    )
    op.create_index('ix_admin_users_username', 'admin_users', ['username'])
    op.create_index('ix_admin_users_email', 'admin_users', ['email'])

    op.create_table(
        'active_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('device_fingerprint', sa.String(255), nullable=False),
        sa.Column('device_info', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('login_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('last_activity_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['user_id'], ['admin_users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_active_sessions_user_active', 'active_sessions', ['user_id', 'is_active'])

    op.create_table(
        'refresh_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('session_id', postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column('token_hash', sa.String(255), nullable=False),
        sa.Column('is_revoked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('replaced_by', postgresql.UUID(as_uuid=False), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['admin_users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['session_id'], ['active_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token_hash'),
    )
    op.create_index('ix_refresh_tokens_user_id', 'refresh_tokens', ['user_id'])
    op.create_index('ix_refresh_tokens_session_id', 'refresh_tokens', ['session_id'])
    op.create_index('ix_refresh_tokens_token_hash', 'refresh_tokens', ['token_hash'])

    op.create_table(
        'invoice_sequences',
        sa.Column('id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('financial_year', sa.String(10), nullable=False),
        sa.Column('last_sequence', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('financial_year'),
    )
    op.create_index('ix_invoice_sequences_financial_year', 'invoice_sequences', ['financial_year'])

    op.create_table(
        'invoices',
        sa.Column('id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('invoice_number', sa.String(50), nullable=False),
        sa.Column('serial_number', sa.Integer(), nullable=False),
        sa.Column('financial_year', sa.String(10), nullable=False),
        sa.Column('bank_name', sa.String(20), nullable=False),
        sa.Column('invoice_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('loan_requested_amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('loan_sanctioned_amount', sa.Numeric(15, 2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('invoice_number'),
    )
    op.create_index('ix_invoices_invoice_number', 'invoices', ['invoice_number'])
    op.create_index('ix_invoices_bank_name', 'invoices', ['bank_name'])
    op.create_index('ix_invoices_invoice_date', 'invoices', ['invoice_date'])
    op.create_index('ix_invoices_created_at', 'invoices', ['created_at'])
    op.create_index('ix_invoices_bank_date', 'invoices', ['bank_name', 'invoice_date'])
    op.create_index('ix_invoices_financial_year', 'invoices', ['financial_year'])

    op.create_table(
        'uploaded_files',
        sa.Column('id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('invoice_id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('content_type', sa.String(100), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('file_data', sa.LargeBinary(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('invoice_id'),
    )
    op.create_index('ix_uploaded_files_invoice_id', 'uploaded_files', ['invoice_id'])

    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('resource_type', sa.String(50), nullable=True),
        sa.Column('resource_id', sa.String(255), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='success'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])
    op.create_index('ix_audit_logs_user_action', 'audit_logs', ['user_id', 'action'])


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('uploaded_files')
    op.drop_table('invoices')
    op.drop_table('invoice_sequences')
    op.drop_table('refresh_tokens')
    op.drop_table('active_sessions')
    op.drop_table('admin_users')
