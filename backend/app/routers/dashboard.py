from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.security.dependencies import get_current_user
from app.models.models import AdminUser
from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.schemas import InvoiceResponse

router = APIRouter()


@router.get("/stats")
async def get_stats(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = DashboardRepository(db)
    return await repo.get_stats()


@router.get("/monthly-trends")
async def get_monthly_trends(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = DashboardRepository(db)
    return await repo.get_monthly_trends()


@router.get("/weekly-trends")
async def get_weekly_trends(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = DashboardRepository(db)
    return await repo.get_weekly_trends()


@router.get("/bank-distribution")
async def get_bank_distribution(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = DashboardRepository(db)
    return await repo.get_bank_distribution()


@router.get("/loan-comparison")
async def get_loan_comparison(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = DashboardRepository(db)
    return await repo.get_loan_comparison()


@router.get("/recent-invoices")
async def get_recent_invoices(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = DashboardRepository(db)
    items = await repo.get_recent_invoices(limit=10)
    return [InvoiceResponse.model_validate(i) for i in items]


@router.get("/upcoming-invoices")
async def get_upcoming_invoices(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = DashboardRepository(db)
    items = await repo.get_upcoming_invoices(limit=10)
    return [InvoiceResponse.model_validate(i) for i in items]
