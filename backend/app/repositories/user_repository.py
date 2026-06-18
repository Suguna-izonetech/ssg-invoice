from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.models.models import AdminUser


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_username(self, username: str) -> Optional[AdminUser]:
        result = await self.db.execute(
            select(AdminUser).where(AdminUser.username == username)
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: str) -> Optional[AdminUser]:
        result = await self.db.execute(
            select(AdminUser).where(AdminUser.id == user_id)
        )
        return result.scalar_one_or_none()

    async def update_profile(
        self,
        user_id: str,
        username: Optional[str] = None,
        hashed_password: Optional[str] = None,
        profile_photo: Optional[bytes] = None,
        profile_photo_content_type: Optional[str] = None,
        clear_photo: bool = False,
    ) -> Optional[AdminUser]:
        user = await self.get_by_id(user_id)
        if not user:
            return None
        if username is not None:
            user.username = username
        if hashed_password is not None:
            user.hashed_password = hashed_password
        if profile_photo is not None:
            user.profile_photo = profile_photo
            user.profile_photo_content_type = profile_photo_content_type
        if clear_photo:
            user.profile_photo = None
            user.profile_photo_content_type = None
        await self.db.flush()
        await self.db.refresh(user)
        return user
