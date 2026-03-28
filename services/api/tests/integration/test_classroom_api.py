"""Integration tests for classroom generation API."""

import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.mark.asyncio
class TestClassroomGenerate:
    async def test_free_user_within_quota_gets_202(self, auth_headers_free, db):
        with patch("app.features.classroom.service.openmaic_client") as oc, \
             patch("app.core.llm_router.classify_hindi", new=AsyncMock(return_value={"is_hindi": False})):
            oc.health_check       = AsyncMock(return_value=True)
            oc.submit_classroom_job = AsyncMock(return_value="job-123")

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                r = await ac.post(
                    "/api/v1/classroom/generate",
                    json={"mode": "explain", "subject": "physics",
                          "topic": "Newton's Laws", "syllabus": "CBSE"},
                    headers=auth_headers_free,
                )

        assert r.status_code == 202
        body = r.json()
        assert "session_id" in body
        assert body["status"] == "generating"

    async def test_free_user_quota_exceeded_gets_429(self, auth_headers_free, db, two_classroom_sessions):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            r = await ac.post(
                "/api/v1/classroom/generate",
                json={"mode": "quiz", "subject": "maths",
                      "topic": "Quadratics", "syllabus": "CBSE"},
                headers=auth_headers_free,
            )
        assert r.status_code == 429

    async def test_unauthenticated_gets_401(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            r = await ac.post(
                "/api/v1/classroom/generate",
                json={"mode": "explain", "subject": "physics",
                      "topic": "Test", "syllabus": "CBSE"},
            )
        assert r.status_code == 401

    async def test_sql_injection_in_topic_gets_422(self, auth_headers_free):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            r = await ac.post(
                "/api/v1/classroom/generate",
                json={"mode": "explain", "subject": "physics",
                      "topic": "'; DROP TABLE classroom_sessions; --",
                      "syllabus": "CBSE"},
                headers=auth_headers_free,
            )
        assert r.status_code == 422

    async def test_xss_in_subject_gets_422(self, auth_headers_free):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            r = await ac.post(
                "/api/v1/classroom/generate",
                json={"mode": "explain", "subject": "<script>alert(1)</script>",
                      "topic": "Newton", "syllabus": "CBSE"},
                headers=auth_headers_free,
            )
        assert r.status_code == 422

    async def test_status_returns_url_when_ready(self, auth_headers_free, db, generating_session):
        with patch("app.features.classroom.service.openmaic_client") as oc:
            oc.poll_job_status = AsyncMock(return_value={
                "status":       "completed",
                "classroomUrl": "https://classroom.doubtmaster.ai/c/abc",
            })
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                r = await ac.get(
                    f"/api/v1/classroom/status/{generating_session.id}",
                    headers=auth_headers_free,
                )
        assert r.status_code == 200


@pytest.mark.asyncio
class TestAuthSecurity:
    async def test_rate_limit_on_login(self):
        """Login endpoint must reject after 5 attempts per minute."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            for _ in range(5):
                await ac.post("/api/v1/auth/login",
                              json={"email": "x@x.com", "password": "wrong"})
            r = await ac.post("/api/v1/auth/login",
                              json={"email": "x@x.com", "password": "wrong"})
        assert r.status_code == 429
        assert "Retry-After" in r.headers

    async def test_security_headers_present(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            r = await ac.get("/health")
        assert r.headers.get("x-content-type-options") == "nosniff"
        assert r.headers.get("x-frame-options")        == "DENY"
        assert "strict-transport-security" in r.headers

    async def test_request_id_in_all_responses(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            r = await ac.get("/health")
        assert "x-request-id" in r.headers

    async def test_audit_json_valid(self, db):
        """audit() must produce valid JSONB — not Python repr strings."""
        from app.core.audit import audit
        # Should not raise PostgreSQL cast error
        await audit(db, "test.action", metadata={"key": "value", "num": 42})
