from fastapi import APIRouter, Depends, UploadFile, File, Request, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime
from decimal import Decimal

from app.core.database import get_db
from app.security.dependencies import get_current_user
from app.models.models import AdminUser
from app.schemas.schemas import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceListResponse, InvoiceFilters, UploadedFileResponse
)
from app.services.invoice_service import InvoiceService

router = APIRouter()


def get_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("", response_model=InvoiceResponse, status_code=201)
async def create_invoice(
    data: InvoiceCreate,
    request: Request,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InvoiceService(db)
    return await service.create_invoice(data, current_user.id, get_ip(request))


@router.get("", response_model=InvoiceListResponse)
async def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    bank_name: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    loan_requested_min: Optional[Decimal] = None,
    loan_requested_max: Optional[Decimal] = None,
    loan_sanctioned_min: Optional[Decimal] = None,
    loan_sanctioned_max: Optional[Decimal] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = InvoiceFilters(
        page=page,
        page_size=page_size,
        bank_name=bank_name,
        date_from=date_from,
        date_to=date_to,
        loan_requested_min=loan_requested_min,
        loan_requested_max=loan_requested_max,
        loan_sanctioned_min=loan_sanctioned_min,
        loan_sanctioned_max=loan_sanctioned_max,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    service = InvoiceService(db)
    return await service.list_invoices(filters)


@router.get("/export/csv")
async def export_csv(
    bank_name: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = InvoiceFilters(
        bank_name=bank_name, date_from=date_from, date_to=date_to,
        search=search, page=1, page_size=10,
    )
    service = InvoiceService(db)
    csv_data = await service.export_csv(filters)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=invoices.csv"},
    )


@router.get("/export/excel")
async def export_excel(
    bank_name: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = InvoiceFilters(
        bank_name=bank_name, date_from=date_from, date_to=date_to,
        search=search, page=1, page_size=10,
    )
    service = InvoiceService(db)
    excel_data = await service.export_excel(filters)
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=invoices.xlsx"},
    )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InvoiceService(db)
    return await service.get_invoice(invoice_id)


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: str,
    data: InvoiceUpdate,
    request: Request,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InvoiceService(db)
    return await service.update_invoice(invoice_id, data, current_user.id, get_ip(request))


@router.delete("/{invoice_id}", status_code=204)
async def delete_invoice(
    invoice_id: str,
    request: Request,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InvoiceService(db)
    await service.delete_invoice(invoice_id, current_user.id, get_ip(request))


@router.post("/{invoice_id}/file", response_model=UploadedFileResponse)
async def upload_file(
    invoice_id: str,
    request: Request,
    file: UploadFile = File(...),
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InvoiceService(db)
    return await service.upload_file(invoice_id, file, current_user.id, get_ip(request))


@router.get("/{invoice_id}/file/download")
async def download_file(
    invoice_id: str,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InvoiceService(db)
    file = await service.get_file(invoice_id)
    return Response(
        content=file.file_data,
        media_type=file.content_type,
        headers={"Content-Disposition": f"attachment; filename={file.filename}"},
    )


@router.get("/{invoice_id}/file/view")
async def view_file(
    invoice_id: str,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InvoiceService(db)
    file = await service.get_file(invoice_id)
    return Response(
        content=file.file_data,
        media_type=file.content_type,
        headers={"Content-Disposition": f"inline; filename={file.filename}"},
    )
