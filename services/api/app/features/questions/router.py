"""Questions router — text-solve, image-solve, history, learn-mode."""

import json
import logging
import math
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.solve_limits import assert_homework_solve_allowed
from app.core import llm_router

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/questions", tags=["questions"])

# ── Structured solve prompt ────────────────────────────────────────────────────

SOLVE_SYSTEM = (
    "You are an expert CBSE/ICSE tutor for Indian students (grades 6-12). "
    "Solve the student's question step by step. "
    "Return ONLY valid JSON with this exact structure (no markdown, no extra text):\n"
    '{"subject":"Math","confidence":0.95,'
    '"steps":[{"step":1,"title":"...","content":"...","formula":"","explanation":""}],'
    '"finalAnswer":"...","conceptSummary":"...","conceptTags":["..."],'
    '"alternativeMethod":"",'
    '"diagram":"",'
    '"animation":{"code":"","title":"","description":""}}'
    "\n\nRules for diagram and animation fields:\n"
    "- Prefer complete step-by-step JSON first.\n"
    "- Add a visual aid when it genuinely improves understanding (especially Physics/Chemistry/Biology flow/process questions).\n"
    "- diagram: concise Mermaid only when useful. Max 12 lines.\n"
    "- animation.code: concise p5.js only when useful. Max 20 lines.\n"
    "- If space is limited, keep detailed steps and set diagram/animation to ''.\n"
    "- animation.title: short title like 'Projectile Motion' or leave ''\n"
    "- animation.description: one sentence explaining the animation, or ''"
)

RETRY_COMPACT_SYSTEM = (
    "You are an expert CBSE/ICSE tutor for Indian students (grades 6-12). "
    "Return ONLY valid JSON (no markdown, no extra text) with this exact structure:\n"
    '{"subject":"General","confidence":0.95,'
    '"steps":[{"step":1,"title":"...","content":"...","formula":"","explanation":""}],'
    '"finalAnswer":"...","conceptSummary":"...","conceptTags":["..."],'
    '"alternativeMethod":"",'
    '"diagram":"",'
    '"animation":{"code":"","title":"","description":""}}'
    "\nRules:\n"
    "- Prioritize complete valid JSON over detail.\n"
    "- Keep 4-8 steps.\n"
    "- Keep each content and explanation concise.\n"
    "- ALWAYS set diagram to ''.\n"
    "- ALWAYS set animation.code, animation.title, animation.description to ''.\n"
    "- Never include Mermaid or p5 code."
)


def _normalize_solution(data: dict[str, Any]) -> dict[str, Any]:
    """Ensure the solution object shape is stable for frontend rendering."""
    normalized = dict(data) if isinstance(data, dict) else {}
    steps = normalized.get("steps", [])

    if isinstance(steps, str):
        steps = [{
            "step": 1,
            "stepNumber": 1,
            "title": "Solution",
            "content": steps,
            "formula": "",
            "explanation": "",
        }]
    elif not isinstance(steps, list):
        steps = []

    cleaned_steps: list[dict[str, Any]] = []
    for idx, item in enumerate(steps, start=1):
        if isinstance(item, dict):
            step_no = item.get("stepNumber", item.get("step", idx))
            cleaned_steps.append({
                "step": step_no,
                "stepNumber": step_no,
                "title": str(item.get("title", f"Step {idx}")),
                "content": str(item.get("content", "")),
                "formula": str(item.get("formula", "")),
                "explanation": str(item.get("explanation", "")),
                "commonMistake": str(item.get("commonMistake", "")),
                "tip": str(item.get("tip", "")),
            })
        else:
            cleaned_steps.append({
                "step": idx,
                "stepNumber": idx,
                "title": f"Step {idx}",
                "content": str(item),
                "formula": "",
                "explanation": "",
                "commonMistake": "",
                "tip": "",
            })

    normalized["steps"] = cleaned_steps
    normalized["subject"] = str(normalized.get("subject", "General"))
    normalized["confidence"] = float(normalized.get("confidence", 0.8) or 0.8)
    normalized["finalAnswer"] = str(normalized.get("finalAnswer", ""))
    normalized["conceptSummary"] = str(normalized.get("conceptSummary", ""))
    tags = normalized.get("conceptTags", [])
    normalized["conceptTags"] = tags if isinstance(tags, list) else []
    normalized["alternativeMethod"] = str(normalized.get("alternativeMethod", ""))
    normalized["diagram"] = str(normalized.get("diagram", "") or "")
    anim = normalized.get("animation", {})
    if isinstance(anim, dict):
        normalized["animation"] = {
            "code": str(anim.get("code", "") or ""),
            "title": str(anim.get("title", "") or ""),
            "description": str(anim.get("description", "") or ""),
        }
    else:
        normalized["animation"] = {"code": "", "title": "", "description": ""}
    return normalized


