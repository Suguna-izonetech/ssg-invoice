from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.models.models import AdminUser


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: str) -> Optional[AdminUser]:
        result = await self.db.execute(select(AdminUser).where(AdminUser.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> Optional[AdminUser]:
        result = await self.db.execute(select(AdminUser).where(AdminUser.username == username))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[AdminUser]:
        result = await self.db.execute(select(AdminUser).where(AdminUser.email == email))
        return result.scalar_one_or_none()

    async def create(self, username: str, email: str, hashed_password: str) -> AdminUser:
        user = AdminUser(username=username, email=email, hashed_password=hashed_password)
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user
