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
    plan = user["plan"] if user else "free"
    return {
        "plan":   plan,
        "is_pro": plan in ("pro", "champion"),
        "active": True,
    }