def _try_parse_json(raw: str) -> Optional[dict[str, Any]]:
    """Parse first JSON object from a possibly noisy model response."""
    clean = (raw or "").strip()
    if not clean:
        return None

    import re

    # Normalize partial markdown fences like ```json ... (without closing ```).
    clean = re.sub(r"^\s*```(?:json)?\s*", "", clean, flags=re.IGNORECASE)
    clean = re.sub(r"\s*```\s*$", "", clean)

    decoder = json.JSONDecoder()

    # Try direct parse first.
    try:
        parsed, _ = decoder.raw_decode(clean)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    # Try fenced blocks.
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", clean, re.IGNORECASE)
    if fence_match:
        fenced = fence_match.group(1).strip()
        try:
            parsed, _ = decoder.raw_decode(fenced)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

    # Try from first object start.
    first_brace = clean.find("{")
    if first_brace != -1:
        try:
            parsed, _ = decoder.raw_decode(clean[first_brace:])
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

    # Truncation-repair: long responses are often cut inside animation payloads.
    repaired = clean
    first_obj_start = repaired.find("{")
    if first_obj_start != -1:
        repaired = repaired[first_obj_start:]
    if '"animation"' in repaired:
        repaired = re.sub(
            r'"animation"\s*:\s*\{[\s\S]*$',
            '"animation":{"code":"","title":"","description":""}}',
            repaired,
        )
        try:
            parsed, _ = decoder.raw_decode(repaired)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

    return None


def _parse_solution(raw: str) -> dict:
    """Parse LLM JSON response, with fallback for non-JSON output."""
    parsed = _try_parse_json(raw)
    if parsed is not None:
        return _normalize_solution(parsed)

    # Fallback: wrap raw text as a single step
    return _normalize_solution({
        "subject": "General",
        "confidence": 0.8,
        "steps": [{"step": 1, "title": "Solution", "content": raw, "formula": ""}],
        "finalAnswer": raw,
        "conceptSummary": "",
        "conceptTags": [],
        "alternativeMethod": "",
    })


