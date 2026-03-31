"""Unit tests for the streaks feature — badge definitions, routing logic."""

import pytest
from app.features.streaks.router import (
    BADGE_DEFS,
    FREE_FREEZES_PER_MONTH,
    PRO_FREEZES_PER_MONTH,
)


class TestBadgeDefinitions:
    def test_all_badges_have_required_fields(self):
        for key, badge in BADGE_DEFS.items():
            assert "title" in badge, f"Badge {key} missing title"
            assert "description" in badge, f"Badge {key} missing description"
            assert "icon" in badge, f"Badge {key} missing icon"

    def test_badge_keys_are_lowercase_snake_case(self):
        import re
        for key in BADGE_DEFS:
            assert re.match(r"^[a-z][a-z0-9_]*$", key), f"Badge key '{key}' is not snake_case"

    def test_streak_badges_exist(self):
        for key in ["streak_3", "streak_7", "streak_30", "streak_100"]:
            assert key in BADGE_DEFS, f"Missing streak badge: {key}"

    def test_solve_badges_exist(self):
        for key in ["first_solve", "solves_10", "solves_50", "solves_100", "solves_500"]:
            assert key in BADGE_DEFS, f"Missing solve badge: {key}"

    def test_goal_badges_exist(self):
        assert "goal_complete_5" in BADGE_DEFS
        assert "goal_complete_20" in BADGE_DEFS


class TestFreezeConfig:
    def test_pro_has_more_freezes_than_free(self):
        assert PRO_FREEZES_PER_MONTH > FREE_FREEZES_PER_MONTH

    def test_free_freezes_at_least_one(self):
        assert FREE_FREEZES_PER_MONTH >= 1

    def test_pro_freezes_reasonable(self):
        assert 1 <= PRO_FREEZES_PER_MONTH <= 10
