"""Smart Weakness Detection & Practice Recommendations.

Analyzes student solve history to identify weak topics and generates
targeted practice questions using the LLM router.

Endpoints:
  GET  /recommendations/weaknesses        — current weakness analysis
  GET  /recommendations/practice          — get AI-generated practice questions
  POST /recommendations/practice/evaluate — evaluate student's practice answer
  GET  /recommendations/study-plan        — personalized weekly study plan
"""

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

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


# ── System prompts (module-level for DeepSeek cache) ──────────────────────────

PRACTICE_GEN_SYSTEM = (
    "You are an expert CBSE/ICSE question creator for Indian students. "
    "Generate practice questions that target specific weak areas. "
    "Return ONLY valid JSON array (no markdown, no explanation):\n"
    '[{"question":"...","difficulty":"easy|medium|hard",'
    '"hint":"...","answer":"...","explanation":"...","topic":"..."}]'
)

EVALUATE_SYSTEM = (
    "You are a patient CBSE tutor evaluating a student's answer. "
    "Return ONLY valid JSON (no markdown):\n"
    '{"correct":true/false,"score":0-100,"feedback":"...",'
    '"misconception":"...or empty","correctAnswer":"...","tip":"..."}'
)

STUDY_PLAN_SYSTEM = (
    "You are an academic planner for Indian students preparing for CBSE/ICSE/JEE/NEET. "
    "Create a focused weekly study plan based on weak areas. "
    "Return ONLY valid JSON (no markdown):\n"
    '{"weeklyPlan":[{"day":"Monday","focusSubject":"...","focusTopic":"...",'
    '"tasks":[{"type":"practice|revise|learn","description":"...","duration":20}],'
    '"estimatedMinutes":60}],'
    '"priorityTopics":["..."],"motivationalTip":"..."}'
)


# ── Request models ────────────────────────────────────────────────────────────

class PracticeRequest(BaseModel):
    subject: Optional[str] = None
    topic: Optional[str] = None
    difficulty: str = "medium"
    count: int = 3


class EvaluateRequest(BaseModel):
    question: str
    student_answer: str
    correct_answer: str
    subject: str = "General"
    topic: str = ""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe_parse_json(raw: str):
    """Parse JSON from potentially messy LLM output."""
    import re
    clean = (raw or "").strip()
    clean = re.sub(r"^\s*```(?:json)?\s*", "", clean, flags=re.IGNORECASE)
    clean = re.sub(r"\s*```\s*$", "", clean)

    try:
        return json.loads(clean)
    except Exception:
        pass

    # Try finding first [ or {
    for ch, end in [("[", "]"), ("{", "}")]:
        start = clean.find(ch)
        if start != -1:
            try:
                return json.loads(clean[start:])
            except Exception:
                pass
    return None


async def _get_weakness_data(db: AsyncSession, user_id: str) -> dict:
    """Analyze solve history to detect weak areas."""

    # Get subject-level stats
    subject_result = await db.execute(
        text("""
            SELECT q.subject,
                   COUNT(*) AS total,
                   COUNT(CASE WHEN s.confidence >= 0.8 THEN 1 END) AS high_conf,
                   COUNT(CASE WHEN s.confidence < 0.6 THEN 1 END) AS low_conf,
                   AVG(s.confidence) AS avg_confidence
            FROM questions q
            LEFT JOIN solutions s ON s.question_id = q.id
            WHERE q.user_id = :uid
            GROUP BY q.subject
            ORDER BY avg_confidence ASC
        """),
        {"uid": user_id},
    )
    subjects = []
    for r in subject_result.mappings().all():
        total = r["total"]
        subjects.append({
            "subject": r["subject"],
            "totalQuestions": total,
            "highConfidence": r["high_conf"],
            "lowConfidence": r["low_conf"],
            "avgConfidence": round(float(r["avg_confidence"] or 0), 2),
            "strength": "strong" if (r["avg_confidence"] or 0) >= 0.85
                       else "moderate" if (r["avg_confidence"] or 0) >= 0.7
                       else "weak",
        })

    # Get topic-level weaknesses (low confidence topics)
    topic_result = await db.execute(
        text("""
            SELECT q.subject, q.topic,
                   COUNT(*) AS total,
                   AVG(s.confidence) AS avg_confidence,
                   MAX(q.created_at) AS last_practiced
            FROM questions q
            LEFT JOIN solutions s ON s.question_id = q.id
            WHERE q.user_id = :uid AND q.topic IS NOT NULL AND q.topic != ''
            GROUP BY q.subject, q.topic
            HAVING AVG(s.confidence) < 0.8 OR COUNT(*) < 3
            ORDER BY avg_confidence ASC
            LIMIT 15
        """),
        {"uid": user_id},
    )
    weak_topics = []
    for r in topic_result.mappings().all():
        weak_topics.append({
            "subject": r["subject"],
            "topic": r["topic"],
            "totalAttempts": r["total"],
            "avgConfidence": round(float(r["avg_confidence"] or 0), 2),
            "lastPracticed": str(r["last_practiced"]) if r["last_practiced"] else None,
            "needsMorePractice": r["total"] < 3,
            "priority": "high" if (r["avg_confidence"] or 0) < 0.6
                       else "medium" if (r["avg_confidence"] or 0) < 0.75
                       else "low",
        })

    # Update weakness_snapshots table
    for wt in weak_topics:
        await db.execute(
            text("""
                INSERT INTO weakness_snapshots (user_id, subject, topic, total_attempts, confidence, last_seen_at)
                VALUES (:uid, :subj, :topic, :total, :conf, now())
                ON CONFLICT (user_id, subject, topic)
                DO UPDATE SET total_attempts = :total, confidence = :conf, last_seen_at = now(), updated_at = now()
            """),
            {"uid": user_id, "subj": wt["subject"], "topic": wt["topic"],
             "total": wt["totalAttempts"], "conf": wt["avgConfidence"]},
        )

    return {"subjects": subjects, "weakTopics": weak_topics}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/weaknesses")
