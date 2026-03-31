"""Study Streaks & Daily Goals — gamification engine for consistent study habits.

Endpoints:
  GET  /streaks/dashboard   — current streak, daily goal progress, achievements
  PUT  /streaks/goals       — set daily study targets
  POST /streaks/check-in    — log study activity (called after each solve)
  POST /streaks/freeze      — use a streak freeze for a missed day
  GET  /streaks/achievements — list all earned badges
  GET  /streaks/leaderboard  — weekly top streakers
"""

import logging
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, get_current_user
from app.core.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/streaks", tags=["streaks"])

# ── Badge definitions ─────────────────────────────────────────────────────────

BADGE_DEFS = {
    "first_solve":     {"title": "First Step",        "description": "Solved your first question",                    "icon": "zap"},
    "streak_3":        {"title": "Hatrick",            "description": "3-day study streak",                            "icon": "flame"},
    "streak_7":        {"title": "Week Warrior",       "description": "7-day study streak",                            "icon": "flame"},
    "streak_30":       {"title": "Monthly Master",     "description": "30-day study streak",                           "icon": "trophy"},
    "streak_100":      {"title": "Century Club",       "description": "100-day study streak!",                         "icon": "crown"},
    "solves_10":       {"title": "Getting Started",    "description": "Solved 10 questions",                           "icon": "book-open"},
    "solves_50":       {"title": "Problem Crusher",    "description": "Solved 50 questions",                           "icon": "target"},
    "solves_100":      {"title": "Century Solver",     "description": "Solved 100 questions",                          "icon": "award"},
    "solves_500":      {"title": "Knowledge Machine",  "description": "Solved 500 questions",                          "icon": "rocket"},
    "goal_complete_5": {"title": "Goal Getter",        "description": "Completed daily goals 5 times",                 "icon": "check-circle"},
    "goal_complete_20":{"title": "Discipline King",    "description": "Completed daily goals 20 times",                "icon": "shield"},
    "multi_subject":   {"title": "Renaissance Student","description": "Solved questions in 4+ subjects",               "icon": "layers"},
    "night_owl":       {"title": "Night Owl",          "description": "Solved a question after 11 PM",                 "icon": "moon"},
    "early_bird":      {"title": "Early Bird",         "description": "Solved a question before 6 AM",                 "icon": "sunrise"},
}

# Free users get 1 freeze per month, Pro gets 3
FREE_FREEZES_PER_MONTH = 1
PRO_FREEZES_PER_MONTH = 3


# ── Request / response models ────────────────────────────────────────────────

class GoalUpdateRequest(BaseModel):
    target_solves: int = Field(ge=1, le=50, default=5)
    target_minutes: int = Field(ge=5, le=480, default=30)


class CheckInRequest(BaseModel):
    minutes_studied: int = Field(ge=0, le=480, default=0)
    subject: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _ensure_daily_goal(db: AsyncSession, user_id: str) -> dict:
    """Get or create today's daily goal row."""
    today = date.today()
    result = await db.execute(
        text("""
            SELECT id, target_solves, target_minutes, actual_solves, actual_minutes, completed
            FROM daily_goals WHERE user_id = :uid AND date = :d
        """),
        {"uid": user_id, "d": today},
    )
    row = result.mappings().one_or_none()
    if row:
        return dict(row)

    # Carry forward previous goal targets
    prev = await db.execute(
        text("""
            SELECT target_solves, target_minutes FROM daily_goals
            WHERE user_id = :uid AND date < :d
            ORDER BY date DESC LIMIT 1
        """),
        {"uid": user_id, "d": today},
    )
    prev_row = prev.mappings().one_or_none()
    target_s = prev_row["target_solves"] if prev_row else 5
    target_m = prev_row["target_minutes"] if prev_row else 30

    await db.execute(
        text("""
            INSERT INTO daily_goals (user_id, date, target_solves, target_minutes)
            VALUES (:uid, :d, :ts, :tm)
            ON CONFLICT (user_id, date) DO NOTHING
        """),
        {"uid": user_id, "d": today, "ts": target_s, "tm": target_m},
    )
    return {
        "target_solves": target_s, "target_minutes": target_m,
        "actual_solves": 0, "actual_minutes": 0, "completed": False,
    }


