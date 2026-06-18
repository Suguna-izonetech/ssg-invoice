from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract, text
from datetime import datetime, timezone, timedelta
from typing import List
from decimal import Decimal

from app.models.models import Invoice, ActiveSession, InvoiceSequence


class DashboardRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _get_financial_year(self, date: datetime) -> str:
        if date.month >= 4:
            return f"{str(date.year)[2:]}-{str(date.year + 1)[2:]}"
        return f"{str(date.year - 1)[2:]}-{str(date.year)[2:]}"

    async def get_stats(self) -> dict:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())
        month_start = today_start.replace(day=1)

        total = await self.db.execute(select(func.count(Invoice.id)))
        total_count = total.scalar_one()

        today = await self.db.execute(
            select(func.count(Invoice.id)).where(Invoice.invoice_date >= today_start)
        )
        today_count = today.scalar_one()

        weekly = await self.db.execute(
            select(func.count(Invoice.id)).where(Invoice.invoice_date >= week_start)
        )
        weekly_count = weekly.scalar_one()

        monthly = await self.db.execute(
            select(func.count(Invoice.id)).where(Invoice.invoice_date >= month_start)
        )
        monthly_count = monthly.scalar_one()

        amounts = await self.db.execute(
            select(
                func.coalesce(func.sum(Invoice.loan_requested_amount), 0),
                func.coalesce(func.sum(Invoice.loan_sanctioned_amount), 0),
            )
        )
        req_sum, sanc_sum = amounts.one()

        return {
            "total_invoices": total_count,
            "today_invoices": today_count,
            "weekly_invoices": weekly_count,
            "monthly_invoices": monthly_count,
            "total_invoice_amount": Decimal(str(req_sum)),
            "total_loan_requested": Decimal(str(req_sum)),
            "total_loan_sanctioned": Decimal(str(sanc_sum)),
        }

    async def get_monthly_trends(self) -> List[dict]:
        month_trunc = func.date_trunc('month', Invoice.invoice_date)
        result = await self.db.execute(
            select(
                func.to_char(month_trunc, 'Mon YYYY').label('month'),
                func.to_char(month_trunc, 'YYYY-MM').label('sort_key'),
                func.count(Invoice.id).label('count'),
                func.coalesce(func.sum(Invoice.loan_requested_amount), 0).label('total_amount'),
            )
            .group_by(month_trunc)
            .order_by(month_trunc.desc())
            .limit(12)
        )
        rows = result.all()
        return [
            {'month': r.month, 'count': r.count, 'total_amount': Decimal(str(r.total_amount))}
            for r in reversed(rows)
        ]

    async def get_weekly_trends(self) -> List[dict]:
        week_trunc = func.date_trunc('week', Invoice.invoice_date)
        result = await self.db.execute(
            select(
                func.to_char(week_trunc, 'IW IYYY').label('week'),
                func.to_char(week_trunc, 'IYYY-IW').label('sort_key'),
                func.count(Invoice.id).label('count'),
                func.coalesce(func.sum(Invoice.loan_requested_amount), 0).label('total_amount'),
            )
            .group_by(week_trunc)
            .order_by(week_trunc.desc())
            .limit(8)
        )
        rows = result.all()
        return [
            {'week': f'Week {r.week}', 'count': r.count, 'total_amount': Decimal(str(r.total_amount))}
            for r in reversed(rows)
        ]

    async def get_bank_distribution(self) -> List[dict]:
        result = await self.db.execute(
            select(
                Invoice.bank_name,
                func.count(Invoice.id).label("count"),
                func.coalesce(func.sum(Invoice.loan_requested_amount), 0).label("total_amount"),
            )
            .group_by(Invoice.bank_name)
            .order_by(func.count(Invoice.id).desc())
        )
        rows = result.all()
        return [
            {"bank_name": r.bank_name, "count": r.count, "total_amount": Decimal(str(r.total_amount))}
            for r in rows
        ]

    async def get_loan_comparison(self) -> List[dict]:
        month_trunc = func.date_trunc('month', Invoice.invoice_date)
        result = await self.db.execute(
            select(
                func.to_char(month_trunc, 'Mon YYYY').label('month'),
                func.to_char(month_trunc, 'YYYY-MM').label('sort_key'),
                func.coalesce(func.sum(Invoice.loan_requested_amount), 0).label('loan_requested'),
                func.coalesce(func.sum(Invoice.loan_sanctioned_amount), 0).label('loan_sanctioned'),
            )
            .group_by(month_trunc)
            .order_by(month_trunc.desc())
            .limit(12)
        )
        rows = result.all()
        return [
            {
                'month': r.month,
                'loan_requested': Decimal(str(r.loan_requested)),
                'loan_sanctioned': Decimal(str(r.loan_sanctioned)),
            }
            for r in reversed(rows)
        ]

    async def get_recent_invoices(self, limit: int = 5):
        from sqlalchemy.orm import selectinload
        result = await self.db.execute(
            select(Invoice)
            .options(selectinload(Invoice.uploaded_file))
            .order_by(Invoice.created_at.desc())
            .limit(limit)
        )
        return result.scalars().all()

    async def get_upcoming_invoice_number(self) -> dict:
        """Calculate the next invoice number that would be generated."""
        now = datetime.now(timezone.utc)
        financial_year = self._get_financial_year(now)

        # Get the current sequence for this financial year
        result = await self.db.execute(
            select(InvoiceSequence).where(InvoiceSequence.financial_year == financial_year)
        )
        seq = result.scalar_one_or_none()

        current_last = seq.last_sequence if seq else 0
        next_serial = current_last + 1
        next_invoice_number = f"SSG/{financial_year}/{str(next_serial).zfill(5)}"

        return {
            "next_invoice_number": next_invoice_number,
            "financial_year": financial_year,
            "next_serial": next_serial,
        }
