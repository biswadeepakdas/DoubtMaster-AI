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

# Ensure asyncpg driver is used
_db_url = settings.DATABASE_URL
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    _db_url,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    },
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def init_db():
    """Create all tables if they don't exist. Idempotent — safe to run every startup."""
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                phone         TEXT UNIQUE,
                email         TEXT UNIQUE,
                password_hash TEXT,
                name          TEXT NOT NULL,
                class         INTEGER DEFAULT 10,
                board         TEXT DEFAULT 'CBSE',
                language      TEXT DEFAULT 'en',
                plan          TEXT DEFAULT 'free',
                role          TEXT DEFAULT 'student',
                is_pro        BOOLEAN DEFAULT false,
                avatar_url    TEXT,
                solve_count   INTEGER DEFAULT 0,
                streak        INTEGER DEFAULT 0,
                best_streak   INTEGER DEFAULT 0,
                last_active_at TIMESTAMPTZ,
                created_at    TIMESTAMPTZ DEFAULT now(),
                updated_at    TIMESTAMPTZ DEFAULT now()
            )
        """))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS questions (
                id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                text         TEXT NOT NULL,
                image_url    TEXT,
                subject      TEXT NOT NULL,
                topic        TEXT,
                class        INTEGER,
                board        TEXT DEFAULT 'CBSE',
                difficulty   TEXT DEFAULT 'medium',
                language     TEXT DEFAULT 'en',
                source       TEXT DEFAULT 'text',
                solve_time_ms INTEGER,
                created_at   TIMESTAMPTZ DEFAULT now()
            )
        """))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_questions_user ON questions(user_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject)"))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS solutions (
                id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                question_id        UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
                steps              JSONB NOT NULL DEFAULT '[]',
                final_answer       TEXT NOT NULL,
                confidence         REAL DEFAULT 0.95,
                model_used         TEXT,
                concept_tags       TEXT[] DEFAULT '{}',
                related_pyqs       TEXT[] DEFAULT '{}',
                alternative_method TEXT,
                review_verdict     TEXT,
                review_score       INTEGER,
                from_cache         BOOLEAN DEFAULT false,
                created_at         TIMESTAMPTZ DEFAULT now()
            )
        """))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS subscriptions (
                id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                plan                     TEXT NOT NULL,
                billing_cycle            TEXT NOT NULL,
                amount_inr               INTEGER NOT NULL,
                razorpay_subscription_id TEXT,
                razorpay_payment_id      TEXT,
                status                   TEXT DEFAULT 'active',
                starts_at                TIMESTAMPTZ DEFAULT now(),
                expires_at               TIMESTAMPTZ NOT NULL,
                cancelled_at             TIMESTAMPTZ,
                created_at               TIMESTAMPTZ DEFAULT now()
            )
        """))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_progress (
                id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                date             DATE NOT NULL DEFAULT CURRENT_DATE,
                questions_solved INTEGER DEFAULT 0,
                correct_count    INTEGER DEFAULT 0,
                subjects_data    JSONB DEFAULT '{}',
                weak_topics      TEXT[] DEFAULT '{}',
                study_minutes    INTEGER DEFAULT 0,
                UNIQUE(user_id, date)
            )
        """))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash  TEXT NOT NULL UNIQUE,
                family      TEXT NOT NULL,
                device_info TEXT,
                ip_address  TEXT,
                expires_at  TIMESTAMPTZ NOT NULL,
                revoked_at  TIMESTAMPTZ,
                created_at  TIMESTAMPTZ DEFAULT now()
            )
        """))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash)"))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS classroom_sessions (
                id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                student_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                openmaic_job_id        TEXT,
                openmaic_classroom_url TEXT,
                status                 TEXT NOT NULL DEFAULT 'pending',
                mode                   TEXT NOT NULL,
                subject                TEXT NOT NULL,
                topic                  TEXT NOT NULL,
                syllabus               TEXT NOT NULL DEFAULT 'CBSE',
                grade                  TEXT,
                source_question_id     UUID,
                duration_seconds       INTEGER,
                completed              BOOLEAN DEFAULT false,
                error_message          TEXT,
                created_at             TIMESTAMPTZ DEFAULT now(),
                updated_at             TIMESTAMPTZ DEFAULT now()
            )
        """))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS llm_routing_log (
                id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                student_id    UUID REFERENCES users(id) ON DELETE SET NULL,
                feature       TEXT NOT NULL,
                tier          INTEGER NOT NULL,
                model         TEXT NOT NULL,
                input_tokens  INTEGER,
                output_tokens INTEGER,
                cache_hit     BOOLEAN DEFAULT false,
                latency_ms    INTEGER,
                created_at    TIMESTAMPTZ DEFAULT now()
            )
        """))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
                action     TEXT NOT NULL,
                metadata   JSONB DEFAULT '{}',
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMPTZ DEFAULT now()
            )
        """))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id)"))


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
    await db.execute(
        text("SELECT set_config('app.current_user_id', :uid, true)"),
        {"uid": str(user_id)},
    )
    yield
