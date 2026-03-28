"""Unit tests for the 3-tier LLM cost router."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.core.llm_router import (
    call, route, classify_hindi, get_system_prompt,
    LLMTier, SYSTEM_PROMPTS,
)


class TestRouting:
    def test_tier1_features(self):
        for f in ["topic_extract", "simple_definition", "mcq_answer", "syllabus_classify"]:
            assert route(f) == LLMTier.TIER1_FAST, f"Expected Tier 1 for {f}"

    def test_tier2_features(self):
        for f in ["homework_solve", "quiz_grade", "essay_feedback", "step_by_step"]:
            assert route(f) == LLMTier.TIER2_BUDGET, f"Expected Tier 2 for {f}"

    def test_tier3_features(self):
        for f in ["classroom_generate", "complex_reasoning", "document_analysis"]:
            assert route(f) == LLMTier.TIER3_PREMIUM, f"Expected Tier 3 for {f}"

    def test_unknown_feature_defaults_tier2(self):
        assert route("totally_unknown") == LLMTier.TIER2_BUDGET

    def test_system_prompts_are_identity_stable(self):
        """Critical: same call must return the same object identity.
        This guarantees DeepSeek cache fires — dynamic string construction breaks the cache."""
        p1 = get_system_prompt("CBSE", "maths")
        p2 = get_system_prompt("CBSE", "maths")
        assert p1 is p2, "System prompt must return a module-level constant, not a rebuilt string"

    def test_cbse_science_covers_all_science_subjects(self):
        for subj in ["physics", "chemistry", "biology", "science"]:
            assert get_system_prompt("CBSE", subj) is SYSTEM_PROMPTS["cbse_science"]

    def test_common_core_for_non_cbse(self):
        assert get_system_prompt("Common Core", "maths") is SYSTEM_PROMPTS["common_core"]


@pytest.mark.asyncio
class TestLLMCall:
    async def test_tier1_call_routes_correctly(self):
        with patch("app.core.llm_router._t1_cb") as cb:
            cb.execute = AsyncMock(return_value={
                "content": "Photosynthesis is...", "model": "llama-4",
                "input_tokens": 50, "output_tokens": 30, "cache_hit": False,
            })
            resp = await call("simple_definition", SYSTEM_PROMPTS["cbse_science"], "What is photosynthesis?")
        assert resp.tier == LLMTier.TIER1_FAST
        assert "Photosynthesis" in resp.content

    async def test_cascades_to_tier2_when_tier1_fails(self):
        with patch("app.core.llm_router._t1_cb") as cb1, \
             patch("app.core.llm_router._t2_cb") as cb2:
            cb1.execute = AsyncMock(side_effect=Exception("Together AI down"))
            cb2.execute = AsyncMock(return_value={
                "content": "Fallback answer", "model": "deepseek-chat",
                "input_tokens": 50, "output_tokens": 20, "cache_hit": False,
            })
            resp = await call("simple_definition", SYSTEM_PROMPTS["cbse_general"], "Newton's first law?")
        assert resp.tier == LLMTier.TIER2_BUDGET

    async def test_nvidia_failure_returns_safe_default(self):
        with patch("app.core.llm_router._nv") as mock:
            mock.chat.completions.create = AsyncMock(side_effect=Exception("NVIDIA down"))
            result = await classify_hindi("What is photosynthesis?")
        assert result == {"is_hindi": False, "confidence": 0.0}

    async def test_hindi_detection(self):
        with patch("app.core.llm_router._nv") as mock:
            mock.chat.completions.create = AsyncMock(return_value=MagicMock(
                choices=[MagicMock(message=MagicMock(content='{"is_hindi":true,"confidence":0.97}'))]
            ))
            result = await classify_hindi("What is gravity?")
        assert result["is_hindi"] is True
        assert result["confidence"] > 0.9


class TestCircuitBreaker:
    """Verify CircuitBreaker handles async lambdas correctly."""

    @pytest.mark.asyncio
    async def test_execute_calls_lambda_each_time(self):
        from app.lib.resilience import CircuitBreaker
        cb    = CircuitBreaker(threshold=3, reset_ms=60_000)
        calls = []

        async def _fn():
            calls.append(1)
            return "ok"

        await cb.execute(lambda: _fn())
        await cb.execute(lambda: _fn())
        assert len(calls) == 2, "lambda must be called fresh each execute()"

    @pytest.mark.asyncio
    async def test_opens_after_threshold(self):
        from app.lib.resilience import CircuitBreaker
        cb = CircuitBreaker(threshold=2, reset_ms=60_000)

        async def _fail():
            raise ValueError("boom")

        for _ in range(2):
            with pytest.raises(ValueError):
                await cb.execute(lambda: _fail())

        with pytest.raises(RuntimeError, match="OPEN"):
            await cb.execute(lambda: _fail())
