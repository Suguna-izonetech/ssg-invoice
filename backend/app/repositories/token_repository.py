from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Optional
from datetime import datetime, timezone

from app.models.models import RefreshToken


class TokenRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: str,
        token_hash: str,
        expires_at: datetime,
        session_id: Optional[str] = None,
    ) -> RefreshToken:
        token = RefreshToken(
            user_id=user_id,
            session_id=session_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.add(token)
        await self.db.flush()
        await self.db.refresh(token)
        return token

    async def get_by_hash(self, token_hash: str) -> Optional[RefreshToken]:
        result = await self.db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def revoke(self, token_id: str, replaced_by: Optional[str] = None):
        values = {"is_revoked": True}
        if replaced_by:
            values["replaced_by"] = replaced_by
        await self.db.execute(
            update(RefreshToken).where(RefreshToken.id == token_id).values(**values)
        )

    async def revoke_all_for_session(self, session_id: str):
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.session_id == session_id, RefreshToken.is_revoked == False)
            .values(is_revoked=True)
        )

    async def revoke_all_for_user(self, user_id: str):
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.is_revoked == False)
            .values(is_revoked=True)
        )

    def is_valid(self, token: RefreshToken) -> bool:
        if token.is_revoked:
            return False
        if token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            return False
        return True
