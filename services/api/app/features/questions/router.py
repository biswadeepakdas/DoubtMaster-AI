"""Questions router — text-solve, image-solve, history, learn-mode."""

import json
import logging
import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core import llm_router

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/questions", tags=["questions"])

# ── Structured solve prompt ────────────────────────────────────────────────────

SOLVE_SYSTEM = (
    "You are an expert CBSE/ICSE tutor for Indian students (grades 6-12). "
    "Solve the student's question step by step. "
    "Return ONLY valid JSON with this exact structure (no markdown, no extra text):\n"
    '{"subject":"Math","confidence":0.95,'
    '"steps":[{"step":1,"title":"...","explanation":"...","latex":""}],'
    '"finalAnswer":"...","conceptSummary":"...","conceptTags":["..."],'
    '"alternativeMethod":"",'
    '"diagram":"",'
    '"animation":{"code":"","title":"","description":""}}'
    "\n\nRules for diagram and animation fields:\n"
    "- diagram: Include valid Mermaid.js code ONLY for Biology (cell diagrams, processes), "
    "Chemistry (reaction diagrams), or when a flowchart aids understanding. "
    "Leave empty string '' for Math/Physics pure calculations.\n"
    "- animation.code: Include valid p5.js code ONLY for Math (graphs, geometry), "
    "Physics (motion, waves, optics), or visual concepts. "
    "The p5.js code must define setup() and draw() functions. "
    "Canvas size: createCanvas(400, 300). Use simple, clear visuals. "
    "Leave empty string '' if not applicable.\n"
    "- animation.title: short title like 'Projectile Motion' or leave ''\n"
    "- animation.description: one sentence explaining the animation, or ''"
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

    anim = solution.get("animation", {})
    if isinstance(anim, str):
        anim = {}

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
            "diagram":            solution.get("diagram", "") or "",
            "animation":          anim if anim.get("code") else None,
            "learnModeRequired":  False,
            "visibleSteps":       len(solution.get("steps", [])),
            "totalSteps":         len(solution.get("steps", [])),
        },
    }


# ── History ───────────────────────────────────────────────────────────────────

@router.get("/history")
async def history(
    page:   int = 1,
    limit:  int = 10,
    search: Optional[str] = None,
    db:     AsyncSession = Depends(get_db),
    ctx:    AuthContext  = Depends(get_current_user),
):
    safe_limit = min(limit, 50)
    offset = (page - 1) * safe_limit

    # Count total
    if search:
        count_result = await db.execute(
            text("SELECT COUNT(*) FROM questions WHERE user_id = :uid AND text ILIKE :q"),
            {"uid": ctx.user_id, "q": f"%{search}%"},
        )
    else:
        count_result = await db.execute(
            text("SELECT COUNT(*) FROM questions WHERE user_id = :uid"),
            {"uid": ctx.user_id},
        )
    total = count_result.scalar_one()

    # Fetch page
    if search:
        result = await db.execute(
            text("""
                SELECT id, text, subject, topic, board, language, created_at
                FROM questions
                WHERE user_id = :uid AND text ILIKE :q
                ORDER BY created_at DESC LIMIT :lim OFFSET :off
            """),
            {"uid": ctx.user_id, "q": f"%{search}%", "lim": safe_limit, "off": offset},
        )
    else:
        result = await db.execute(
            text("""
                SELECT id, text, subject, topic, board, language, created_at
                FROM questions
                WHERE user_id = :uid
                ORDER BY created_at DESC LIMIT :lim OFFSET :off
            """),
            {"uid": ctx.user_id, "lim": safe_limit, "off": offset},
        )
    rows = result.mappings().all()

    total_pages = max(1, math.ceil(total / safe_limit))

    return {
        "questions":  [dict(r) for r in rows],
        "total":      total,
        "page":       page,
        "totalPages": total_pages,
    }


# ── Get single question ───────────────────────────────────────────────────────

