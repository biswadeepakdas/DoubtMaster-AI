"""Auth endpoints: signup, login, refresh, logout, me."""

import hashlib
import random
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
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

router = APIRouter(prefix="/auth", tags=["auth"])

VALID_BOARDS = {"CBSE", "ICSE", "STATE", "STATE_OTHER", "IB", "IGCSE"}


class SignupRequest(BaseModel):
    method:     str           # "email" | "phone"
    identifier: str           # email address or +91XXXXXXXXXX
    name:       str
    password:   Optional[str] = None
    board:      str           = "CBSE"
    plan:       str           = "free"
    # frontend sends "class" as a JSON key — aliased to avoid Python keyword conflict
    model_config = {"populate_by_name": True}

    @property
    def grade(self) -> int:
        return getattr(self, "_class", 10)


class SignupRequestFull(BaseModel):
    method:     str
    identifier: str
    name:       str
    password:   Optional[str] = None
    board:      str = "CBSE"
    plan:       str = "free"
    class_:     Optional[int] = None

    model_config = {"populate_by_name": True}


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Signup ────────────────────────────────────────────────────────────────────

@router.post("/signup")
async def signup(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.json()

    method     = body.get("method", "email")
    identifier = body.get("identifier", "").strip()
    name       = body.get("name", "").strip()
    password   = body.get("password")
    board      = body.get("board", "CBSE")
    plan       = body.get("plan", "free")
    grade      = body.get("class", 10)

    if not identifier:
        raise HTTPException(400, "identifier is required")
    if not name:
        raise HTTPException(400, "name is required")

    # Normalise board value
    if board not in VALID_BOARDS:
        board = "CBSE"

    ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()
    ua = request.headers.get("User-Agent", "")

    if method == "email":
        if not password or len(password) < 8:
            raise HTTPException(400, "Password must be at least 8 characters")

        # Check duplicate
        existing = await db.execute(text("SELECT id FROM users WHERE email = :e"), {"e": identifier})
        if existing.scalar_one_or_none():
            raise HTTPException(409, "An account with this email already exists")

        pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        is_pro  = plan in ("pro", "champion")

        result = await db.execute(
            text("""
                INSERT INTO users (email, password_hash, name, class, board, plan, role, is_pro)
                VALUES (:email, :pw, :name, :class, :board, :plan, 'student', :is_pro)
                RETURNING id, email, role, is_pro
            """),
            {"email": identifier, "pw": pw_hash, "name": name,
             "class": grade, "board": board, "plan": plan, "is_pro": is_pro},
        )
        await db.commit()
        user = result.mappings().one()

        pair = await issue_token_pair(
            str(user["id"]), user["email"], user["role"], user["is_pro"],
            db, ip=ip, ua=ua,
        )
        await audit(db, "signup", user_id=str(user["id"]), ip_address=ip, user_agent=ua)
        return {"accessToken": pair.access_token, "refreshToken": pair.refresh_token}

    elif method == "phone":
        # Check duplicate
        existing = await db.execute(text("SELECT id FROM users WHERE phone = :p"), {"p": identifier})
        if existing.scalar_one_or_none():
            raise HTTPException(409, "An account with this phone number already exists")

        is_pro = plan in ("pro", "champion")
        await db.execute(
            text("""
                INSERT INTO users (phone, name, class, board, plan, role, is_pro)
                VALUES (:phone, :name, :class, :board, :plan, 'student', :is_pro)
            """),
            {"phone": identifier, "name": name, "class": grade,
             "board": board, "plan": plan, "is_pro": is_pro},
        )

        # Generate and store OTP for phone verification
        otp = str(random.randint(100000, 999999))
        expires = datetime.now(timezone.utc) + timedelta(minutes=10)
        await db.execute(
            text("""
                INSERT INTO otp_store (phone, otp, expires_at)
                VALUES (:p, :otp, :exp)
                ON CONFLICT (phone) DO UPDATE SET otp = :otp, expires_at = :exp, created_at = now()
            """),
            {"p": identifier, "otp": otp, "exp": expires},
        )
        await db.commit()

        import logging
        logging.getLogger(__name__).info("Signup OTP for %s: %s", identifier, otp)

        # OTP flow — frontend will redirect to /verify-otp
        return {"requiresVerification": True, "message": "OTP sent to your phone"}

    raise HTTPException(400, "method must be 'email' or 'phone'")


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login")
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM users WHERE email = :email"),
        {"email": body.email},
    )
    user = result.mappings().one_or_none()

    if not user or not user["password_hash"]:
        raise HTTPException(401, "Invalid credentials")
    if not bcrypt.checkpw(body.password.encode(), user["password_hash"].encode()):
        raise HTTPException(401, "Invalid credentials")

    ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()
    ua = request.headers.get("User-Agent", "")

    is_pro = user.get("is_pro") or user.get("plan") in ("pro", "champion")
    pair = await issue_token_pair(
        str(user["id"]), user["email"], user["role"], is_pro,
        db, ip=ip, ua=ua,
    )
    await audit(db, "login", user_id=str(user["id"]), ip_address=ip, user_agent=ua)
    return {"accessToken": pair.access_token, "refreshToken": pair.refresh_token}


