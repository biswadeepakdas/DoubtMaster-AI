"""FastAPI application factory with all middleware registered."""

import logging
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from app.core.config import settings
from app.core.database import engine, init_db
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.security import SecurityMiddleware

from app.features.auth.router          import router as auth_router
from app.features.homework.router      import router as homework_router
from app.features.questions.router     import router as questions_router
from app.features.user.router          import router as user_router
from app.features.subscriptions.router import router as subscriptions_router
from app.features.classroom.router     import router as classroom_router
from app.features.admin.router         import router as admin_router
from app.features.health.router        import router as health_router
from app.features.mock_tests.router    import router as mock_tests_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Doubtmaster API — initialising database tables...")
    await init_db()
    logger.info("Database ready. Doubtmaster API is up.", extra={"env": settings.ENVIRONMENT})
    yield
    await engine.dispose()
    logger.info("Doubtmaster API shut down cleanly")


if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        integrations=[FastApiIntegration(), SqlalchemyIntegration()],
        send_default_pii=False,   # GDPR compliance
    )

app = FastAPI(
    title="Doubtmaster API",
    version="1.0.0",
    docs_url="/docs"        if settings.ENVIRONMENT != "production" else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

# Middleware registration order — outermost (first added) wraps everything.
# SecurityMiddleware sets request_id; must run before RateLimit reads it.
app.add_middleware(SecurityMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://doubtmaster.ai",
        "https://www.doubtmaster.ai",
        "https://staging.doubtmaster.ai",
        "https://doubt-master-ai.vercel.app",
        "http://localhost:3000",
        "http://localhost:19006",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID", "Idempotency-Key"],
    expose_headers=["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
    max_age=600,
)

app.include_router(health_router)
app.include_router(auth_router,          prefix="/api/v1")
app.include_router(questions_router,     prefix="/api/v1")
app.include_router(user_router,          prefix="/api/v1")
app.include_router(subscriptions_router, prefix="/api/v1")
app.include_router(homework_router,      prefix="/api/v1")
app.include_router(classroom_router,     prefix="/api/v1")
app.include_router(admin_router,         prefix="/api/v1")
app.include_router(mock_tests_router,    prefix="/api/v1")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": exc.errors()},
    )
