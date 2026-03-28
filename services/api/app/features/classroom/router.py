from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.auth import AuthContext, get_current_user
from app.core.database import get_db, set_rls_context
from app.features.classroom import openmaic_client, service
from app.features.classroom.types import GenerateClassroomRequest, ClassroomStatusResponse

router = APIRouter(prefix="/classroom", tags=["classroom"])

@router.post("/generate", response_model=ClassroomStatusResponse, status_code=202)
async def generate(
    req:     GenerateClassroomRequest,
    request: Request,
    db:      AsyncSession = Depends(get_db),
    ctx:     AuthContext   = Depends(get_current_user),
):
    async with set_rls_context(db, ctx.user_id):
        ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()
        return await service.generate_classroom(req, UUID(ctx.user_id), db, ip=ip)

@router.get("/status/{session_id}", response_model=ClassroomStatusResponse)
async def get_status(
    session_id: UUID,
    db:         AsyncSession = Depends(get_db),
    ctx:        AuthContext   = Depends(get_current_user),
):
    async with set_rls_context(db, ctx.user_id):
        result = await db.execute(
            text("SELECT * FROM classroom_sessions WHERE id = :id"),
            {"id": str(session_id)},
        )
        session = result.mappings().one_or_none()
        if not session:
            raise HTTPException(404, "Session not found")
        return ClassroomStatusResponse(
            session_id=str(session["id"]),
            status=session["status"],
            classroom_url=session["openmaic_classroom_url"],
            error_message=session["error_message"],
        )
