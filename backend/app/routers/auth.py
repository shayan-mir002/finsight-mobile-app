from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import create_token, get_current_user, hash_password, to_public, verify_password
from ..database import db
from ..models import AuthResponse, LoginRequest, RegisterRequest

router = APIRouter()


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(payload: RegisterRequest):
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(409, "An account with this email already exists")

    user = {
        "name": payload.name.strip(),
        "email": payload.email.lower(),
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(user)
    user["_id"] = result.inserted_id
    return AuthResponse(token=create_token(str(result.inserted_id)), user=to_public(user))


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    user = await db.users.find_one({"email": payload.email.lower()})
    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    return AuthResponse(token=create_token(str(user["_id"])), user=to_public(user))


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return to_public(user)
