#!/usr/bin/env python3
"""Seed the database with initial admin user."""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.models.models import AdminUser, InvoiceSequence
from app.security.security import hash_password


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with SessionLocal() as db:
        # Check if admin exists
        result = await db.execute(select(AdminUser).where(AdminUser.username == settings.ADMIN_USERNAME))
        existing = result.scalar_one_or_none()

        if not existing:
            admin = AdminUser(
                username=settings.ADMIN_USERNAME,
                email=settings.ADMIN_EMAIL,
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                is_active=True,
            )
            db.add(admin)
            await db.commit()
            print(f"✅ Admin user created: {settings.ADMIN_USERNAME}")
        else:
            print(f"ℹ️  Admin user already exists: {settings.ADMIN_USERNAME}")

        # Seed current financial year sequence
        from datetime import datetime
        now = datetime.now()
        if now.month >= 4:
            fy = f"{str(now.year)[2:]}-{str(now.year + 1)[2:]}"
        else:
            fy = f"{str(now.year - 1)[2:]}-{str(now.year)[2:]}"

        result = await db.execute(
            select(InvoiceSequence).where(InvoiceSequence.financial_year == fy)
        )
        seq = result.scalar_one_or_none()
        if not seq:
            seq = InvoiceSequence(financial_year=fy, last_sequence=0)
            db.add(seq)
            await db.commit()
            print(f"✅ Invoice sequence created for FY {fy}")
        else:
            print(f"ℹ️  Invoice sequence already exists for FY {fy}")

    await engine.dispose()
    print("🎉 Seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed())
