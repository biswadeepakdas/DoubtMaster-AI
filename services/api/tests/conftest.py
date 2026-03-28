"""
Shared pytest fixtures for unit and integration tests.
All integration tests depend on fixtures defined here.
Run `make seed-test-db` before running integration tests for the first time.
"""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import text

from app.main import app
from app.core.config import settings
from app.core.auth import create_access_token

# ── Event loop ────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ── Database session ──────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="function")
async def db() -> AsyncGenerator[AsyncSession, None]:
    engine  = create_async_engine(settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"))
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as session:
        yield session
        await session.rollback()   # roll back after each test — no persistent side effects
    await engine.dispose()


# ── JWT token factories ───────────────────────────────────────────────────────

@pytest.fixture
def free_student_id() -> str:
    return str(uuid.uuid4())

@pytest.fixture
def pro_student_id() -> str:
    return str(uuid.uuid4())

@pytest.fixture
def test_access_token_free(free_student_id) -> str:
    return create_access_token(
        user_id=free_student_id, email="student@test.com",
        role="student", is_pro=False,
    )

@pytest.fixture
def test_access_token_pro(pro_student_id) -> str:
    return create_access_token(
        user_id=pro_student_id, email="pro@test.com",
        role="student", is_pro=True,
    )

@pytest.fixture
def auth_headers_free(test_access_token_free) -> dict:
    return {"Authorization": f"Bearer {test_access_token_free}"}

@pytest.fixture
def auth_headers_pro(test_access_token_pro) -> dict:
    return {"Authorization": f"Bearer {test_access_token_pro}"}


# ── Pre-seeded data fixtures ──────────────────────────────────────────────────

@pytest_asyncio.fixture
async def two_classroom_sessions(db: AsyncSession, free_student_id: str):
    """Insert 2 classroom sessions for the free student to trigger quota exceeded."""
    for _ in range(2):
        await db.execute(
            text("""
                INSERT INTO classroom_sessions
                    (student_id, status, mode, subject, topic, syllabus)
                VALUES
                    (:sid, 'ready', 'explain', 'physics', 'Newton', 'CBSE')
            """),
            {"sid": free_student_id},
        )
    await db.commit()
    yield
    await db.execute(
        text("DELETE FROM classroom_sessions WHERE student_id = :sid"),
        {"sid": free_student_id},
    )
    await db.commit()


@pytest_asyncio.fixture
async def generating_session(db: AsyncSession, free_student_id: str):
    """Insert a classroom session in 'generating' state for status polling tests."""
    result = await db.execute(
        text("""
            INSERT INTO classroom_sessions
                (student_id, status, mode, subject, topic, syllabus, openmaic_job_id)
            VALUES
                (:sid, 'generating', 'explain', 'physics', 'Newton', 'CBSE', 'job-test-123')
            RETURNING id
        """),
        {"sid": free_student_id},
    )
    session_id = result.scalar()
    await db.commit()

    class _Session:
        id = session_id

    yield _Session()

    await db.execute(
        text("DELETE FROM classroom_sessions WHERE id = :id"),
        {"id": str(session_id)},
    )
    await db.commit()


# ── ASGI test client ──────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
