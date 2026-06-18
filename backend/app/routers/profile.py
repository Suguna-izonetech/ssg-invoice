from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.security.dependencies import get_current_user
from app.security.security import verify_password, hash_password
from app.models.models import AdminUser
from app.repositories.user_repository import UserRepository
from app.schemas.schemas import ProfileUpdateRequest, ProfileResponse

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_PHOTO_SIZE = 5 * 1024 * 1024  # 5MB


@router.get("", response_model=ProfileResponse)
async def get_profile(
    current_user: AdminUser = Depends(get_current_user),
):
    return ProfileResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        has_profile_photo=current_user.profile_photo is not None,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
    )


@router.put("", response_model=ProfileResponse)
async def update_profile(
    data: ProfileUpdateRequest,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)

    # Validate current password if changing password
    if data.new_password:
        if not data.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is required to set a new password",
            )
        if not verify_password(data.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect",
            )

    # Check username uniqueness
    if data.username and data.username != current_user.username:
        existing = await repo.get_by_username(data.username)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already taken",
            )

    hashed_pw = hash_password(data.new_password) if data.new_password else None

    updated = await repo.update_profile(
        user_id=current_user.id,
        username=data.username,
        hashed_password=hashed_pw,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return ProfileResponse(
        id=updated.id,
        username=updated.username,
        email=updated.email,
        has_profile_photo=updated.profile_photo is not None,
        is_active=updated.is_active,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
    )


@router.post("/photo", response_model=ProfileResponse)
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG, and WebP images are allowed",
        )

    photo_data = await file.read()
    if len(photo_data) > MAX_PHOTO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Photo must be under 5MB",
        )

    repo = UserRepository(db)
    updated = await repo.update_profile(
        user_id=current_user.id,
        profile_photo=photo_data,
        profile_photo_content_type=file.content_type,
    )

    return ProfileResponse(
        id=updated.id,
        username=updated.username,
        email=updated.email,
        has_profile_photo=True,
        is_active=updated.is_active,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
    )


@router.get("/photo")
async def get_profile_photo(
    current_user: AdminUser = Depends(get_current_user),
):
    if not current_user.profile_photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No profile photo")

    return Response(
        content=current_user.profile_photo,
        media_type=current_user.profile_photo_content_type or "image/jpeg",
    )


@router.delete("/photo", response_model=ProfileResponse)
async def delete_profile_photo(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)
    updated = await repo.update_profile(
        user_id=current_user.id,
        clear_photo=True,
    )

    return ProfileResponse(
        id=updated.id,
        username=updated.username,
        email=updated.email,
        has_profile_photo=False,
        is_active=updated.is_active,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
    )
