from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError
from datetime import datetime, timezone

from app.core.database import get_db
from app.security.security import decode_access_token
from app.repositories.user_repository import UserRepository
from app.repositories.session_repository import SessionRepository

bearer_scheme = HTTPBearer()


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(credentials.credentials)
        user_id: str = payload.get("sub")
        session_id: str = payload.get("session_id")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if user is None or not user.is_active:
        raise credentials_exception

    # Update session last activity
    if session_id:
        session_repo = SessionRepository(db)
        await session_repo.update_last_activity(session_id)

    return user
