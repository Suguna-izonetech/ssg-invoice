from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime, timezone

from app.models.models import ActiveSession


class SessionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def count_active_sessions(self, user_id: str) -> int:
        result = await self.db.execute(
            select(func.count()).where(
                ActiveSession.user_id == user_id,
                ActiveSession.is_active == True,
            )
        )
        return result.scalar_one()

    async def get_active_sessions(self, user_id: str) -> List[ActiveSession]:
        result = await self.db.execute(
            select(ActiveSession).where(
                ActiveSession.user_id == user_id,
                ActiveSession.is_active == True,
            ).order_by(ActiveSession.last_activity_at.desc())
        )
        return result.scalars().all()

    async def get_by_id(self, session_id: str) -> Optional[ActiveSession]:
        result = await self.db.execute(
            select(ActiveSession).where(ActiveSession.id == session_id)
        )
        return result.scalar_one_or_none()

    async def get_by_fingerprint(self, user_id: str, fingerprint: str) -> Optional[ActiveSession]:
        result = await self.db.execute(
            select(ActiveSession).where(
                ActiveSession.user_id == user_id,
                ActiveSession.device_fingerprint == fingerprint,
                ActiveSession.is_active == True,
            )
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        user_id: str,
        device_fingerprint: str,
        device_info: Optional[str],
        ip_address: Optional[str],
    ) -> ActiveSession:
        session = ActiveSession(
            user_id=user_id,
            device_fingerprint=device_fingerprint,
            device_info=device_info,
            ip_address=ip_address,
        )
        self.db.add(session)
        await self.db.flush()
        await self.db.refresh(session)
        return session

    async def update_last_activity(self, session_id: str):
        await self.db.execute(
            update(ActiveSession)
            .where(ActiveSession.id == session_id)
            .values(last_activity_at=datetime.now(timezone.utc))
        )

    async def deactivate_session(self, session_id: str):
        await self.db.execute(
            update(ActiveSession)
            .where(ActiveSession.id == session_id)
            .values(is_active=False)
        )

    async def deactivate_all_sessions(self, user_id: str):
        await self.db.execute(
            update(ActiveSession)
            .where(ActiveSession.user_id == user_id, ActiveSession.is_active == True)
            .values(is_active=False)
        )