async def _calc_streak(db: AsyncSession, user_id: str) -> dict:
    """Calculate current streak accounting for freezes."""
    result = await db.execute(
        text("""
            SELECT date FROM daily_goals
            WHERE user_id = :uid AND (completed = true OR actual_solves > 0)
            ORDER BY date DESC LIMIT 365
        """),
        {"uid": user_id},
    )
    active_dates = {row["date"] for row in result.mappings().all()}

    # Add freeze dates
    freeze_result = await db.execute(
        text("SELECT used_on FROM streak_freezes WHERE user_id = :uid"),
        {"uid": user_id},
    )
    freeze_dates = {row["used_on"] for row in freeze_result.mappings().all()}

    today = date.today()
    streak = 0
    check_date = today

    while True:
        if check_date in active_dates or check_date in freeze_dates:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break

    return {"current": streak, "active_dates_count": len(active_dates)}


async def _award_badge(db: AsyncSession, user_id: str, badge_key: str) -> bool:
    """Award a badge if not already earned. Returns True if newly awarded."""
    if badge_key not in BADGE_DEFS:
        return False

    badge = BADGE_DEFS[badge_key]
    result = await db.execute(
        text("""
            INSERT INTO achievements (user_id, badge_key, title, description, icon)
            VALUES (:uid, :key, :title, :desc, :icon)
            ON CONFLICT (user_id, badge_key) DO NOTHING
            RETURNING id
        """),
        {
            "uid": user_id, "key": badge_key,
            "title": badge["title"], "desc": badge["description"], "icon": badge["icon"],
        },
    )
    return result.rowcount > 0


async def _check_and_award_badges(db: AsyncSession, user_id: str, streak: int, solve_count: int):
    """Check all badge conditions and award any newly earned ones."""
    newly_earned = []

    # Streak badges
    for threshold, key in [(3, "streak_3"), (7, "streak_7"), (30, "streak_30"), (100, "streak_100")]:
        if streak >= threshold:
            if await _award_badge(db, user_id, key):
                newly_earned.append(key)

    # Solve count badges
    for threshold, key in [(1, "first_solve"), (10, "solves_10"), (50, "solves_50"),
                           (100, "solves_100"), (500, "solves_500")]:
        if solve_count >= threshold:
            if await _award_badge(db, user_id, key):
                newly_earned.append(key)

    # Goal completion count
    goal_result = await db.execute(
        text("SELECT COUNT(*) FROM daily_goals WHERE user_id = :uid AND completed = true"),
        {"uid": user_id},
    )
    goal_count = goal_result.scalar_one()
    for threshold, key in [(5, "goal_complete_5"), (20, "goal_complete_20")]:
        if goal_count >= threshold:
            if await _award_badge(db, user_id, key):
                newly_earned.append(key)

    # Multi-subject badge
    subj_result = await db.execute(
        text("SELECT COUNT(DISTINCT subject) FROM questions WHERE user_id = :uid"),
        {"uid": user_id},
    )
    if subj_result.scalar_one() >= 4:
        if await _award_badge(db, user_id, "multi_subject"):
            newly_earned.append("multi_subject")

    return newly_earned


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def streak_dashboard(
    db:  AsyncSession = Depends(get_db),
    ctx: AuthContext  = Depends(get_current_user),
):
    """Full streak dashboard: streak, daily goal, recent activity, achievements."""
    goal = await _ensure_daily_goal(db, ctx.user_id)
    streak_info = await _calc_streak(db, ctx.user_id)

    # User solve count
    user_row = await db.execute(
        text("SELECT solve_count, streak, best_streak FROM users WHERE id = :id"),
        {"id": ctx.user_id},
    )
    user = user_row.mappings().one_or_none()

    # Last 7 days activity
    week_result = await db.execute(
        text("""
            SELECT date, actual_solves, actual_minutes, completed
            FROM daily_goals
            WHERE user_id = :uid AND date >= :start
            ORDER BY date
        """),
        {"uid": ctx.user_id, "start": date.today() - timedelta(days=6)},
    )
    week_activity = [dict(r) for r in week_result.mappings().all()]

    # Recent achievements
    badge_result = await db.execute(
        text("""
            SELECT badge_key, title, description, icon, earned_at
            FROM achievements WHERE user_id = :uid
            ORDER BY earned_at DESC LIMIT 5
        """),
        {"uid": ctx.user_id},
    )
    recent_badges = [dict(r) for r in badge_result.mappings().all()]

    # Freezes used this month
    freeze_result = await db.execute(
        text("""
            SELECT COUNT(*) FROM streak_freezes
            WHERE user_id = :uid AND used_on >= date_trunc('month', CURRENT_DATE)
        """),
        {"uid": ctx.user_id},
    )
    freezes_used = freeze_result.scalar_one()
    is_pro = user["best_streak"] is not None  # simplified check
    user_plan_result = await db.execute(
        text("SELECT is_pro, plan FROM users WHERE id = :id"),
        {"id": ctx.user_id},
    )
    plan_row = user_plan_result.mappings().one_or_none()
    is_pro = (plan_row and (plan_row["is_pro"] or (plan_row["plan"] or "").lower() in ("pro", "champion")))
    max_freezes = PRO_FREEZES_PER_MONTH if is_pro else FREE_FREEZES_PER_MONTH

    return {
        "streak": {
            "current": streak_info["current"],
            "best": user["best_streak"] if user else 0,
            "totalActiveDays": streak_info["active_dates_count"],
        },
        "dailyGoal": {
            "targetSolves": goal["target_solves"],
            "targetMinutes": goal["target_minutes"],
            "actualSolves": goal["actual_solves"],
            "actualMinutes": goal["actual_minutes"],
            "completed": goal["completed"],
            "solveProgress": min(100, round((goal["actual_solves"] / max(goal["target_solves"], 1)) * 100)),
            "minuteProgress": min(100, round((goal["actual_minutes"] / max(goal["target_minutes"], 1)) * 100)),
        },
        "weekActivity": week_activity,
        "recentBadges": recent_badges,
        "freezes": {
            "used": freezes_used,
            "max": max_freezes,
            "remaining": max(0, max_freezes - freezes_used),
        },
        "totalSolved": user["solve_count"] if user else 0,
    }


