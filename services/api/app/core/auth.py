"""
Production-grade JWT auth with refresh token rotation.
Implements OWASP recommendations: short-lived access tokens, rotating refresh tokens,
family-based reuse detection, and secure cookie delivery.

DATABASE CALLS: All raw SQL uses SQLAlchemy text() — never plain strings or f-strings.
The db parameter is always SQLAlchemy AsyncSession, never asyncpg directly.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, Header, HTTPException, Request, status
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db

# ── Token configuration ──────────────────────────────────────────────────────
ACCESS_TOKEN_TTL  = timedelta(minutes=15)     # short-lived
REFRESH_TOKEN_TTL = timedelta(days=30)
ALGORITHM         = "HS256"


class TokenPair(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
    expires_in:    int = 900  # 15 min in seconds


class AuthContext(BaseModel):
    user_id:    str
    email:      str
    role:       str           # "student" | "admin" | "teacher"
    is_pro:     bool
    request_id: str


# ── Token creation ────────────────────────────────────────────────────────────

def create_access_token(user_id: str, email: str, role: str, is_pro: bool) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub":    user_id,
        "email":  email,
        "role":   role,
        "is_pro": is_pro,
        "iat":    now,
        "exp":    now + ACCESS_TOKEN_TTL,
        "iss":    settings.JWT_ISSUER,
        "aud":    settings.JWT_AUDIENCE,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def create_refresh_token() -> tuple[str, str]:
    """Returns (raw_token, hashed_token). Store only the hash. Send raw to client."""
    raw    = secrets.token_urlsafe(64)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


async def issue_token_pair(
    user_id: str, email: str, role: str, is_pro: bool,
    db: AsyncSession, ip: str = "", ua: str = "",
    family: Optional[str] = None,
) -> TokenPair:
    access                    = create_access_token(user_id, email, role, is_pro)
    raw_refresh, hashed_refresh = create_refresh_token()
    token_family              = family or secrets.token_hex(16)

    await db.execute(
        text("""
            INSERT INTO refresh_tokens
                (user_id, token_hash, family, device_info, ip_address, expires_at)
            VALUES
                (:user_id, :hash, :family, :ua, :ip, :exp)
        """),
        {
            "user_id": user_id,
            "hash":    hashed_refresh,
            "family":  token_family,
            "ua":      ua[:500],
            "ip":      ip,
            "exp":     datetime.now(timezone.utc) + REFRESH_TOKEN_TTL,
        },
    )
    await db.commit()
    return TokenPair(access_token=access, refresh_token=raw_refresh)


# ── Token validation ──────────────────────────────────────────────────────────

async def get_current_user(
    request:       Request,
    authorization: Optional[str] = Header(None),
    db:            AsyncSession   = Depends(get_db),
) -> AuthContext:
    token = _extract_bearer(authorization)
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[ALGORITHM],
            audience=settings.JWT_AUDIENCE, issuer=settings.JWT_ISSUER,
        )
    except JWTError as e:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, f"Invalid token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    ctx = AuthContext(
        user_id=payload["sub"],
        email=payload["email"],
        role=payload.get("role", "student"),
        is_pro=payload.get("is_pro", False),
        request_id=request.state.request_id,
    )
    # Expose user_id on request.state so RateLimitMiddleware can use it for
    # per-user rate keys instead of falling back to IP.
    request.state.user_id = ctx.user_id
    return ctx


async def refresh_access_token(
    raw_refresh: str,
    db:          AsyncSession,
    ip:          str = "",
    ua:          str = "",
) -> TokenPair:
    """
    Refresh token rotation with reuse detection.
    If a token is reused (already revoked), the ENTIRE family is invalidated.

    Uses SQLAlchemy text() for all queries — never asyncpg fetchrow().
    """
    hashed = hashlib.sha256(raw_refresh.encode()).hexdigest()

    result = await db.execute(
        text("SELECT * FROM refresh_tokens WHERE token_hash = :h"),
        {"h": hashed},
    )
    row = result.mappings().one_or_none()

    if not row:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")

    # Detect reuse — token already revoked = family compromise
    if row["revoked_at"] is not None:
        await db.execute(
            text("""
                UPDATE refresh_tokens
                SET    revoked_at = now()
                WHERE  family = :f AND revoked_at IS NULL
            """),
            {"f": row["family"]},
        )
        await db.commit()
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Token reuse detected — please log in again",
        )

    if row["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token expired")

    # Revoke current token
    await db.execute(
        text("UPDATE refresh_tokens SET revoked_at = now() WHERE id = :id"),
        {"id": row["id"]},
    )

    # Fetch the user record
    user_result = await db.execute(
        text("SELECT * FROM users WHERE id = :id"),
        {"id": row["user_id"]},
    )
    user = user_result.mappings().one()

    return await issue_token_pair(
        str(user["id"]), user["email"], user["role"], user["is_pro"],
        db, ip, ua, family=row["family"],
    )


# ── RBAC ─────────────────────────────────────────────────────────────────────

def require_role(*roles: str):
    """Dependency factory: require_role("admin") or require_role("admin", "teacher")"""
    def _check(ctx: AuthContext = Depends(get_current_user)) -> AuthContext:
        if ctx.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return ctx
    return _check

require_student = require_role("student", "admin")
require_admin   = require_role("admin")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_bearer(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Bearer token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return authorization.removeprefix("Bearer ").strip()
