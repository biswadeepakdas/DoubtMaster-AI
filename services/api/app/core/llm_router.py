"""
3-Tier LLM Cost Router
======================
Tier 1  Llama 4 Maverick · NVIDIA NIM    free tier / pay-as-you-go
Tier 2  DeepSeek V3 · DeepSeek direct    $0.028 cache/$0.28 miss/$0.42 out per 1M
Tier 3  Claude Sonnet 4 · Anthropic       $3.00/$15.00 per 1M tokens
Special NVIDIA Nemotron Hindi 4B · FREE   (pre-processing ONLY — see license warning)

CRITICAL: System prompts must be module-level constants for DeepSeek cache to fire.
CRITICAL: Circuit breaker execute() takes a zero-arg lambda — NOT a pre-created coro.
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from enum import IntEnum
from typing import Optional

import anthropic
from openai import AsyncOpenAI
from sqlalchemy import text

from app.core.config import settings
from app.lib.resilience import CircuitBreaker

logger = logging.getLogger(__name__)


class LLMTier(IntEnum):
    TIER1_FAST    = 1
    TIER2_BUDGET  = 2
    TIER3_PREMIUM = 3


@dataclass
class LLMResponse:
    content:       str
    tier:          LLMTier
    model:         str
    input_tokens:  int
    output_tokens: int
    cache_hit:     bool
    latency_ms:    int


# ── Stable system prompt constants (DeepSeek cache anchors) ──────────────────
# These MUST be module-level constants — never built dynamically.
# Changing these strings breaks the DeepSeek cache and increases cost.

SYSTEM_PROMPTS = {
    "cbse_maths": (
        "You are an expert CBSE mathematics tutor for Indian students (grades 6-12). "
        "You know the NCERT syllabus thoroughly. Always show step-by-step working. "
        "Use standard CBSE notation. Answer in clear, student-friendly English."
    ),
    "cbse_science": (
        "You are an expert CBSE science tutor (Physics, Chemistry, Biology) for Indian "
        "students (grades 6-12). You know the NCERT syllabus thoroughly. Explain concepts "
        "with real-world Indian examples. Answer in clear, student-friendly English."
    ),
    "cbse_general": (
        "You are an expert CBSE tutor for Indian students (grades 6-12). "
        "You know all NCERT subjects. Be concise, accurate, and encouraging."
    ),
    "common_core": (
        "You are an expert tutor aligned with US Common Core standards for K-12 students. "
        "Be precise, use grade-appropriate language, and show all working clearly."
    ),
    "topic_extract": (
        "You are a precise academic classifier. Extract the exact subject and topic from "
        'student questions. Return only valid JSON: {"subject": "...", "topic": "..."}. '
        "No markdown. No explanation."
    ),
}


def get_system_prompt(syllabus: str, subject: str) -> str:
    """Return the module-level constant — identity (is) must be stable for cache."""
    if syllabus in ("CBSE", "ICSE"):
        if subject.lower() in ("maths", "mathematics"):
            return SYSTEM_PROMPTS["cbse_maths"]
        if subject.lower() in ("physics", "chemistry", "biology", "science"):
            return SYSTEM_PROMPTS["cbse_science"]
        return SYSTEM_PROMPTS["cbse_general"]
    return SYSTEM_PROMPTS["common_core"]


# ── Routing table ─────────────────────────────────────────────────────────────

_TIER1 = {"topic_extract", "language_detect", "simple_definition", "mcq_answer", "syllabus_classify"}
_TIER2 = {"homework_solve", "step_by_step", "quiz_grade", "essay_feedback", "code_problem", "summary"}
_TIER3 = {"classroom_generate", "complex_reasoning", "document_analysis"}


def route(feature: str) -> LLMTier:
    if feature in _TIER1: return LLMTier.TIER1_FAST
    if feature in _TIER2: return LLMTier.TIER2_BUDGET
    if feature in _TIER3: return LLMTier.TIER3_PREMIUM
    logger.warning("Unknown LLM feature — defaulting to Tier 2", extra={"feature": feature})
    return LLMTier.TIER2_BUDGET


# ── Singleton API clients ─────────────────────────────────────────────────────

_nv = AsyncOpenAI(api_key=settings.NVIDIA_API_KEY,   base_url="https://integrate.api.nvidia.com/v1")
_t1 = _nv   # Tier 1 reuses NVIDIA NIM client — no separate Together AI key needed
_t2 = AsyncOpenAI(api_key=settings.DEEPSEEK_API_KEY, base_url="https://api.deepseek.com/v1")
_t3 = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

T1_MODEL = "meta/llama-4-maverick-17b-128e-instruct"
T2_MODEL = "deepseek-chat"   # Verify exact model ID in DeepSeek docs — cache is model-specific
T3_MODEL = "claude-sonnet-4-6"
NV_MODEL = "nvidia/nemotron-4-mini-hindi-4b-instruct"

# Circuit breakers — open after 3 failures, reset after 60 s
_t1_cb = CircuitBreaker(threshold=3, reset_ms=60_000)
_t2_cb = CircuitBreaker(threshold=3, reset_ms=60_000)
_t3_cb = CircuitBreaker(threshold=3, reset_ms=60_000)


# ── Main entry point ──────────────────────────────────────────────────────────

async def call(
    feature:      str,
    system_prompt: str,
    user_message:  str,
    max_tokens:    int           = 1024,
    force_tier:    Optional[LLMTier] = None,
) -> LLMResponse:
    tier  = force_tier or route(feature)
    start = time.monotonic()

    try:
        if tier == LLMTier.TIER1_FAST:
            # Lambda returns the coroutine each time execute() calls fn() — correct pattern
            raw = await _t1_cb.execute(lambda: _call_t1(system_prompt, user_message, max_tokens))
        elif tier == LLMTier.TIER2_BUDGET:
            raw = await _t2_cb.execute(lambda: _call_t2(system_prompt, user_message, max_tokens))
        else:
            raw = await _t3_cb.execute(lambda: _call_t3(system_prompt, user_message, max_tokens))
    except Exception as e:
        latency_ms = int((time.monotonic() - start) * 1000)
        logger.error("LLM call failed", extra={
            "feature": feature, "tier": int(tier), "error": str(e), "latency_ms": latency_ms,
        })
        # Cascade to next tier on non-forced calls
        if tier < LLMTier.TIER3_PREMIUM and force_tier is None:
            return await call(feature, system_prompt, user_message, max_tokens, LLMTier(tier + 1))
        raise

    latency_ms = int((time.monotonic() - start) * 1000)
    resp = LLMResponse(latency_ms=latency_ms, tier=tier, **raw)
    logger.info("LLM call ok", extra={
        "feature":       feature,
        "tier":          int(tier),
        "model":         resp.model,
        "input_tokens":  resp.input_tokens,
        "output_tokens": resp.output_tokens,
        "cache_hit":     resp.cache_hit,
        "latency_ms":    latency_ms,
    })
    return resp


async def _call_t1(sys: str, usr: str, max_tok: int) -> dict:
    r = await _t1.chat.completions.create(
        model=T1_MODEL,
        messages=[{"role": "system", "content": sys}, {"role": "user", "content": usr}],
        max_tokens=max_tok,
        temperature=0.3,
    )
    u = r.usage
    return {
        "content":       r.choices[0].message.content or "",
        "model":         T1_MODEL,
        "input_tokens":  u.prompt_tokens     if u else 0,
        "output_tokens": u.completion_tokens if u else 0,
        "cache_hit":     False,
    }


async def _call_t2(sys: str, usr: str, max_tok: int) -> dict:
    r = await _t2.chat.completions.create(
        model=T2_MODEL,
        messages=[{"role": "system", "content": sys}, {"role": "user", "content": usr}],
        max_tokens=max_tok,
        temperature=0.3,
    )
    u         = r.usage
    cache_hit = getattr(u, "prompt_cache_hit_tokens", 0) > 0 if u else False
    return {
        "content":       r.choices[0].message.content or "",
        "model":         T2_MODEL,
        "input_tokens":  u.prompt_tokens     if u else 0,
        "output_tokens": u.completion_tokens if u else 0,
        "cache_hit":     cache_hit,
    }


async def _call_t3(sys: str, usr: str, max_tok: int) -> dict:
    r = await _t3.messages.create(
        model=T3_MODEL, max_tokens=max_tok, system=sys,
        messages=[{"role": "user", "content": usr}],
    )
    u = r.usage
    return {
        "content":       r.content[0].text if r.content else "",
        "model":         T3_MODEL,
        "input_tokens":  u.input_tokens  if u else 0,
        "output_tokens": u.output_tokens if u else 0,
        "cache_hit":     False,
    }


async def classify_hindi(text_input: str) -> dict:
    """FREE NVIDIA endpoint — pre-processing only, max 32 output tokens."""
    try:
        r = await _nv.chat.completions.create(
            model=NV_MODEL, max_tokens=32, temperature=0.0,
            messages=[
                {"role": "system", "content": 'Classify language. Reply ONLY JSON: {"is_hindi":true/false,"confidence":0.0-1.0}'},
                {"role": "user",   "content": text_input[:500]},
            ],
        )
        return json.loads(r.choices[0].message.content or "{}")
    except Exception as e:
        logger.warning("NVIDIA classify failed", extra={"error": str(e)})
        return {"is_hindi": False, "confidence": 0.0}


async def log_routing(db, feature: str, resp: LLMResponse, student_id: Optional[str] = None):
    try:
        await db.execute(
            text("""
                INSERT INTO llm_routing_log
                    (student_id, feature, tier, model, input_tokens, output_tokens, cache_hit, latency_ms)
                VALUES
                    (:s, :f, :t, :m, :i, :o, :c, :l)
            """),
            {
                "s": student_id, "f": feature, "t": int(resp.tier), "m": resp.model,
                "i": resp.input_tokens, "o": resp.output_tokens, "c": resp.cache_hit, "l": resp.latency_ms,
            },
        )
    except Exception as e:
        logger.warning("routing log failed", extra={"error": str(e)})
