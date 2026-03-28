"""
Seed the test database with users and fixtures required by integration and E2E tests.
Run: python scripts/seed_test_data.py
Requires DATABASE_URL to point at the test database.
"""

import asyncio
import bcrypt
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
import os

DATABASE_URL = os.environ["DATABASE_URL"].replace("postgresql://", "postgresql+asyncpg://")

TEST_USERS = [
    {"email": "student@test.com",  "password": "Test1234!", "role": "student", "is_pro": False},
    {"email": "pro@test.com",      "password": "Test1234!", "role": "student", "is_pro": True},
    {"email": "admin@test.com",    "password": "Test1234!", "role": "admin",   "is_pro": True},
    {"email": "loadtest@doubtmaster.ai", "password": "LoadTest1234!", "role": "student", "is_pro": False},
]


async def seed():
    engine = create_async_engine(DATABASE_URL)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as db:
        for u in TEST_USERS:
            pw_hash = bcrypt.hashpw(u["password"].encode(), bcrypt.gensalt()).decode()
            await db.execute(text("""
                INSERT INTO users (email, password_hash, role, is_pro)
                VALUES (:email, :pw, :role, :is_pro)
                ON CONFLICT (email) DO NOTHING
            """), {"email": u["email"], "pw": pw_hash, "role": u["role"], "is_pro": u["is_pro"]})
        await db.commit()
    await engine.dispose()
    print(f"Seeded {len(TEST_USERS)} test users")


asyncio.run(seed())
