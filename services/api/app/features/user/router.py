"""User endpoints — progress stats."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, get_current_user
from app.core.database import get_db

router = APIRouter(prefix="/user", tags=["user"])


class ProfileUpdateRequest(BaseModel):
    name:     Optional[str] = None
    class_:   Optional[int] = None
    board:    Optional[str] = None
    language: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = {"populate_by_name": True}


@router.put("/profile")
async def update_profile(
    body: ProfileUpdateRequest,
    db:   AsyncSession = Depends(get_db),
    ctx:  AuthContext  = Depends(get_current_user),
):
    updates = {}
    if body.name is not None:
        updates["name"] = body.name.strip()
    if body.class_ is not None:
        updates["class"] = body.class_
    if body.board is not None:
        updates["board"] = body.board
    if body.language is not None:
        updates["language"] = body.language
    if body.avatar_url is not None:
        updates["avatar_url"] = body.avatar_url

    if not updates:
        raise HTTPException(400, "No fields to update")

    set_clause = ", ".join(f'"{k}" = :{k}' for k in updates)
    updates["id"] = ctx.user_id
    await db.execute(
        text(f"UPDATE users SET {set_clause}, updated_at = now() WHERE id = :id"),
        updates,
    )
    await db.commit()

    # Return updated user
    result = await db.execute(
        text("SELECT id, email, phone, name, class, board, language, plan, role, is_pro, avatar_url FROM users WHERE id = :id"),
        {"id": ctx.user_id},
    )
    user = result.mappings().one_or_none()
    return dict(user)


@router.get("/progress")
async def progress(
    db:  AsyncSession = Depends(get_db),
    ctx: AuthContext  = Depends(get_current_user),
):
    import math

    # Total solved + streak from users table
    user_result = await db.execute(
        text("SELECT solve_count, streak, best_streak FROM users WHERE id = :id"),
        {"id": ctx.user_id},
    )
    user = user_result.mappings().one_or_none()
    solve_count  = user["solve_count"]  if user else 0
    streak       = user["streak"]       if user else 0
    best_streak  = user["best_streak"]  if user else 0

    # Subject breakdown
    subj_result = await db.execute(
        text("""
            SELECT subject, COUNT(*) as cnt
            FROM questions WHERE user_id = :uid
            GROUP BY subject
        """),
        {"uid": ctx.user_id},
    )
    by_subject = {row["subject"]: row["cnt"] for row in subj_result.mappings().all()}

    # Weekly activity — last 7 days
    weekly_result = await db.execute(
        text("""
            SELECT DATE(created_at) as day, COUNT(*) as cnt
            FROM questions
            WHERE user_id = :uid AND created_at >= now() - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY day
        """),
        {"uid": ctx.user_id},
    )
    weekly_map = {str(row["day"]): row["cnt"] for row in weekly_result.mappings().all()}
    # Build 7-day array
    from datetime import date, timedelta
    today = date.today()
    # Return flat array of 7 counts indexed by JS day-of-week (0=Sun, 1=Mon … 6=Sat)
    weekly_activity = [0] * 7
    for i in range(7):
        day = today - timedelta(days=6 - i)
        # Python weekday(): Mon=0 … Sun=6 → JS convention: Sun=0, Mon=1 … Sat=6
        js_dow = (day.weekday() + 1) % 7
        weekly_activity[js_dow] = weekly_map.get(str(day), 0)

    # Weak topics — subjects with fewer solves
    weak_topics = [s for s, c in sorted(by_subject.items(), key=lambda x: x[1]) if c < 5][:3]

    # Daily goal: target 5 solves/day
    today_count_result = await db.execute(
        text("""
            SELECT COUNT(*) FROM questions
            WHERE user_id = :uid AND created_at >= CURRENT_DATE
        """),
        {"uid": ctx.user_id},
    )
    today_count = today_count_result.scalar_one()
    daily_goal = {"target": 5, "completed": today_count, "percentage": min(100, math.floor(today_count / 5 * 100))}

    # Accuracy: ratio of days with activity vs total days active (rough proxy until we track per-question correctness)
    accuracy = min(95, round(75 + min(solve_count, 20) * 1.0)) if solve_count > 0 else 0

    return {
        "overall": {
            "totalSolved": solve_count,
            "streak":      streak,
            "bestStreak":  best_streak,
            "accuracy":    accuracy,
        },
        "bySubject":      by_subject,
        "weeklyActivity": weekly_activity,
        "weakTopics":     weak_topics,
        "dailyGoal":      daily_goal,
    }
