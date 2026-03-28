"""Admin / Teacher endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, get_current_user
from app.core.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin_or_teacher(ctx: AuthContext):
    """Allow admin and teacher roles; block everyone else."""
    if ctx.role not in ("admin", "teacher"):
        raise HTTPException(403, "Teacher or admin access required")


# ── Student list ──────────────────────────────────────────────────────────────

@router.get("/students")
async def list_students(
    limit: int = 50,
    db:    AsyncSession = Depends(get_db),
    ctx:   AuthContext  = Depends(get_current_user),
):
    _require_admin_or_teacher(ctx)

    result = await db.execute(
        text("""
            SELECT id, name, email, phone, class, board, plan, role,
                   solve_count, streak, last_active_at, created_at
            FROM users
            WHERE role = 'student'
            ORDER BY solve_count DESC
            LIMIT :lim
        """),
        {"lim": min(limit, 200)},
    )
    rows = result.mappings().all()
    students = [dict(r) for r in rows]
    return {"students": students, "total": len(students)}


# ── Top topics across all students ────────────────────────────────────────────

@router.get("/top-topics")
async def top_topics(
    limit: int = 20,
    db:    AsyncSession = Depends(get_db),
    ctx:   AuthContext  = Depends(get_current_user),
):
    _require_admin_or_teacher(ctx)

    result = await db.execute(
        text("""
            SELECT topic, COUNT(*) as count
            FROM questions
            WHERE topic IS NOT NULL AND topic != ''
            GROUP BY topic
            ORDER BY count DESC
            LIMIT :lim
        """),
        {"lim": min(limit, 50)},
    )
    rows = result.mappings().all()
    return {"topics": [{"topic": r["topic"], "count": r["count"]} for r in rows]}


# ── Activity summary ──────────────────────────────────────────────────────────

@router.get("/activity")
async def activity_summary(
    db:  AsyncSession = Depends(get_db),
    ctx: AuthContext  = Depends(get_current_user),
):
    _require_admin_or_teacher(ctx)

    total_students = await db.execute(text("SELECT COUNT(*) FROM users WHERE role = 'student'"))
    total_questions = await db.execute(text("SELECT COUNT(*) FROM questions"))
    pro_count = await db.execute(text("SELECT COUNT(*) FROM users WHERE is_pro = true"))

    return {
        "totalStudents":  total_students.scalar_one(),
        "totalQuestions": total_questions.scalar_one(),
        "proStudents":    pro_count.scalar_one(),
    }
