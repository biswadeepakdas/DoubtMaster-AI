"""Subscriptions router — plan status."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, get_current_user
from app.core.database import get_db

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("/status")
async def status(
    db:  AsyncSession = Depends(get_db),
    ctx: AuthContext  = Depends(get_current_user),
):
    result = await db.execute(
        text("SELECT plan, is_pro FROM users WHERE id = :id"),
        {"id": ctx.user_id},
    )
    user = result.mappings().one_or_none()
    plan   = user["plan"]   if user else "free"
    is_pro = user["is_pro"] if user else False
    # Also check the subscriptions table for an active subscription
    sub_result = await db.execute(
        text("""
            SELECT plan FROM subscriptions
            WHERE user_id = :uid AND status = 'active' AND expires_at > now()
            ORDER BY expires_at DESC LIMIT 1
        """),
        {"uid": ctx.user_id},
    )
    active_sub = sub_result.mappings().one_or_none()
    active = active_sub is not None
    if active_sub:
        plan = active_sub["plan"]
    return {
        "plan":   plan,
        "isPro":  is_pro or plan in ("pro", "champion"),
        "active": active,
    }
