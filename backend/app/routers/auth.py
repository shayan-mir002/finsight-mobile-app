from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import create_token, get_current_user, hash_password, to_public, verify_password
from ..database import create_user, get_user_by_email, update_user_avatar
from ..models import AuthResponse, AvatarRequest, LoginRequest, RegisterRequest

router = APIRouter()


@router.post("/avatar")
async def update_avatar(payload: AvatarRequest, user: dict = Depends(get_current_user)):
    if not payload.avatar.startswith("data:image/"):
        raise HTTPException(422, "Avatar must be a data:image/... URL")

    updated = await update_user_avatar(user["id"], payload.avatar)
    return to_public(updated)


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(payload: RegisterRequest):
    existing = await get_user_by_email(payload.email.lower())
    if existing:
        raise HTTPException(409, "An account with this email already exists")

    user = await create_user(
        name=payload.name.strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    return AuthResponse(token=create_token(user["id"]), user=to_public(user))


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    user = await get_user_by_email(payload.email.lower())
    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    return AuthResponse(token=create_token(user["id"]), user=to_public(user))


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return to_public(user)
