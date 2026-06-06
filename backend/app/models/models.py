import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, DateTime, Boolean, Integer, LargeBinary,
    Numeric, ForeignKey, Text, Index, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    active_sessions = relationship("ActiveSession", back_populates="user", cascade="all, delete-orphan")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    serial_number = Column(Integer, nullable=False)
    financial_year = Column(String(10), nullable=False)
    bank_name = Column(String(20), nullable=False, index=True)
    invoice_date = Column(DateTime(timezone=True), nullable=False, index=True)
    loan_requested_amount = Column(Numeric(15, 2), nullable=False)
    loan_sanctioned_amount = Column(Numeric(15, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    uploaded_file = relationship("UploadedFile", back_populates="invoice", uselist=False, cascade="all, delete-orphan",lazy="selectin")

    __table_args__ = (
        Index("ix_invoices_bank_date", "bank_name", "invoice_date"),
        Index("ix_invoices_financial_year", "financial_year"),
    )


class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    invoice_id = Column(UUID(as_uuid=False), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_data = Column(LargeBinary, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    invoice = relationship("Invoice", back_populates="uploaded_file",lazy="selectin")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("admin_users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(UUID(as_uuid=False), ForeignKey("active_sessions.id", ondelete="CASCADE"), nullable=True, index=True)
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    is_revoked = Column(Boolean, default=False, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    replaced_by = Column(UUID(as_uuid=False), nullable=True)

    user = relationship("AdminUser", back_populates="refresh_tokens")


class ActiveSession(Base):
    __tablename__ = "active_sessions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("admin_users.id", ondelete="CASCADE"), nullable=False, index=True)
    device_fingerprint = Column(String(255), nullable=False)
    device_info = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    login_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True, nullable=False)

    user = relationship("AdminUser", back_populates="active_sessions")

    __table_args__ = (
        Index("ix_active_sessions_user_active", "user_id", "is_active"),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    details = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="success")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        Index("ix_audit_logs_user_action", "user_id", "action"),
        Index("ix_audit_logs_created_at", "created_at"),
    )


class InvoiceSequence(Base):
    __tablename__ = "invoice_sequences"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    financial_year = Column(String(10), unique=True, nullable=False, index=True)
    last_sequence = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
