"""Mock Tests router — list available tests, start session, submit answers."""

import json
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, get_current_user
from app.core.database import get_db
from app.core import llm_router

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mock-tests", tags=["mock-tests"])

# ── Static test catalogue ─────────────────────────────────────────────────────
# In future this comes from DB; for now it's a curated list.

AVAILABLE_TESTS = [
    {
        "id": "math-class10-ch1",
        "title": "Real Numbers",
        "subject": "math",
        "class": 10,
        "board": "CBSE",
        "questionCount": 10,
        "durationMinutes": 20,
        "difficulty": "medium",
        "topics": ["HCF/LCM", "Euclid's Algorithm", "Irrational Numbers"],
    },
    {
        "id": "math-class10-ch3",
        "title": "Pair of Linear Equations",
        "subject": "math",
        "class": 10,
        "board": "CBSE",
        "questionCount": 10,
        "durationMinutes": 20,
        "difficulty": "medium",
        "topics": ["Substitution", "Elimination", "Graphical method"],
    },
    {
        "id": "physics-class10-ch1",
        "title": "Electricity",
        "subject": "physics",
        "class": 10,
        "board": "CBSE",
        "questionCount": 10,
        "durationMinutes": 20,
        "difficulty": "medium",
        "topics": ["Ohm's Law", "Resistance", "Circuits"],
    },
    {
        "id": "chemistry-class10-ch1",
        "title": "Chemical Reactions",
        "subject": "chemistry",
        "class": 10,
        "board": "CBSE",
        "questionCount": 10,
        "durationMinutes": 20,
        "difficulty": "easy",
        "topics": ["Types of reactions", "Balancing equations"],
    },
    {
        "id": "math-class12-ch1",
        "title": "Relations and Functions",
        "subject": "math",
        "class": 12,
        "board": "CBSE",
        "questionCount": 15,
        "durationMinutes": 30,
        "difficulty": "hard",
        "topics": ["Bijective", "Inverse functions", "Composition"],
    },
    {
        "id": "physics-class12-ch1",
        "title": "Electric Charges and Fields",
        "subject": "physics",
        "class": 12,
        "board": "CBSE",
        "questionCount": 15,
        "durationMinutes": 30,
        "difficulty": "hard",
        "topics": ["Coulomb's Law", "Electric Field", "Gauss's Law"],
    },
]

# In-memory session store (Redis would be better in production)
_sessions: dict[str, dict] = {}

GEN_QUESTIONS_SYSTEM = (
    "You are an expert CBSE exam question setter for Indian students. "
    "Generate exactly the requested number of multiple-choice questions. "
    "Return ONLY valid JSON array — no markdown, no explanation:\n"
    '[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],'
    '"correctIndex":0,"explanation":"..."}]'
)


# ── List available tests ──────────────────────────────────────────────────────

@router.get("/available")
async def available_tests(ctx: AuthContext = Depends(get_current_user)):
    return {"tests": AVAILABLE_TESTS}


# ── Start test session ────────────────────────────────────────────────────────

class StartRequest(BaseModel):
    testId: str


@router.post("/start")
async def start_test(
    body: StartRequest,
    db:   AsyncSession = Depends(get_db),
    ctx:  AuthContext  = Depends(get_current_user),
):
    meta = next((t for t in AVAILABLE_TESTS if t["id"] == body.testId), None)
    if not meta:
        raise HTTPException(404, "Test not found")

    # Generate questions via LLM
    gen_prompt = (
        f"Generate {meta['questionCount']} CBSE Class {meta['class']} {meta['subject'].title()} "
        f"multiple-choice questions on the topic '{meta['title']}'. "
        f"Topics covered: {', '.join(meta['topics'])}. "
        f"Difficulty: {meta['difficulty']}. "
        "Each question must have exactly 4 options labeled A) B) C) D). "
        "correctIndex is 0-based (0=A, 1=B, 2=C, 3=D)."
    )

    resp = await llm_router.call("homework_solve", GEN_QUESTIONS_SYSTEM, gen_prompt, max_tokens=3000)

    try:
        raw = resp.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        questions = json.loads(raw.strip())
        if not isinstance(questions, list):
            raise ValueError("Not a list")
    except Exception as e:
        logger.error("Failed to parse LLM questions: %s", e)
        raise HTTPException(500, "Failed to generate test questions. Please try again.")

    session_id = str(uuid.uuid4())
    _sessions[session_id] = {
        "testId":    body.testId,
        "userId":    ctx.user_id,
        "questions": questions,
        "meta":      meta,
    }

    return {
        "sessionId":       session_id,
        "testId":          body.testId,
        "title":           meta["title"],
        "subject":         meta["subject"],
        "durationMinutes": meta["durationMinutes"],
        "questionCount":   len(questions),
        "questions": [
            {
                "index":    i,
                "question": q["question"],
                "options":  q["options"],
            }
            for i, q in enumerate(questions)
        ],
    }


# ── Submit test ───────────────────────────────────────────────────────────────

class SubmitRequest(BaseModel):
    answers: dict  # {questionIndex: selectedOptionIndex}


@router.post("/{session_id}/submit")
async def submit_test(
    session_id: str,
    body:       SubmitRequest,
    db:         AsyncSession = Depends(get_db),
    ctx:        AuthContext  = Depends(get_current_user),
):
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired")
    if session["userId"] != ctx.user_id:
        raise HTTPException(403, "Forbidden")

    questions = session["questions"]
    correct = 0
    detailed = []
    for i, q in enumerate(questions):
        selected = body.answers.get(str(i))
        is_correct = selected is not None and selected == q.get("correctIndex", 0)
        if is_correct:
            correct += 1
        detailed.append({
            "index":        i,
            "question":     q["question"],
            "options":      q["options"],
            "correctIndex": q.get("correctIndex", 0),
            "selectedIndex": selected,
            "isCorrect":    is_correct,
            "explanation":  q.get("explanation", ""),
        })

    score = round((correct / len(questions)) * 100) if questions else 0

    # Save to DB for progress tracking
    await db.execute(
        text("""
            INSERT INTO questions (user_id, text, subject, topic, board, language, source, solve_time_ms)
            VALUES (:uid, :txt, :subj, :topic, 'CBSE', 'en', 'mock_test', 0)
        """),
        {
            "uid":   ctx.user_id,
            "txt":   f"Mock test: {session['meta']['title']} ({correct}/{len(questions)} correct)",
            "subj":  session["meta"]["subject"].title(),
            "topic": session["meta"]["title"],
        },
    )
    await db.commit()

    # Clean up session
    _sessions.pop(session_id, None)

    return {
        "score":     score,
        "correct":   correct,
        "total":     len(questions),
        "passed":    score >= 60,
        "questions": detailed,
    }