async def get_weaknesses(
    db:  AsyncSession = Depends(get_db),
    ctx: AuthContext  = Depends(get_current_user),
):
    """Analyze solve history and return weakness report."""
    data = await _get_weakness_data(db, ctx.user_id)

    # Overall stats
    total_result = await db.execute(
        text("SELECT COUNT(*) FROM questions WHERE user_id = :uid"),
        {"uid": ctx.user_id},
    )
    total_questions = total_result.scalar_one()

    return {
        "totalQuestionsAnalyzed": total_questions,
        "subjects": data["subjects"],
        "weakTopics": data["weakTopics"],
        "summary": {
            "strongSubjects": [s["subject"] for s in data["subjects"] if s["strength"] == "strong"],
            "weakSubjects": [s["subject"] for s in data["subjects"] if s["strength"] == "weak"],
            "topPriorityTopics": [t["topic"] for t in data["weakTopics"] if t["priority"] == "high"][:5],
        },
    }


@router.get("/practice")
async def get_practice_questions(
    subject: Optional[str] = None,
    topic: Optional[str] = None,
    difficulty: str = "medium",
    count: int = 3,
    db:  AsyncSession = Depends(get_db),
    ctx: AuthContext  = Depends(get_current_user),
):
    """Generate targeted practice questions based on weaknesses."""
    # If no subject/topic specified, pick from weakest areas
    if not subject and not topic:
        weakness_data = await _get_weakness_data(db, ctx.user_id)
        if weakness_data["weakTopics"]:
            top_weak = weakness_data["weakTopics"][0]
            subject = top_weak["subject"]
            topic = top_weak["topic"]
        else:
            subject = "Mathematics"
            topic = "General"

    # Get user class/board for context
    user_result = await db.execute(
        text('SELECT "class", board FROM users WHERE id = :uid'),
        {"uid": ctx.user_id},
    )
    user = user_result.mappings().one_or_none()
    grade = user["class"] if user else 10
    board = user["board"] if user else "CBSE"

    prompt = (
        f"Generate exactly {min(count, 5)} practice questions for a Class {grade} {board} student.\n"
        f"Subject: {subject}\n"
        f"Topic: {topic or 'General'}\n"
        f"Difficulty: {difficulty}\n"
        f"Focus on areas where students commonly make mistakes.\n"
        f"Include clear hints that guide without giving away the answer."
    )

    try:
        resp = await llm_router.call(
            feature="homework_solve",
            system_prompt=PRACTICE_GEN_SYSTEM,
            user_message=prompt,
            max_tokens=2048,
        )
        questions = _safe_parse_json(resp.content)
        if not isinstance(questions, list):
            questions = [questions] if isinstance(questions, dict) else []
    except Exception as e:
        logger.error("Practice question generation failed: %s", e)
        raise HTTPException(500, "Could not generate practice questions")

    return {
        "subject": subject,
        "topic": topic,
        "difficulty": difficulty,
        "questions": questions[:count],
        "modelUsed": resp.model,
    }