@router.get("/{question_id}")
async def get_question(
    question_id: str,
    db:  AsyncSession = Depends(get_db),
    ctx: AuthContext  = Depends(get_current_user),
):
    result = await db.execute(
        text("""
            SELECT id, text AS "extractedText", subject, topic, board, language,
                   solve_time_ms, created_at AS "createdAt"
            FROM questions
            WHERE id = :qid AND user_id = :uid
        """),
        {"qid": question_id, "uid": ctx.user_id},
    )
    q = result.mappings().one_or_none()
    if not q:
        raise HTTPException(404, "Question not found")

    # Re-solve to get full solution (stored solution retrieval not yet implemented)
    resp = await llm_router.call("homework_solve", SOLVE_SYSTEM, q["extractedText"])
    solution = _parse_solution(resp.content)

    return {
        "id":            str(q["id"]),
        "extractedText": q["extractedText"],
        "subject":       q["subject"],
        "topic":         q["topic"],
        "board":         q["board"],
        "confidence":    solution.get("confidence", 0.9),
        "createdAt":     str(q["createdAt"]),
        "solution": {
            "steps":             solution.get("steps", []),
            "finalAnswer":       solution.get("finalAnswer", ""),
            "conceptSummary":    solution.get("conceptSummary", ""),
            "conceptTags":       solution.get("conceptTags", []),
            "alternativeMethod": solution.get("alternativeMethod", ""),
        },
    }


# ── Image solve ───────────────────────────────────────────────────────────────

@router.post("/image-solve")
async def image_solve(
    board:    str = "CBSE",
    language: str = "en",
    class_:   Optional[int] = None,
    image:    UploadFile = File(...),
    db:   AsyncSession = Depends(get_db),
    ctx:  AuthContext  = Depends(get_current_user),
):
    import base64
    import anthropic as _anthropic

    # Read image bytes and encode to base64
    image_bytes = await image.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(400, "Image too large (max 10 MB)")

    b64_image = base64.b64encode(image_bytes).decode()
    content_type = image.content_type or "image/jpeg"

    # Use Claude vision to extract text + solve in one shot
    client = _anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    vision_prompt = (
        "This is a homework question from an Indian student. "
        "First extract all the text/question from the image exactly. "
        "Then solve it step by step as a CBSE/ICSE tutor. "
        "Return ONLY valid JSON (no markdown): "
        '{"extractedText":"...","subject":"Math","confidence":0.95,'
        '"steps":[{"step":1,"title":"...","explanation":"...","latex":""}],'
        '"finalAnswer":"...","conceptSummary":"...","conceptTags":["..."],"alternativeMethod":""}'
    )

    message = await client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2048,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": content_type,
                        "data": b64_image,
                    },
                },
                {"type": "text", "text": vision_prompt},
            ],
        }],
    )

    raw = message.content[0].text
    solution = _parse_solution(raw)
    extracted_text = solution.pop("extractedText", "Image question")
    subject = solution.get("subject", "General")

    result = await db.execute(
        text("""
            INSERT INTO questions (user_id, text, subject, topic, board, language, source, solve_time_ms)
            VALUES (:uid, :txt, :subj, :topic, :board, :lang, 'image', 0)
            RETURNING id
        """),
        {
            "uid":   ctx.user_id,
            "txt":   extracted_text,
            "subj":  subject,
            "topic": solution.get("conceptTags", [""])[0] if solution.get("conceptTags") else None,
            "board": board,
            "lang":  language,
        },
    )
    question_id = str(result.scalar_one())

    await db.execute(
        text("UPDATE users SET solve_count = solve_count + 1, last_active_at = now() WHERE id = :id"),
        {"id": ctx.user_id},
    )
    await db.commit()

    anim = solution.get("animation", {})
    if isinstance(anim, str):
        anim = {}

    return {
        "questionId":    question_id,
        "subject":       subject,
        "confidence":    solution.get("confidence", 0.9),
        "extractedText": extracted_text,
        "solution": {
            "steps":             solution.get("steps", []),
            "finalAnswer":       solution.get("finalAnswer", ""),
            "conceptSummary":    solution.get("conceptSummary", ""),
            "conceptTags":       solution.get("conceptTags", []),
            "alternativeMethod": solution.get("alternativeMethod", ""),
            "diagram":           solution.get("diagram", "") or "",
            "animation":         anim if anim.get("code") else None,
            "learnModeRequired": False,
            "visibleSteps":      len(solution.get("steps", [])),
            "totalSteps":        len(solution.get("steps", [])),
        },
    }


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
