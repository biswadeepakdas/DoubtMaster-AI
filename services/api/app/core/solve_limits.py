"""Free-tier caps on homework solves (text + image). Pro/Champion/admin unlimited."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import HTTPException

# Count only real homework flows — not mock tests or other sources.
FREE_HOMEWORK_SOLVE_LIMIT = 5


async def count_homework_solves(db: AsyncSession, user_id: str) -> int:
    result = await db.execute(
        text(
            """
            SELECT COUNT(*) FROM questions
            WHERE user_id = :uid AND source IN ('text', 'image')
            """
        ),
        {"uid": user_id},
    )
    return int(result.scalar_one() or 0)


async def user_has_unlimited_homework_solves(db: AsyncSession, user_id: str, role: str) -> bool:
    if role == "admin":
        return True
    row = await db.execute(
        text("SELECT is_pro, plan FROM users WHERE id = :id"),
        {"id": user_id},
    )
    u = row.mappings().one_or_none()
    if not u:
        return False
    if u["is_pro"]:
        return True
    plan = (u["plan"] or "").strip().lower()
    return plan in ("pro", "champion")


async def assert_homework_solve_allowed(db: AsyncSession, user_id: str, role: str) -> None:
    if await user_has_unlimited_homework_solves(db, user_id, role):
        return
    used = await count_homework_solves(db, user_id)
    if used >= FREE_HOMEWORK_SOLVE_LIMIT:
        raise HTTPException(
            status_code=403,
            detail={
                "message": (
                    f"You've used all {FREE_HOMEWORK_SOLVE_LIMIT} free solves. "
                    "Upgrade to Pro for unlimited step-by-step homework help."
                ),
                "code": "FREE_SOLVE_LIMIT",
                "used": used,
                "limit": FREE_HOMEWORK_SOLVE_LIMIT,
            },
        )


async def get_homework_solve_quota(db: AsyncSession, user_id: str, role: str) -> dict:
    unlimited = await user_has_unlimited_homework_solves(db, user_id, role)
    used = await count_homework_solves(db, user_id)
    if unlimited:
        return {
            "used": used,
            "limit": None,
            "remaining": None,
            "unlimited": True,
        }
    remaining = max(0, FREE_HOMEWORK_SOLVE_LIMIT - used)
    return {
        "used": used,
        "limit": FREE_HOMEWORK_SOLVE_LIMIT,
        "remaining": remaining,
        "unlimited": False,
    }
