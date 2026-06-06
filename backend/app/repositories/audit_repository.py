from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.models.models import AuditLog


class AuditRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        action: str,
        user_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[str] = None,
        status: str = "success",
    ):
        log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details,
            status=status,
        )
        self.db.add(log)
        await self.db.flush()
