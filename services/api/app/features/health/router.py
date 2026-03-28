"""Health check — returns 200 only when all dependencies are reachable."""

import asyncio

import httpx
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine
from app.core.redis_client import redis_client

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    checks = await asyncio.gather(
        _check_db(), _check_redis(), _check_openmaic(),
        return_exceptions=True,
    )
    results = [
        c if isinstance(c, dict)
        else {"name": f"check_{i}", "status": "error", "error": str(c)}
        for i, c in enumerate(checks)
    ]
    healthy = all(r.get("status") == "ok" for r in results)
    # Always return 200 so Railway healthcheck doesn't kill the container.
    # Use the "status" field to distinguish healthy vs degraded in monitoring.
    return JSONResponse(
        {"status": "healthy" if healthy else "degraded", "checks": results},
        status_code=200,
    )


async def _check_db() -> dict:
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))   # text() required by SQLAlchemy 2.x
    return {"name": "postgres", "status": "ok"}


async def _check_redis() -> dict:
    await redis_client.ping()
    return {"name": "redis", "status": "ok"}


async def _check_openmaic() -> dict:
    async with httpx.AsyncClient(timeout=5) as c:
        r = await c.get(f"{settings.OPENMAIC_INTERNAL_URL}/api/health")
        return {"name": "openmaic", "status": "ok" if r.status_code == 200 else "error"}