@router.put("/goals")
async def update_goals(
    body: GoalUpdateRequest,
    db:   AsyncSession = Depends(get_db),
    ctx:  AuthContext  = Depends(get_current_user),
):
    """Update daily study targets."""
    today = date.today()
    await _ensure_daily_goal(db, ctx.user_id)
    await db.execute(
        text("""
            UPDATE daily_goals
            SET target_solves = :ts, target_minutes = :tm, updated_at = now()
            WHERE user_id = :uid AND date = :d
        """),
        {"uid": ctx.user_id, "d": today, "ts": body.target_solves, "tm": body.target_minutes},
    )
    return {"message": "Goals updated", "targetSolves": body.target_solves, "targetMinutes": body.target_minutes}


@router.post("/check-in")
async def check_in(
    body: CheckInRequest,
    db:   AsyncSession = Depends(get_db),
    ctx:  AuthContext  = Depends(get_current_user),
):
    """Record study activity — called after solving a question or studying."""
    goal = await _ensure_daily_goal(db, ctx.user_id)
    today = date.today()

    new_solves = goal["actual_solves"] + 1
    new_minutes = goal["actual_minutes"] + body.minutes_studied
    completed = (new_solves >= goal["target_solves"]) and (new_minutes >= goal["target_minutes"])

    await db.execute(
        text("""
            UPDATE daily_goals
            SET actual_solves = :s, actual_minutes = :m, completed = :c, updated_at = now()
            WHERE user_id = :uid AND date = :d
        """),
        {"uid": ctx.user_id, "d": today, "s": new_solves, "m": new_minutes, "c": completed},
    )

    # Update user streak
    streak_info = await _calc_streak(db, ctx.user_id)
    current_streak = streak_info["current"]

    # Update best streak if needed
    await db.execute(
        text("""
            UPDATE users SET
                streak = :s,
                best_streak = GREATEST(COALESCE(best_streak, 0), :s),
                last_active_at = now()
            WHERE id = :uid
        """),
        {"uid": ctx.user_id, "s": current_streak},
    )

    # Get total solve count
    solve_result = await db.execute(
        text("SELECT solve_count FROM users WHERE id = :uid"),
        {"uid": ctx.user_id},
    )
    solve_count = solve_result.scalar_one() or 0

    # Check for new badges
    new_badges = await _check_and_award_badges(db, ctx.user_id, current_streak, solve_count)

    return {
        "streak": current_streak,
        "dailyGoal": {
            "actualSolves": new_solves,
            "actualMinutes": new_minutes,
            "completed": completed,
        },
        "newBadges": [
            {**BADGE_DEFS[key], "badgeKey": key}
            for key in new_badges
            if key in BADGE_DEFS
        ],
    }


