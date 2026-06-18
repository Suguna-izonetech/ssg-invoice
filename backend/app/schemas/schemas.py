from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
import re


# Auth Schemas
class LoginRequest(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("Username is required")
        return v.strip()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if not v or len(v) == 0:
            raise ValueError("Password is required")
        return v


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


# Profile Schemas
class ProfileUpdateRequest(BaseModel):
    username: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) < 3:
                raise ValueError("Username must be at least 3 characters")
            if len(v) > 50:
                raise ValueError("Username must be at most 50 characters")
            if not re.match(r'^[a-zA-Z0-9_]+$', v):
                raise ValueError("Username can only contain letters, numbers and underscores")
        return v

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        if v is not None and len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class ProfileResponse(BaseModel):
    id: str
    username: str
    email: str
    has_profile_photo: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Invoice Schemas
VALID_BANKS = [
    'Federal Bank',
    'IndusInd Bank',
    'DCB Bank',
    'Chola Mandalam',
    'SMFG Financial Services',
    'ICICI Bank',
    'Axis Bank',
    'IDFC First Bank',
    'HDFC Bank',
    'Yes Bank',
    'State Bank of India',
    'Kotak Mahindra',
    'HDB Financial Services',
    'Sundaram Finance',
    'Punjab National Bank',
    'Poonawalla Fincorp',
    'REPCO Home Finance',
    'Parimal Finance',
    'Aditya Birla Finance',
    'Equitas',
    'TRU Homes',
    'HomeFirst',
    'Piramal Finance',
    'PNG Housing Finance',
    'Bajaj Finance',
    'L&T Finance',
    'Tata Capital',
    'Godrej Finance',
    'Jana Small Finance Bank',
    'Jayam Finance',
]


class InvoiceCreate(BaseModel):
    bank_name: str
    invoice_date: datetime
    loan_requested_amount: Decimal
    loan_sanctioned_amount: Optional[Decimal] = None

    @field_validator("bank_name")
    @classmethod
    def validate_bank(cls, v):
        if v not in VALID_BANKS:
            raise ValueError(f"Invalid bank. Must be one of: {', '.join(VALID_BANKS)}")
        return v

    @field_validator("loan_requested_amount")
    @classmethod
    def validate_loan_requested(cls, v):
        if v <= 0:
            raise ValueError("Invoice amount must be positive")
        return v

    @field_validator("loan_sanctioned_amount")
    @classmethod
    def validate_loan_sanctioned(cls, v):
        if v is not None and v < 0:
            raise ValueError("Loan sanctioned amount must be non-negative")
        return v


class InvoiceUpdate(BaseModel):
    bank_name: Optional[str] = None
    invoice_date: Optional[datetime] = None
    loan_requested_amount: Optional[Decimal] = None
    loan_sanctioned_amount: Optional[Decimal] = None

    @field_validator("bank_name")
    @classmethod
    def validate_bank(cls, v):
        if v is not None and v not in VALID_BANKS:
            raise ValueError(f"Invalid bank. Must be one of: {', '.join(VALID_BANKS)}")
        return v

    @field_validator("loan_requested_amount")
    @classmethod
    def validate_loan_requested(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Invoice amount must be positive")
        return v

    @field_validator("loan_sanctioned_amount")
    @classmethod
    def validate_loan_sanctioned(cls, v):
        if v is not None and v < 0:
            raise ValueError("Loan sanctioned amount must be non-negative")
        return v


class UploadedFileResponse(BaseModel):
    id: str
    invoice_id: str
    filename: str
    content_type: str
    file_size: int
    uploaded_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    serial_number: int
    financial_year: str
    bank_name: str
    invoice_date: datetime
    loan_requested_amount: Decimal
    loan_sanctioned_amount: Optional[Decimal]
    created_at: datetime
    updated_at: datetime
    uploaded_file: Optional[UploadedFileResponse] = None

    class Config:
        from_attributes = True


class InvoiceListResponse(BaseModel):
    items: List[InvoiceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class InvoiceFilters(BaseModel):
    bank_name: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    loan_requested_min: Optional[Decimal] = None
    loan_requested_max: Optional[Decimal] = None
    loan_sanctioned_min: Optional[Decimal] = None
    loan_sanctioned_max: Optional[Decimal] = None
    search: Optional[str] = None
    sort_by: Optional[str] = "created_at"
    sort_order: Optional[str] = "desc"
    page: int = 1
    page_size: int = 10

    @field_validator("page")
    @classmethod
    def validate_page(cls, v):
        if v < 1:
            raise ValueError("Page must be >= 1")
        return v

    @field_validator("page_size")
    @classmethod
    def validate_page_size(cls, v):
        if v < 1 or v > 100:
            raise ValueError("Page size must be between 1 and 100")
        return v

    @field_validator("sort_order")
    @classmethod
    def validate_sort_order(cls, v):
        if v not in ["asc", "desc"]:
            raise ValueError("Sort order must be 'asc' or 'desc'")
        return v


# Session Schemas
class SessionResponse(BaseModel):
    id: str
    device_fingerprint: str
    device_info: Optional[str]
    ip_address: Optional[str]
    login_at: datetime
    last_activity_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


# Dashboard Schemas
class DashboardStats(BaseModel):
    total_invoices: int
    today_invoices: int
    weekly_invoices: int
    monthly_invoices: int
    total_invoice_amount: Decimal
    total_loan_requested: Decimal
    total_loan_sanctioned: Decimal


class MonthlyTrend(BaseModel):
    month: str
    count: int
    total_amount: Decimal


class WeeklyTrend(BaseModel):
    week: str
    count: int
    total_amount: Decimal


class BankDistribution(BaseModel):
    bank_name: str
    count: int
    total_amount: Decimal


class LoanComparison(BaseModel):
    month: str
    loan_requested: Decimal
    loan_sanctioned: Decimal


class UpcomingInvoiceNumber(BaseModel):
    next_invoice_number: str
    financial_year: str
    next_serial: int
