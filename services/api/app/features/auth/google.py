"""Google OAuth SSO endpoint."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import issue_token_pair
from app.core.config import settings
from app.core.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


class GoogleTokenRequest(BaseModel):
    token: str   # Google ID token from the frontend


@router.post("/google")
async def google_login(body: GoogleTokenRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Verify a Google ID token and return a DoubtMaster JWT pair.
    Creates the user account automatically on first login.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(503, "Google login is not configured")

    # Verify the token with Google
    try:
        idinfo = id_token.verify_oauth2_token(
            body.token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10,
        )
    except ValueError as exc:
        logger.warning("Google token verification failed: %s", exc)
        raise HTTPException(401, "Invalid Google token")

    google_id = idinfo["sub"]
    email     = idinfo.get("email", "").lower().strip()
    name      = idinfo.get("name") or idinfo.get("given_name") or email.split("@")[0]
    avatar    = idinfo.get("picture")

    if not email:
        raise HTTPException(400, "Google account has no email address")

    ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()
    ua = request.headers.get("User-Agent", "")

    # Find existing user by google_id or email
    result = await db.execute(
        text("SELECT id, email, role, is_pro, plan FROM users WHERE google_id = :gid OR email = :email LIMIT 1"),
        {"gid": google_id, "email": email},
    )
    user = result.mappings().one_or_none()

    if user:
        # Link google_id if signing in via email match for the first time
        await db.execute(
            text("""
                UPDATE users
                SET google_id = :gid, avatar_url = COALESCE(avatar_url, :avatar), last_active_at = now()
                WHERE id = :id
            """),
            {"gid": google_id, "avatar": avatar, "id": str(user["id"])},
        )
        await db.commit()
        user_id = str(user["id"])
        role    = user["role"]
        is_pro  = user["is_pro"] or user["plan"] in ("pro", "champion")
    else:
        # New user — create account
        insert = await db.execute(
            text("""
                INSERT INTO users (email, name, google_id, avatar_url, role, plan, is_pro, board, class)
                VALUES (:email, :name, :gid, :avatar, 'student', 'free', false, 'CBSE', 10)
                RETURNING id, role, is_pro
            """),
            {"email": email, "name": name, "gid": google_id, "avatar": avatar},
        )
        await db.commit()
        row     = insert.mappings().one()
        user_id = str(row["id"])
        role    = row["role"]
        is_pro  = row["is_pro"]

    pair = await issue_token_pair(user_id, email, role, is_pro, db, ip=ip, ua=ua)
    return {"accessToken": pair.access_token, "refreshToken": pair.refresh_token}
