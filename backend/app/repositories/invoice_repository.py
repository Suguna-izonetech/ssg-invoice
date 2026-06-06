from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete, and_, or_, desc, asc
from sqlalchemy.orm import selectinload
from typing import Optional, List, Tuple
from decimal import Decimal
from datetime import datetime

from app.models.models import Invoice, UploadedFile, InvoiceSequence
from app.schemas.schemas import InvoiceFilters

from sqlalchemy import select
from sqlalchemy.orm import selectinload


class InvoiceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_next_invoice_number(self, financial_year: str) -> Tuple[str, int]:
        """Atomically get and increment invoice sequence for financial year."""
        result = await self.db.execute(
            select(InvoiceSequence).where(InvoiceSequence.financial_year == financial_year).with_for_update()
        )
        seq = result.scalar_one_or_none()
        if not seq:
            seq = InvoiceSequence(financial_year=financial_year, last_sequence=0)
            self.db.add(seq)
            await self.db.flush()

        seq.last_sequence += 1
        serial = seq.last_sequence
        invoice_number = f"SSG/{financial_year}/{str(serial).zfill(5)}"
        return invoice_number, serial

    def _get_financial_year(self, date: datetime) -> str:
        if date.month >= 4:
            return f"{str(date.year)[2:]}-{str(date.year + 1)[2:]}"
        return f"{str(date.year - 1)[2:]}-{str(date.year)[2:]}"

    async def create(
        self,
        bank_name: str,
        invoice_date: datetime,
        loan_requested_amount: Decimal,
        loan_sanctioned_amount: Optional[Decimal],
    ) -> Invoice:
        financial_year = self._get_financial_year(invoice_date)
        invoice_number, serial_number = await self.get_next_invoice_number(financial_year)

        invoice = Invoice(
            invoice_number=invoice_number,
            serial_number=serial_number,
            financial_year=financial_year,
            bank_name=bank_name,
            invoice_date=invoice_date,
            loan_requested_amount=loan_requested_amount,
            loan_sanctioned_amount=loan_sanctioned_amount,
        )
        self.db.add(invoice)
        await self.db.flush()
        # await self.db.refresh(invoice)
        # return invoice
        result = await self.db.execute(
            select(Invoice)
            .options(selectinload(Invoice.uploaded_file))
            .where(Invoice.id == invoice.id)
        )

        return result.scalar_one()
    async def get_by_id(self, invoice_id: str) -> Optional[Invoice]:
        result = await self.db.execute(
            select(Invoice)
            .options(selectinload(Invoice.uploaded_file))
            .where(Invoice.id == invoice_id)
        )
        return result.scalar_one_or_none()

    async def update(self, invoice_id: str, **kwargs) -> Optional[Invoice]:
        await self.db.execute(
            update(Invoice).where(Invoice.id == invoice_id).values(**kwargs)
        )
        return await self.get_by_id(invoice_id)

    async def delete(self, invoice_id: str):
        await self.db.execute(delete(Invoice).where(Invoice.id == invoice_id))

    async def list_with_filters(self, filters: InvoiceFilters) -> Tuple[List[Invoice], int]:
        query = select(Invoice).options(selectinload(Invoice.uploaded_file))
        count_query = select(func.count()).select_from(Invoice)

        conditions = []

        if filters.bank_name:
            conditions.append(Invoice.bank_name == filters.bank_name)
        if filters.date_from:
            conditions.append(Invoice.invoice_date >= filters.date_from)
        if filters.date_to:
            conditions.append(Invoice.invoice_date <= filters.date_to)
        if filters.loan_requested_min is not None:
            conditions.append(Invoice.loan_requested_amount >= filters.loan_requested_min)
        if filters.loan_requested_max is not None:
            conditions.append(Invoice.loan_requested_amount <= filters.loan_requested_max)
        if filters.loan_sanctioned_min is not None:
            conditions.append(Invoice.loan_sanctioned_amount >= filters.loan_sanctioned_min)
        if filters.loan_sanctioned_max is not None:
            conditions.append(Invoice.loan_sanctioned_amount <= filters.loan_sanctioned_max)
        if filters.search:
            search_term = f"%{filters.search}%"
            conditions.append(
                or_(
                    Invoice.invoice_number.ilike(search_term),
                    Invoice.bank_name.ilike(search_term),
                )
            )

        if conditions:
            query = query.where(and_(*conditions))
            count_query = count_query.where(and_(*conditions))

        # Sorting
        sort_col_map = {
            "created_at": Invoice.created_at,
            "invoice_date": Invoice.invoice_date,
            "loan_requested_amount": Invoice.loan_requested_amount,
            "loan_sanctioned_amount": Invoice.loan_sanctioned_amount,
            "invoice_number": Invoice.invoice_number,
            "bank_name": Invoice.bank_name,
        }
        sort_col = sort_col_map.get(filters.sort_by, Invoice.created_at)
        if filters.sort_order == "asc":
            query = query.order_by(asc(sort_col))
        else:
            query = query.order_by(desc(sort_col))

        # Count
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        # Pagination
        offset = (filters.page - 1) * filters.page_size
        query = query.offset(offset).limit(filters.page_size)

        result = await self.db.execute(query)
        items = result.scalars().all()

        return items, total

    async def get_all_for_export(self, filters: InvoiceFilters) -> List[Invoice]:
        query = select(Invoice).options(selectinload(Invoice.uploaded_file))
        conditions = []

        if filters.bank_name:
            conditions.append(Invoice.bank_name == filters.bank_name)
        if filters.date_from:
            conditions.append(Invoice.invoice_date >= filters.date_from)
        if filters.date_to:
            conditions.append(Invoice.invoice_date <= filters.date_to)
        if filters.search:
            search_term = f"%{filters.search}%"
            conditions.append(
                or_(
                    Invoice.invoice_number.ilike(search_term),
                    Invoice.bank_name.ilike(search_term),
                )
            )

        if conditions:
            query = query.where(and_(*conditions))

        query = query.order_by(desc(Invoice.created_at))
        result = await self.db.execute(query)
        return result.scalars().all()


class FileRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        invoice_id: str,
        filename: str,
        content_type: str,
        file_size: int,
        file_data: bytes,
    ) -> UploadedFile:
        file = UploadedFile(
            invoice_id=invoice_id,
            filename=filename,
            content_type=content_type,
            file_size=file_size,
            file_data=file_data,
        )
        self.db.add(file)
        await self.db.flush()
        await self.db.refresh(file)
        return file

    async def get_by_invoice_id(self, invoice_id: str) -> Optional[UploadedFile]:
        result = await self.db.execute(
            select(UploadedFile).where(UploadedFile.invoice_id == invoice_id)
        )
        return result.scalar_one_or_none()

    async def update(
        self,
        file_id: str,
        filename: str,
        content_type: str,
        file_size: int,
        file_data: bytes,
    ) -> Optional[UploadedFile]:
        await self.db.execute(
            update(UploadedFile)
            .where(UploadedFile.id == file_id)
            .values(
                filename=filename,
                content_type=content_type,
                file_size=file_size,
                file_data=file_data,
            )
        )
        result = await self.db.execute(
            select(UploadedFile).where(UploadedFile.id == file_id)
        )
        return result.scalar_one_or_none()

    async def delete(self, file_id: str):
        await self.db.execute(delete(UploadedFile).where(UploadedFile.id == file_id))
