from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.security.dependencies import get_current_user
from app.models.models import AdminUser
from app.repositories.session_repository import SessionRepository
from app.repositories.token_repository import TokenRepository
from app.schemas.schemas import SessionResponse

router = APIRouter()


@router.get("", response_model=List[SessionResponse])
async def get_active_sessions(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SessionRepository(db)
    sessions = await repo.get_active_sessions(current_user.id)
    return [SessionResponse.model_validate(s) for s in sessions]


@router.delete("/{session_id}", status_code=204)
async def revoke_session(
    session_id: str,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session_repo = SessionRepository(db)
    token_repo = TokenRepository(db)

    session = await session_repo.get_by_id(session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    await token_repo.revoke_all_for_session(session_id)
    await session_repo.deactivate_session(session_id)
