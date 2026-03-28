"""HTTP-only bridge to OpenMAIC sidecar. NEVER import OpenMAIC Python modules."""
import httpx
from app.core.config import settings

BASE = settings.OPENMAIC_INTERNAL_URL

async def health_check() -> bool:
    async with httpx.AsyncClient(timeout=5) as c:
        r = await c.get(f"{BASE}/api/health")
        return r.status_code == 200

async def submit_classroom_job(mode: str, subject: str, topic: str, syllabus: str) -> str:
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(f"{BASE}/api/classroom/generate", json={
            "mode": mode, "subject": subject, "topic": topic, "syllabus": syllabus,
        })
        r.raise_for_status()
        return r.json()["job_id"]

async def poll_job_status(job_id: str) -> dict:
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(f"{BASE}/api/classroom/status/{job_id}")
        r.raise_for_status()
        return r.json()
