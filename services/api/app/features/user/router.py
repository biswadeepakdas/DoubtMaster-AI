"""User endpoints — progress stats."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, get_current_user
from app.core.database import get_db

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/progress")
async def progress(
    db:  AsyncSession = Depends(get_db),
    ctx: AuthContext  = Depends(get_current_user),
):
    # Total solved + streak from users table
    user_result = await db.execute(
        text("SELECT solve_count, streak FROM users WHERE id = :id"),
        {"id": ctx.user_id},
    )
    user = user_result.mappings().one_or_none()
    solve_count = user["solve_count"] if user else 0
    streak      = user["streak"]      if user else 0

    # Subject breakdown from questions table
    subj_result = await db.execute(
        text("""
            SELECT subject, COUNT(*) as cnt
            FROM questions
            WHERE user_id = :uid
            GROUP BY subject
        """),
        {"uid": ctx.user_id},
    )
    by_subject = {row["subject"]: row["cnt"] for row in subj_result.mappings().all()}

    # Simple accuracy: assume 80% until we have ratings data
    accuracy = 80 if solve_count > 0 else 0

    return {
        "overall": {
            "totalSolved": solve_count,
            "streak":      streak,
            "accuracy":    accuracy,
        },
        "bySubject": by_subject,
    }