@router.post("/practice/evaluate")
async def evaluate_answer(
    body: EvaluateRequest,
    db:   AsyncSession = Depends(get_db),
    ctx:  AuthContext  = Depends(get_current_user),
):
    """Evaluate a student's answer to a practice question."""
    prompt = (
        f"Subject: {body.subject}\n"
        f"Topic: {body.topic}\n"
        f"Question: {body.question}\n"
        f"Student's answer: {body.student_answer}\n"
        f"Correct answer: {body.correct_answer}\n\n"
        f"Evaluate the student's answer. Be encouraging but accurate. "
        f"Identify any misconceptions."
    )

    try:
        resp = await llm_router.call(
            feature="homework_solve",
            system_prompt=EVALUATE_SYSTEM,
            user_message=prompt,
            max_tokens=1024,
        )
        evaluation = _safe_parse_json(resp.content)
        if not isinstance(evaluation, dict):
            evaluation = {
                "correct": False,
                "score": 0,
                "feedback": resp.content,
                "misconception": "",
                "correctAnswer": body.correct_answer,
                "tip": "",
            }
    except Exception as e:
        logger.error("Answer evaluation failed: %s", e)
        raise HTTPException(500, "Could not evaluate answer")

    # Update weakness snapshot if topic provided
    if body.topic:
        is_correct = evaluation.get("correct", False)
        score = evaluation.get("score", 0)
        await db.execute(
            text("""
                INSERT INTO weakness_snapshots (user_id, subject, topic, total_attempts, error_count, confidence)
                VALUES (:uid, :subj, :topic, 1, :err, :conf)
                ON CONFLICT (user_id, subject, topic)
                DO UPDATE SET
                    total_attempts = weakness_snapshots.total_attempts + 1,
                    error_count = weakness_snapshots.error_count + :err,
                    confidence = (:conf + weakness_snapshots.confidence * weakness_snapshots.total_attempts)
                                / (weakness_snapshots.total_attempts + 1),
                    updated_at = now()
            """),
            {
                "uid": ctx.user_id, "subj": body.subject, "topic": body.topic,
                "err": 0 if is_correct else 1, "conf": score / 100.0,
            },
        )

    return evaluation


@router.get("/study-plan")
async def get_study_plan(
    db:  AsyncSession = Depends(get_db),
    ctx: AuthContext  = Depends(get_current_user),
):
    """Generate a personalized weekly study plan based on weakness analysis."""
    weakness_data = await _get_weakness_data(db, ctx.user_id)

    # Get user info
    user_result = await db.execute(
        text('SELECT name, "class", board FROM users WHERE id = :uid'),
        {"uid": ctx.user_id},
    )
    user = user_result.mappings().one_or_none()
    grade = user["class"] if user else 10
    board = user["board"] if user else "CBSE"
    name = user["name"] if user else "Student"

    weak_summary = "\n".join(
        f"- {t['subject']} > {t['topic']}: confidence {t['avgConfidence']}, attempts {t['totalAttempts']}, priority {t['priority']}"
        for t in weakness_data["weakTopics"][:10]
    )

    strong_subjects = [s["subject"] for s in weakness_data["subjects"] if s["strength"] == "strong"]
    weak_subjects = [s["subject"] for s in weakness_data["subjects"] if s["strength"] == "weak"]

    prompt = (
        f"Create a 7-day study plan for {name}, Class {grade} ({board}).\n\n"
        f"Strong subjects: {', '.join(strong_subjects) or 'None identified yet'}\n"
        f"Weak subjects: {', '.join(weak_subjects) or 'None identified yet'}\n\n"
        f"Specific weak topics:\n{weak_summary or 'No data yet — create a balanced plan for Class ' + str(grade)}\n\n"
        f"Rules:\n"
        f"- Spend 60-70% time on weak areas, 30% on maintaining strong areas\n"
        f"- Include practice problems, revision, and new concept learning\n"
        f"- Keep each session 30-60 minutes\n"
        f"- Add one rest/light day\n"
        f"- Be specific to Indian curriculum ({board})"
    )

    try:
        resp = await llm_router.call(
            feature="homework_solve",
            system_prompt=STUDY_PLAN_SYSTEM,
            user_message=prompt,
            max_tokens=2048,
        )
        plan = _safe_parse_json(resp.content)
        if not isinstance(plan, dict):
            plan = {"weeklyPlan": [], "priorityTopics": [], "motivationalTip": "Keep practicing!"}
    except Exception as e:
        logger.error("Study plan generation failed: %s", e)
        raise HTTPException(500, "Could not generate study plan")

    return {
        "studentName": name,
        "grade": grade,
        "board": board,
        "plan": plan,
        "basedOn": {
            "weakTopicsCount": len(weakness_data["weakTopics"]),
            "subjectsAnalyzed": len(weakness_data["subjects"]),
        },
    }
