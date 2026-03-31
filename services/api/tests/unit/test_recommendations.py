"""Unit tests for the recommendations feature — JSON parsing, prompt stability."""

import pytest
from app.features.recommendations.router import (
    _safe_parse_json,
    PRACTICE_GEN_SYSTEM,
    EVALUATE_SYSTEM,
    STUDY_PLAN_SYSTEM,
)


class TestSafeParseJson:
    def test_valid_json_object(self):
        result = _safe_parse_json('{"key": "value"}')
        assert result == {"key": "value"}

    def test_valid_json_array(self):
        result = _safe_parse_json('[{"q": "test"}]')
        assert isinstance(result, list)
        assert result[0]["q"] == "test"

    def test_json_with_markdown_fences(self):
        raw = '```json\n{"key": "value"}\n```'
        result = _safe_parse_json(raw)
        assert result == {"key": "value"}

    def test_json_with_leading_text(self):
        raw = 'Here is the result: {"key": "value"}'
        result = _safe_parse_json(raw)
        assert result == {"key": "value"}

    def test_empty_string_returns_none(self):
        assert _safe_parse_json("") is None

    def test_none_returns_none(self):
        assert _safe_parse_json(None) is None

    def test_invalid_json_returns_none(self):
        assert _safe_parse_json("this is not json at all") is None

    def test_partial_json_recovery(self):
        # Common LLM issue: extra text around JSON
        raw = 'The answer is:\n{"correct": true, "score": 85}\nHope this helps!'
        result = _safe_parse_json(raw)
        assert result is not None
        assert result["correct"] is True


class TestSystemPromptStability:
    """System prompts must be module-level constants for DeepSeek cache efficiency."""

    def test_practice_gen_system_is_constant(self):
        p1 = PRACTICE_GEN_SYSTEM
        p2 = PRACTICE_GEN_SYSTEM
        assert p1 is p2, "System prompt must be a module-level constant"

    def test_evaluate_system_is_constant(self):
        p1 = EVALUATE_SYSTEM
        p2 = EVALUATE_SYSTEM
        assert p1 is p2

    def test_study_plan_system_is_constant(self):
        p1 = STUDY_PLAN_SYSTEM
        p2 = STUDY_PLAN_SYSTEM
        assert p1 is p2

    def test_prompts_contain_json_instruction(self):
        for prompt in [PRACTICE_GEN_SYSTEM, EVALUATE_SYSTEM, STUDY_PLAN_SYSTEM]:
            assert "JSON" in prompt or "json" in prompt, "System prompts must instruct JSON output"
