from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.schemas import LoginRequest, TokenResponse, RefreshTokenRequest, LogoutRequest
from app.services.auth_service import AuthService
from app.security.dependencies import get_current_user
from app.models.models import AdminUser

router = APIRouter()


def get_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    ip = get_ip(request)
    user_agent = request.headers.get("User-Agent", "")
    return await service.login(data, ip, user_agent)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshTokenRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    return await service.refresh_token(data, get_ip(request))


@router.post("/logout", status_code=204)
async def logout(
    data: LogoutRequest,
    request: Request,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    await service.logout(data.refresh_token, current_user.id, get_ip(request))


@router.get("/me")
async def get_me(current_user: AdminUser = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_active": current_user.is_active,
    }
