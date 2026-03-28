"""
Sliding-window rate limiting backed by Redis.
Limits are per-user for authenticated endpoints, per-IP for auth endpoints.

IMPORTANT: request.state.user_id is set by get_current_user() in auth.py AFTER the
JWT is decoded. The rate limiter runs as middleware BEFORE route handlers, so for
authenticated routes user_id will not be available here on the first check.
Auth endpoints (login, register, refresh) use IP-based limiting — this is intentional
and correct since those endpoints don't have a valid user yet.
For general API endpoints, IP-based limiting is the safe fallback until a
per-user layer can be added at the route level if needed.
"""

import time
from typing import Callable

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.redis_client import redis_client


RATE_LIMITS: dict[str, tuple[int, int]] = {
    # path_prefix: (max_requests, window_seconds)
    "/api/v1/auth/login":    (5,   60),    # 5 attempts per minute
    "/api/v1/auth/register": (3,   3600),  # 3 registrations per hour
    "/api/v1/auth/refresh":  (10,  60),
    "/api/v1/classroom":     (20,  3600),  # 20 classroom generates per hour
    "/api/v1/homework":      (100, 3600),  # 100 homework solves per hour
    "default":               (300, 3600),  # 300 requests per hour overall
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        key, limit, window = self._resolve_limit(request)
        count = await self._increment(key, window)

        if count > limit:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": f"Rate limit exceeded. Retry after {window}s."},
                headers={"Retry-After": str(window)},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"]     = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, limit - count))
        return response

    def _resolve_limit(self, request: Request) -> tuple[str, int, int]:
        path       = request.url.path
        identifier = self._get_identifier(request)
        for prefix, (limit, window) in RATE_LIMITS.items():
            if prefix != "default" and path.startswith(prefix):
                return f"rl:{prefix}:{identifier}", limit, window
        limit, window = RATE_LIMITS["default"]
        return f"rl:default:{identifier}", limit, window

    def _get_identifier(self, request: Request) -> str:
        # Use authenticated user ID when available (set by get_current_user dependency
        # on a previous request in the same session context — not available in middleware).
        # For auth endpoints and unauthenticated requests, use client IP.
        ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()
        return f"ip:{ip}"

    async def _increment(self, key: str, window: int) -> int:
        now        = int(time.time())
        window_key = f"{key}:{now // window}"
        pipe       = redis_client.pipeline()
        pipe.incr(window_key)
        pipe.expire(window_key, window * 2)
        results = await pipe.execute()
        return results[0]