@router.post("/freeze")
async def use_streak_freeze(
    db:  AsyncSession = Depends(get_db),
    ctx: AuthContext  = Depends(get_current_user),
):
    """Use a streak freeze to protect streak on a missed day."""
    yesterday = date.today() - timedelta(days=1)

    # Check if yesterday was already active
    active_result = await db.execute(
        text("""
            SELECT id FROM daily_goals
            WHERE user_id = :uid AND date = :d AND actual_solves > 0
        """),
        {"uid": ctx.user_id, "d": yesterday},
    )
    if active_result.one_or_none():
        raise HTTPException(400, "You were active yesterday — no freeze needed")

    # Check freeze limit
    freeze_count = await db.execute(
        text("""
            SELECT COUNT(*) FROM streak_freezes
            WHERE user_id = :uid AND used_on >= date_trunc('month', CURRENT_DATE)
        """),
        {"uid": ctx.user_id},
    )
    used = freeze_count.scalar_one()

    plan_result = await db.execute(
        text("SELECT is_pro, plan FROM users WHERE id = :id"),
        {"id": ctx.user_id},
    )
    plan_row = plan_result.mappings().one_or_none()
    is_pro = (plan_row and (plan_row["is_pro"] or (plan_row["plan"] or "").lower() in ("pro", "champion")))
    max_freezes = PRO_FREEZES_PER_MONTH if is_pro else FREE_FREEZES_PER_MONTH

    if used >= max_freezes:
        raise HTTPException(
            403,
            {
                "message": f"No streak freezes remaining this month (used {used}/{max_freezes})",
                "code": "FREEZE_LIMIT",
                "upgrade": not is_pro,
            },
        )

    # Apply freeze
    await db.execute(
        text("""
            INSERT INTO streak_freezes (user_id, used_on)
            VALUES (:uid, :d)
            ON CONFLICT (user_id, used_on) DO NOTHING
        """),
        {"uid": ctx.user_id, "d": yesterday},
    )

    return {"message": "Streak freeze applied", "date": str(yesterday), "freezesRemaining": max_freezes - used - 1}


@router.get("/achievements")
async def list_achievements(
    db:  AsyncSession = Depends(get_db),
    ctx: AuthContext  = Depends(get_current_user),
):
    """List all achievements — earned and available."""
    earned_result = await db.execute(
        text("SELECT badge_key, earned_at FROM achievements WHERE user_id = :uid"),
        {"uid": ctx.user_id},
    )
    earned = {r["badge_key"]: r["earned_at"] for r in earned_result.mappings().all()}

    all_badges = []
    for key, badge in BADGE_DEFS.items():
        all_badges.append({
            "badgeKey": key,
            "title": badge["title"],
            "description": badge["description"],
            "icon": badge["icon"],
            "earned": key in earned,
            "earnedAt": str(earned[key]) if key in earned else None,
        })

    return {"achievements": all_badges, "totalEarned": len(earned), "totalAvailable": len(BADGE_DEFS)}


@router.get("/leaderboard")
async def streak_leaderboard(
    db:  AsyncSession = Depends(get_db),
    ctx: AuthContext  = Depends(get_current_user),
):
    """Weekly leaderboard — top streakers this week."""
    result = await db.execute(
        text("""
            SELECT u.id, u.name, u.avatar_url AS "avatarUrl", u.streak,
                   u.best_streak AS "bestStreak", u.solve_count AS "solveCount",
                   COALESCE(dg.actual_solves, 0) AS "todaySolves"
            FROM users u
            LEFT JOIN daily_goals dg ON dg.user_id = u.id AND dg.date = CURRENT_DATE
            WHERE u.role = 'student' AND u.streak > 0
            ORDER BY u.streak DESC, u.solve_count DESC
            LIMIT 20
        """),
    )
    rows = result.mappings().all()
    leaderboard = []
    for i, r in enumerate(rows, 1):
        leaderboard.append({
            "rank": i,
            "userId": str(r["id"]),
            "name": r["name"],
            "avatarUrl": r["avatarUrl"],
            "streak": r["streak"],
            "bestStreak": r["bestStreak"],
            "solveCount": r["solveCount"],
            "todaySolves": r["todaySolves"],
            "isMe": str(r["id"]) == str(ctx.user_id),
        })
    return {"leaderboard": leaderboard}