# ── Phone OTP login (send OTP) ────────────────────────────────────────────────

class PhoneOTPRequest(BaseModel):
    phone: str   # "+91XXXXXXXXXX"


@router.post("/login/otp")
async def send_login_otp(body: PhoneOTPRequest, db: AsyncSession = Depends(get_db)):
    phone = body.phone.strip()
    if not phone:
        raise HTTPException(400, "Phone number required")

    # Check user exists
    result = await db.execute(text("SELECT id FROM users WHERE phone = :p"), {"p": phone})
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "No account found for this phone number")

    otp = str(random.randint(100000, 999999))
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)

    # Upsert otp_store
    await db.execute(
        text("""
            INSERT INTO otp_store (phone, otp, expires_at)
            VALUES (:p, :otp, :exp)
            ON CONFLICT (phone) DO UPDATE SET otp = :otp, expires_at = :exp, created_at = now()
        """),
        {"p": phone, "otp": otp, "exp": expires},
    )
    await db.commit()

    # Log OTP (SMS integration goes here — for now visible in Railway logs)
    import logging
    logging.getLogger(__name__).info("OTP for %s: %s", phone, otp)

    return {"message": "OTP sent"}


# ── Verify OTP (login or signup) ──────────────────────────────────────────────

class VerifyOTPRequest(BaseModel):
    identifier: str   # phone or email
    otp:        str
    method:     str = "phone"   # "phone" | "email"
    action:     str = "login"   # "login" | "signup"


@router.post("/verify-otp")
async def verify_otp(body: VerifyOTPRequest, request: Request, db: AsyncSession = Depends(get_db)):
    identifier = body.identifier.strip()
    ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()
    ua = request.headers.get("User-Agent", "")

    # Look up stored OTP
    result = await db.execute(
        text("SELECT otp, expires_at FROM otp_store WHERE phone = :p"),
        {"p": identifier},
    )
    stored = result.mappings().one_or_none()

    if not stored:
        raise HTTPException(400, "No OTP found. Please request a new one.")

    if stored["expires_at"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(400, "OTP has expired. Please request a new one.")

    if stored["otp"] != body.otp.strip():
        raise HTTPException(400, "Invalid OTP. Please try again.")

    # Delete used OTP
    await db.execute(text("DELETE FROM otp_store WHERE phone = :p"), {"p": identifier})

    # Fetch or create user
    result = await db.execute(
        text("SELECT id, email, phone, role, is_pro FROM users WHERE phone = :p"),
        {"p": identifier},
    )
    user = result.mappings().one_or_none()

    if not user:
        raise HTTPException(404, "User not found")

    await db.execute(
        text("UPDATE users SET last_active_at = now() WHERE id = :id"),
        {"id": str(user["id"])},
    )
    await db.commit()

    pair = await issue_token_pair(
        str(user["id"]), user["email"] or user["phone"], user["role"], user["is_pro"],
        db, ip=ip, ua=ua,
    )
    await audit(db, "login_otp", user_id=str(user["id"]), ip_address=ip, user_agent=ua)
    return {"accessToken": pair.access_token, "refreshToken": pair.refresh_token}


# ── Verify signup OTP ─────────────────────────────────────────────────────────

@router.post("/verify-signup")
async def verify_signup(body: VerifyOTPRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Same as verify-otp but explicit signup action — forwards to the same logic."""
    return await verify_otp(body, request, db)


# ── Resend OTP ────────────────────────────────────────────────────────────────

class ResendOTPRequest(BaseModel):
    identifier: str
    method:     str = "phone"


@router.post("/resend-otp")
async def resend_otp(body: ResendOTPRequest, db: AsyncSession = Depends(get_db)):
    return await send_login_otp(PhoneOTPRequest(phone=body.identifier), db)


# ── Me ────────────────────────────────────────────────────────────────────────

@router.get("/me")
async def me(db: AsyncSession = Depends(get_db), ctx: AuthContext = Depends(get_current_user)):
    result = await db.execute(
        text("SELECT id, email, phone, name, class, board, plan, role, is_pro, "
             "solve_count, streak, best_streak, avatar_url, created_at FROM users WHERE id = :id"),
        {"id": ctx.user_id},
    )
    user = result.mappings().one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    return dict(user)


# ── Refresh ───────────────────────────────────────────────────────────────────

@router.post("/refresh")
async def refresh(body: RefreshRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()
    ua = request.headers.get("User-Agent", "")
    pair = await refresh_access_token(body.refresh_token, db, ip=ip, ua=ua)
    return {"accessToken": pair.access_token, "refreshToken": pair.refresh_token}


# ── Logout ────────────────────────────────────────────────────────────────────

@router.post("/logout", status_code=204)
async def logout(
    body: RefreshRequest,
    db:   AsyncSession = Depends(get_db),
    ctx:  AuthContext  = Depends(get_current_user),
):
    hashed = hashlib.sha256(body.refresh_token.encode()).hexdigest()
    await db.execute(
        text("UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = :h"),
        {"h": hashed},
    )
    await audit(db, "logout", user_id=ctx.user_id)
    return Response(status_code=204)
