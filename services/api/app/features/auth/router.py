"""Auth endpoints: login, refresh, logout."""

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    AuthContext, TokenPair, get_current_user,
    issue_token_pair, refresh_access_token,
)
from app.core.audit import audit
from app.core.database import get_db
import bcrypt

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/login", response_model=TokenPair)
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM users WHERE email = :email"),
        {"email": body.email},
    )
    user = result.mappings().one_or_none()

    if not user or not bcrypt.checkpw(body.password.encode(), user["password_hash"].encode()):
        raise HTTPException(401, "Invalid credentials")

    ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()
    ua = request.headers.get("User-Agent", "")

    pair = await issue_token_pair(
        str(user["id"]), user["email"], user["role"], user["is_pro"],
        db, ip=ip, ua=ua,
    )
    await audit(db, "login", user_id=str(user["id"]), ip_address=ip, user_agent=ua)
    return pair


@router.post("/refresh", response_model=TokenPair)
async def refresh(body: RefreshRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()
    ua = request.headers.get("User-Agent", "")
    return await refresh_access_token(body.refresh_token, db, ip=ip, ua=ua)


@router.post("/logout", status_code=204)
async def logout(
    body: RefreshRequest,
    db:   AsyncSession   = Depends(get_db),
    ctx:  AuthContext    = Depends(get_current_user),
):
    """Revoke the provided refresh token."""
    import hashlib
    hashed = hashlib.sha256(body.refresh_token.encode()).hexdigest()
    await db.execute(
        text("UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = :h"),
        {"h": hashed},
    )
    await audit(db, "logout", user_id=ctx.user_id)
    return Response(status_code=204)
