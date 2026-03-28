"""Input validators used across all Pydantic schemas."""

import re
from typing import Annotated

from pydantic import AfterValidator, Field


def _no_sql_injection(v: str) -> str:
    """Reject obvious SQL injection attempts. SQLAlchemy text() already prevents
    real injection, but this catches malicious intent early for audit logging."""
    sql_patterns = r"(--|;|\/\*|\*\/|xp_|UNION\s+SELECT|DROP\s+TABLE|INSERT\s+INTO)"
    if re.search(sql_patterns, v, re.IGNORECASE):
        raise ValueError("Invalid input detected")
    return v


def _no_script_injection(v: str) -> str:
    """Reject XSS attempts in free-text fields."""
    if re.search(r"<\s*script", v, re.IGNORECASE):
        raise ValueError("Invalid input detected")
    return v


SafeStr  = Annotated[str, AfterValidator(_no_sql_injection), AfterValidator(_no_script_injection)]
TopicStr = Annotated[str, Field(min_length=2, max_length=200), AfterValidator(_no_sql_injection)]
