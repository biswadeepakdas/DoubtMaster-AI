from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── App ──────────────────────────────────────────────────────────────────
    ENVIRONMENT: Literal["local", "staging", "production"] = "local"
    DEBUG:       bool = False
    LOG_LEVEL:   str  = "info"
    API_VERSION: str  = "v1"

    # ── JWT ──────────────────────────────────────────────────────────────────
    JWT_SECRET:   str                    # min 64 chars — validated below
    JWT_ISSUER:   str = "doubtmaster.ai"
    JWT_AUDIENCE: str = "doubtmaster-api"

    # ── Database (Railway injects these automatically) ────────────────────────
    DATABASE_URL: str
    REDIS_URL:    str

    # ── LLM providers — 3-tier cost router ───────────────────────────────────
    ANTHROPIC_API_KEY: str               # Tier 3 — Claude Sonnet
    DEEPSEEK_API_KEY:  str               # Tier 2 — DeepSeek V3
    TOGETHER_API_KEY:  str               # Tier 1 — Llama 4 Maverick
    NVIDIA_API_KEY:    str               # Special — Nemotron Hindi (pre-processing only)

    # ── OpenMAIC sidecar ─────────────────────────────────────────────────────
    OPENMAIC_INTERNAL_URL: str = "http://openmaic.railway.internal:3000"

    # ── Payments ─────────────────────────────────────────────────────────────
    RAZORPAY_KEY_ID:       str
    RAZORPAY_KEY_SECRET:   str
    STRIPE_SECRET_KEY:     str
    STRIPE_WEBHOOK_SECRET: str

    # ── Observability ────────────────────────────────────────────────────────
    SENTRY_DSN:                str   = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1

    # ── Validators ───────────────────────────────────────────────────────────
    @field_validator("JWT_SECRET")
    def jwt_secret_must_be_strong(cls, v: str) -> str:
        if len(v) < 64:
            raise ValueError("JWT_SECRET must be at least 64 characters")
        return v

    @field_validator("ENVIRONMENT")
    def no_debug_in_production(cls, v: str, info) -> str:
        if v == "production" and info.data.get("DEBUG"):
            raise ValueError("DEBUG must be False in production")
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