def _is_poor_solution_shape(solution: dict[str, Any]) -> bool:
    steps = solution.get("steps", [])
    if not isinstance(steps, list) or len(steps) == 0:
        return True
    if len(steps) == 1:
        first = steps[0] if isinstance(steps[0], dict) else {}
        is_fallback = (
            str(first.get("title", "")).strip().lower() == "solution"
            and str(solution.get("subject", "General")).strip().lower() == "general"
        )
        return is_fallback
    return False


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

    await assert_homework_solve_allowed(db, ctx.user_id, ctx.role)

    # Call LLM
    resp = await llm_router.call("homework_solve", SOLVE_SYSTEM, body.textQuestion, max_tokens=4096)
    solution = _parse_solution(resp.content)
    finish_reason = (resp.finish_reason or "").lower() if getattr(resp, "finish_reason", None) else ""
    if finish_reason in {"length", "max_tokens"} or _is_poor_solution_shape(solution):
        retry_resp = await llm_router.call("homework_solve", RETRY_COMPACT_SYSTEM, body.textQuestion, max_tokens=4096)
        retry_solution = _parse_solution(retry_resp.content)
        if len(retry_solution.get("steps", [])) >= len(solution.get("steps", [])):
            resp = retry_resp
            solution = retry_solution

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

    # Save solution to DB so history can retrieve it without re-solving
    import json as _json
    await db.execute(
        text("""
            INSERT INTO solutions (question_id, steps, final_answer, confidence, model_used,
                                   concept_tags, alternative_method)
            VALUES (:qid, :steps, :ans, :conf, :model, :tags, :alt)
        """),
        {
            "qid":   question_id,
            "steps": _json.dumps(solution.get("steps", [])),
            "ans":   solution.get("finalAnswer", ""),
            "conf":  solution.get("confidence", 0.95),
            "model": resp.model if hasattr(resp, "model") else None,
            "tags":  solution.get("conceptTags", []),
            "alt":   solution.get("alternativeMethod", ""),
        },
    )

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
                SELECT id, text AS "extractedText", subject, topic, board, language,
                       created_at AS "createdAt"
                FROM questions
                WHERE user_id = :uid AND text ILIKE :q
                ORDER BY created_at DESC LIMIT :lim OFFSET :off
            """),
            {"uid": ctx.user_id, "q": f"%{search}%", "lim": safe_limit, "off": offset},
        )
    else:
        result = await db.execute(
            text("""
                SELECT id, text AS "extractedText", subject, topic, board, language,
                       created_at AS "createdAt"
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

    # Retrieve saved solution from DB (no LLM call needed)
    sol_result = await db.execute(
        text("""
            SELECT steps, final_answer AS "finalAnswer", confidence,
                   concept_tags AS "conceptTags", alternative_method AS "alternativeMethod"
            FROM solutions
            WHERE question_id = :qid
            ORDER BY created_at DESC
            LIMIT 1
        """),
        {"qid": question_id},
    )
    sol = sol_result.mappings().one_or_none()

    if sol:
        import json as _json
        raw_steps = sol["steps"]
        steps = raw_steps if isinstance(raw_steps, list) else _json.loads(raw_steps or "[]")
        solution = {
            "steps":             steps,
            "finalAnswer":       sol["finalAnswer"] or "",
            "confidence":        float(sol["confidence"] or 0.9),
            "conceptTags":       sol["conceptTags"] or [],
            "alternativeMethod": sol["alternativeMethod"] or "",
        }
    else:
        # Fallback: re-solve if no saved solution (old questions pre-this fix)
        resp = await llm_router.call("homework_solve", SOLVE_SYSTEM, q["extractedText"], max_tokens=4096)
        parsed = _parse_solution(resp.content)
        solution = {
            "steps":             parsed.get("steps", []),
            "finalAnswer":       parsed.get("finalAnswer", ""),
            "confidence":        parsed.get("confidence", 0.9),
            "conceptTags":       parsed.get("conceptTags", []),
            "alternativeMethod": parsed.get("alternativeMethod", ""),
        }

    return {
        "id":            str(q["id"]),
        "extractedText": q["extractedText"],
        "subject":       q["subject"],
        "topic":         q["topic"],
        "board":         q["board"],
        "confidence":    solution["confidence"],
        "createdAt":     str(q["createdAt"]),
        "solution":      solution,
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

    await assert_homework_solve_allowed(db, ctx.user_id, ctx.role)

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
        '"steps":[{"step":1,"title":"...","content":"...","formula":"","explanation":""}],'
        '"finalAnswer":"...","conceptSummary":"...","conceptTags":["..."],"alternativeMethod":"",'
        '"diagram":"",'
        '"animation":{"code":"","title":"","description":""}}'
        " Add a concise diagram or animation only when it helps understanding. "
        "If uncertain, keep diagram/animation empty."
    )

    message = await client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=4096,
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
    if _is_poor_solution_shape(solution):
        retry_message = await client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=4096,
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
                    {
                        "type": "text",
                        "text": RETRY_COMPACT_SYSTEM + "\n\nQuestion extracted from image. Return complete JSON.",
                    },
                ],
            }],
        )
        retry_solution = _parse_solution(retry_message.content[0].text)
        if len(retry_solution.get("steps", [])) >= len(solution.get("steps", [])):
            solution = retry_solution
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

    # Save solution so history retrieval doesn't need to re-solve
    import json as _json
    await db.execute(
        text("""
            INSERT INTO solutions (question_id, steps, final_answer, confidence, model_used,
                                   concept_tags, alternative_method)
            VALUES (:qid, :steps, :ans, :conf, :model, :tags, :alt)
        """),
        {
            "qid":   question_id,
            "steps": _json.dumps(solution.get("steps", [])),
            "ans":   solution.get("finalAnswer", ""),
            "conf":  solution.get("confidence", 0.9),
            "model": None,
            "tags":  solution.get("conceptTags", []),
            "alt":   solution.get("alternativeMethod", ""),
        },
    )

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
