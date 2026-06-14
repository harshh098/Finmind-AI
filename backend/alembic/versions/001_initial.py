"""initial

Revision ID: 001
Revises: 
Create Date: 2026-06-14

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=150), nullable=False),
        sa.Column('mobile', sa.String(length=20), nullable=True),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # accounts
    op.create_table('accounts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('account_no', sa.String(length=20), nullable=False),
        sa.Column('account_type', sa.String(length=30), nullable=True),
        sa.Column('balance', sa.Numeric(15, 2), nullable=True),
        sa.Column('currency', sa.String(length=5), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('account_no'),
    )
    op.create_index(op.f('ix_accounts_id'), 'accounts', ['id'], unique=False)

    # transactions
    op.create_table('transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('sender', sa.String(length=100), nullable=True),
        sa.Column('receiver', sa.String(length=100), nullable=True),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column('date', sa.Date(), server_default=sa.text('CURRENT_DATE'), nullable=False),
        sa.Column('fraud_score', sa.Float(), nullable=True),
        sa.Column('fraud_flags', sa.JSON(), nullable=True),
        sa.Column('is_flagged', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_transactions_id'), 'transactions', ['id'], unique=False)

    # fraud_logs
    op.create_table('fraud_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('transaction_id', sa.Integer(), nullable=True),
        sa.Column('rule_id', sa.String(length=10), nullable=True),
        sa.Column('rule_desc', sa.Text(), nullable=True),
        sa.Column('severity', sa.String(length=10), nullable=True),
        sa.Column('ml_score', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_fraud_logs_id'), 'fraud_logs', ['id'], unique=False)

    # beneficiaries
    op.create_table('beneficiaries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('account_no', sa.String(length=13), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_beneficiaries_id'), 'beneficiaries', ['id'], unique=False)

    # security_questions
    op.create_table('security_questions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('question', sa.String(length=255), nullable=False),
        sa.Column('answer_hash', sa.String(), nullable=False),
        sa.Column('failed_attempts', sa.Integer(), nullable=True),
        sa.Column('is_temporarily_locked', sa.Boolean(), nullable=True),
        sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_index(op.f('ix_security_questions_id'), 'security_questions', ['id'], unique=False)

    # reminders
    op.create_table('reminders',
        sa.Column('rid', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('task', sa.Text(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('time', sa.Time(), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('related_to', sa.Text(), nullable=True),
        sa.Column('notify_before_min', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('rid'),
    )
    op.create_index(op.f('ix_reminders_rid'), 'reminders', ['rid'], unique=False)

    # otp_sessions
    op.create_table('otp_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('otp', sa.String(length=6), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_otp_sessions_id'), 'otp_sessions', ['id'], unique=False)


def downgrade() -> None:
    op.drop_table('otp_sessions')
    op.drop_table('reminders')
    op.drop_table('security_questions')
    op.drop_table('beneficiaries')
    op.drop_table('fraud_logs')
    op.drop_table('transactions')
    op.drop_table('accounts')
    op.drop_table('users')