"""
PostgreSQL connection pool.
Uses PgBouncer-compatible settings for Railway's managed Postgres.
Railway provides DATABASE_URL with connection pooling via PgBouncer on port 5432.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# Railway Postgres — standard pool for long-lived uvicorn processes.
# NullPool is only needed in true serverless (Lambda/Functions) — not Railway.
engine = create_async_engine(
    settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"),
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,                  # detect stale connections
    pool_recycle=300,                    # recycle every 5 min
    connect_args={
        "statement_cache_size": 0,       # required for PgBouncer in transaction mode
        "prepared_statement_cache_size": 0,
    },
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def set_rls_context(db: AsyncSession, user_id: str):
    """Set PostgreSQL session variable for RLS policy evaluation.
    Uses parameterized SET LOCAL to prevent any SQL injection risk even
    though user_id is always a UUID from a validated JWT claim.
    """
    await db.execute(
        text("SELECT set_config('app.current_user_id', :uid, true)"),
        {"uid": str(user_id)},
    )
    yield
