"""Questions router — text-solve, image-solve, history, learn-mode."""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, get_current_user
from app.core.database import get_db
from app.core import llm_router

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/questions", tags=["questions"])

# ── Structured solve prompt ────────────────────────────────────────────────────

SOLVE_SYSTEM = (
    "You are an expert CBSE/ICSE tutor for Indian students (grades 6-12). "
    "Solve the student's question step by step. "
    "Return ONLY valid JSON with this exact structure (no markdown, no extra text):\n"
    '{"subject":"Math","confidence":0.95,"steps":[{"step":1,"title":"...","explanation":"...","latex":""}],'
    '"finalAnswer":"...","conceptSummary":"...","conceptTags":["..."],"alternativeMethod":""}'
)


def _parse_solution(raw: str) -> dict:
    """Parse LLM JSON response, with fallback for non-JSON output."""
    try:
        # Strip markdown code fences if present
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        return json.loads(clean.strip())
    except Exception:
        # Fallback: wrap raw text as a single step
        return {
            "subject": "General",
            "confidence": 0.8,
            "steps": [{"step": 1, "title": "Solution", "explanation": raw, "latex": ""}],
            "finalAnswer": raw,
            "conceptSummary": "",
            "conceptTags": [],
            "alternativeMethod": "",
        }


# ── Text solve ────────────────────────────────────────────────────────────────

class TextSolveRequest(BaseModel):
    textQuestion: str
    board:        str = "CBSE"
    language:     str = "en"
    class_:       Optional[int] = None

    model_config = {"populate_by_name": True}


@router.post("/text-solve")
async def text_solve(
    body: TextSolveRequest,
    db:   AsyncSession = Depends(get_db),
    ctx:  AuthContext  = Depends(get_current_user),
):
    if len(body.textQuestion.strip()) < 5:
        raise HTTPException(400, "Question too short")

    # Call LLM
    resp = await llm_router.call("homework_solve", SOLVE_SYSTEM, body.textQuestion)
    solution = _parse_solution(resp.content)

    subject = solution.get("subject", "General")

    # Save question to DB
    result = await db.execute(
        text("""
            INSERT INTO questions (user_id, text, subject, topic, board, language, source, solve_time_ms)
            VALUES (:uid, :txt, :subj, :topic, :board, :lang, 'text', :ms)
            RETURNING id
        """),
        {
            "uid":   ctx.user_id,
            "txt":   body.textQuestion.strip(),
            "subj":  subject,
            "topic": solution.get("conceptTags", [""])[0] if solution.get("conceptTags") else None,
            "board": body.board,
            "lang":  body.language,
            "ms":    resp.latency_ms,
        },
    )
    question_id = str(result.scalar_one())

    # Increment solve_count
    await db.execute(
        text("UPDATE users SET solve_count = solve_count + 1, last_active_at = now() WHERE id = :id"),
        {"id": ctx.user_id},
    )

    await llm_router.log_routing(db, "homework_solve", resp, student_id=ctx.user_id)

    return {
        "questionId":    question_id,
        "subject":       subject,
        "confidence":    solution.get("confidence", 0.95),
        "extractedText": body.textQuestion.strip(),
        "solution": {
            "steps":              solution.get("steps", []),
            "finalAnswer":        solution.get("finalAnswer", ""),
            "conceptSummary":     solution.get("conceptSummary", ""),
            "conceptTags":        solution.get("conceptTags", []),
            "alternativeMethod":  solution.get("alternativeMethod", ""),
            "learnModeRequired":  False,
            "visibleSteps":       len(solution.get("steps", [])),
            "totalSteps":         len(solution.get("steps", [])),
        },
    }


# ── History ───────────────────────────────────────────────────────────────────

@router.get("/history")
async def history(
    limit:  int = 10,
    search: Optional[str] = None,
    db:     AsyncSession = Depends(get_db),
    ctx:    AuthContext  = Depends(get_current_user),
):
    if search:
        result = await db.execute(
            text("""
                SELECT id, text, subject, topic, board, created_at
                FROM questions
                WHERE user_id = :uid AND text ILIKE :q
                ORDER BY created_at DESC LIMIT :lim
            """),
            {"uid": ctx.user_id, "q": f"%{search}%", "lim": min(limit, 50)},
        )
    else:
        result = await db.execute(
            text("""
                SELECT id, text, subject, topic, board, created_at
                FROM questions
                WHERE user_id = :uid
                ORDER BY created_at DESC LIMIT :lim
            """),
            {"uid": ctx.user_id, "lim": min(limit, 50)},
        )
    rows = result.mappings().all()
    return {"questions": [dict(r) for r in rows]}


# ── Learn mode ────────────────────────────────────────────────────────────────

class LearnRequest(BaseModel):
    response: str


@router.post("/{question_id}/learn")
async def learn_mode(
    question_id: str,
    body:        LearnRequest,
    db:          AsyncSession = Depends(get_db),
    ctx:         AuthContext  = Depends(get_current_user),
):
    # Fetch original question
    result = await db.execute(
        text("SELECT text, subject FROM questions WHERE id = :qid AND user_id = :uid"),
        {"qid": question_id, "uid": ctx.user_id},
    )
    q = result.mappings().one_or_none()
    if not q:
        raise HTTPException(404, "Question not found")

    eval_prompt = (
        f"Original question: {q['text']}\n\n"
        f"Student's answer: {body.response}\n\n"
        "Evaluate the student's answer. Return ONLY JSON: "
        '{"score":0-100,"passed":true/false,"feedback":"..."}'
    )
    resp = await llm_router.call("quiz_grade", SOLVE_SYSTEM, eval_prompt, max_tokens=256)
    try:
        result_data = json.loads(resp.content.strip())
    except Exception:
        result_data = {"score": 70, "passed": True, "feedback": resp.content}

    return result_data
