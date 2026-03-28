"""
Security middleware addressing OWASP Top 10.
A01 — Broken Access Control      → JWT + RBAC (auth.py) + RLS (database)
A02 — Cryptographic Failures     → HTTPS enforced, secrets in env, bcrypt for passwords
A03 — Injection                  → SQLAlchemy text() + Pydantic input validation
A04 — Insecure Design            → Refresh token rotation, audit logging
A05 — Security Misconfiguration  → Security headers (this file)
A06 — Vulnerable Components      → Dependabot enabled in CI
A07 — Auth Failures              → Rate limiting on auth endpoints, account lockout
A08 — Software Integrity         → Pinned deps, signed commits required in CI
A09 — Logging Failures           → Structured logging, audit trail (audit_log table)
A10 — SSRF                       → OpenMAIC client only calls internal Railway URL
"""

import uuid
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


# frame-src MUST be updated to the actual public proxy URL for the OpenMAIC iframe
# once the proxy is provisioned. The internal Railway address is meaningless to browsers.
# See Agent 1, section 1.3 for context.
OPENMAIC_FRAME_SRC = "https://classroom.doubtmaster.ai"  # replace with real proxy URL

SECURITY_HEADERS = {
    "X-Content-Type-Options":    "nosniff",
    "X-Frame-Options":           "DENY",
    "X-XSS-Protection":          "1; mode=block",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "Referrer-Policy":           "strict-origin-when-cross-origin",
    "Permissions-Policy":        "geolocation=(), microphone=(self), camera=(self)",
    "Content-Security-Policy": (
        "default-src 'self'; "
        # unsafe-inline is required for Next.js inline scripts. For maximum XSS protection,
        # migrate to per-request nonces when Next.js nonce support is stable.
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://api.anthropic.com https://api.deepseek.com "
        "https://api.together.xyz https://integrate.api.nvidia.com; "
        f"frame-src 'self' {OPENMAIC_FRAME_SRC}; "
        "font-src 'self'; "
        "object-src 'none'; "
        "base-uri 'self'"
    ),
}


class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Attach request ID for distributed tracing
        request_id             = str(uuid.uuid4())
        request.state.request_id = request_id

        # Block requests without content type on POST/PUT/PATCH
        if request.method in ("POST", "PUT", "PATCH"):
            ct = request.headers.get("content-type", "")
            if not ct.startswith("application/json") and request.url.path.startswith("/api/"):
                return Response(
                    content='{"detail":"Content-Type must be application/json"}',
                    status_code=415, media_type="application/json",
                )

        response = await call_next(request)

        # Apply security headers to all responses
        for header, value in SECURITY_HEADERS.items():
            response.headers[header] = value
        response.headers["X-Request-ID"] = request_id

        # Remove information-leaking headers
        # MutableHeaders doesn't support .pop() — use del with guard
        for h in ("Server", "X-Powered-By"):
            if h in response.headers:
                del response.headers[h]

        return response
