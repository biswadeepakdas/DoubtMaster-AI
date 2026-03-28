from uuid import UUID
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.audit import audit
from app.features.classroom import openmaic_client
from app.features.classroom.types import GenerateClassroomRequest, ClassroomStatusResponse, ClassroomStatus

FREE_USER_DAILY_LIMIT = 2

async def generate_classroom(
    req: GenerateClassroomRequest,
    student_id: UUID,
    db: AsyncSession,
    ip: str = "",
) -> ClassroomStatusResponse:
    # Quota check for free users
    count_result = await db.execute(
        text("""
            SELECT COUNT(*) FROM classroom_sessions
            WHERE student_id = :sid
              AND created_at > now() - INTERVAL '24 hours'
        """),
        {"sid": str(student_id)},
    )
    if count_result.scalar() >= FREE_USER_DAILY_LIMIT:
        from fastapi import HTTPException
        raise HTTPException(429, "Daily classroom limit reached. Upgrade to Pro for unlimited sessions.")

    # Create session row
    result = await db.execute(
        text("""
            INSERT INTO classroom_sessions
                (student_id, status, mode, subject, topic, syllabus, grade, source_question_id)
            VALUES
                (:sid, 'pending', :mode, :subject, :topic, :syllabus, :grade, :qid)
            RETURNING id
        """),
        {
            "sid":     str(student_id), "mode":    req.mode.value,
            "subject": req.subject,     "topic":   req.topic,
            "syllabus":req.syllabus,    "grade":   req.grade,
            "qid":     str(req.source_question_id) if req.source_question_id else None,
        },
    )
    session_id = result.scalar()

    await audit(db, "classroom.create", user_id=str(student_id),
                resource="classroom_sessions", resource_id=str(session_id),
                ip_address=ip)

    # Submit to OpenMAIC (fire-and-forget; status polling handles completion)
    try:
        job_id = await openmaic_client.submit_classroom_job(
            req.mode.value, req.subject, req.topic, req.syllabus
        )
        await db.execute(
            text("UPDATE classroom_sessions SET openmaic_job_id = :jid, status = 'generating' WHERE id = :id"),
            {"jid": job_id, "id": str(session_id)},
        )
    except Exception as e:
        await db.execute(
            text("UPDATE classroom_sessions SET status = 'failed', error_message = :msg WHERE id = :id"),
            {"msg": str(e), "id": str(session_id)},
        )
        raise

    return ClassroomStatusResponse(
        session_id=str(session_id),
        status=ClassroomStatus.generating,
        classroom_url=None,
        error_message=None,
    )
