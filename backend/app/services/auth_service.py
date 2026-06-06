from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.schemas.schemas import LoginRequest, TokenResponse, RefreshTokenRequest
from app.repositories.user_repository import UserRepository
from app.repositories.token_repository import TokenRepository
from app.repositories.audit_repository import AuditRepository
from app.security.security import (
    verify_password, create_access_token, create_refresh_token,
    hash_token, get_token_expiry
)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.token_repo = TokenRepository(db)
        self.audit_repo = AuditRepository(db)

    async def login(
        self,
        data: LoginRequest,
        ip_address: str,
        user_agent: str,
    ) -> TokenResponse:

        user = await self.user_repo.get_by_username(data.username)

        if not user or not verify_password(data.password, user.hashed_password):
            await self.audit_repo.log(
                action="login_failed",
                ip_address=ip_address,
                user_agent=user_agent,
                details=f"Failed login for username: {data.username}",
                status="failed",
            )

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled",
            )

        raw_refresh, refresh_hash = create_refresh_token()

        access_token = create_access_token(
            data={
                "sub": str(user.id),
                "username": user.username,
            }
        )

        await self.token_repo.create(
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=get_token_expiry(
                days=settings.REFRESH_TOKEN_EXPIRE_DAYS
            ),
            session_id=None,
        )

        await self.audit_repo.log(
            action="login_success",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def refresh_token(self, data: RefreshTokenRequest, ip_address: str) -> TokenResponse:
        token_hash = hash_token(data.refresh_token)
        stored_token = await self.token_repo.get_by_hash(token_hash)

        if not stored_token or not self.token_repo.is_valid(stored_token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        user = await self.user_repo.get_by_id(stored_token.user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        # Refresh token rotation - revoke old
        await self.token_repo.revoke(stored_token.id)

        # Create new tokens
        raw_refresh, refresh_hash = create_refresh_token()
        access_token = create_access_token(
            data={
                "sub": str(user.id),
                "username": user.username,
            }
       )
        new_token = await self.token_repo.create(
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=get_token_expiry(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            session_id=None,
        )

        # Update replaced_by reference
        await self.token_repo.revoke(stored_token.id, replaced_by=new_token.id)

        

        return TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def logout(self, refresh_token: str, user_id: str, ip_address: str):
        token_hash = hash_token(refresh_token)
        stored_token = await self.token_repo.get_by_hash(token_hash)

        if stored_token and stored_token.user_id == user_id:
            await self.token_repo.revoke(stored_token.id)

        await self.audit_repo.log(
            action="logout",
            user_id=user_id,
            ip_address=ip_address,
        )
