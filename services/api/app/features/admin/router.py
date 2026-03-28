"""Admin endpoints — restricted to admin role."""
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, require_admin
from app.core.database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/llm-costs")
async def llm_costs(
    db:  AsyncSession = Depends(get_db),
    ctx: AuthContext   = Depends(require_admin),
):
    """LLM cost breakdown by tier for the last 30 days."""
    result = await db.execute(text("""
        SELECT
            tier,
            model,
            COUNT(*)                                    AS requests,
            SUM(input_tokens)                           AS total_input_tokens,
            SUM(output_tokens)                          AS total_output_tokens,
            ROUND(AVG(latency_ms))                      AS avg_latency_ms,
            SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)  AS cache_hits
        FROM llm_routing_log
        WHERE created_at > now() - INTERVAL '30 days'
        GROUP BY tier, model
        ORDER BY tier, model
    """))
    return {"data": [dict(r) for r in result.mappings()]}
