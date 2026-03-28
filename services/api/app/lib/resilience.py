"""
Simple async circuit breaker.

States:
  CLOSED  — normal operation, calls pass through.
  OPEN    — threshold failures reached; calls fail immediately.
  HALF    — after reset_ms, one probe call is allowed.

Usage:
    cb = CircuitBreaker(threshold=3, reset_ms=60_000)
    result = await cb.execute(some_async_fn)   # pass the coroutine *function*, not the coro

The execute() method calls fn() each time (fn must be a no-arg async callable / lambda
that returns a coroutine). Do NOT pass a pre-created coroutine object — it will be
exhausted on the first call.
"""

import asyncio
import time
import logging
from enum import Enum
from typing import Callable, TypeVar

logger = logging.getLogger(__name__)
T = TypeVar("T")


class _State(Enum):
    CLOSED = "closed"
    OPEN   = "open"
    HALF   = "half"


class CircuitBreaker:
    def __init__(self, threshold: int, reset_ms: int) -> None:
        self._threshold  = threshold
        self._reset_ms   = reset_ms
        self._failures   = 0
        self._state      = _State.CLOSED
        self._opened_at  = 0.0
        self._lock       = asyncio.Lock()

    async def execute(self, fn: Callable[[], "asyncio.Coroutine[None, None, T]"]) -> T:
        """
        fn must be a zero-argument async callable that returns a coroutine, e.g.:
            await cb.execute(lambda: _call_t1(sys, usr, tok))
        NOT:
            await cb.execute(_call_t1(sys, usr, tok))   # wrong — pre-created coroutine
        """
        async with self._lock:
            if self._state == _State.OPEN:
                elapsed_ms = (time.monotonic() - self._opened_at) * 1000
                if elapsed_ms < self._reset_ms:
                    raise RuntimeError("Circuit breaker is OPEN — upstream unavailable")
                logger.info("Circuit breaker entering HALF-OPEN state")
                self._state = _State.HALF

        try:
            result = await fn()   # fn() creates and awaits the coroutine
            async with self._lock:
                self._failures = 0
                self._state    = _State.CLOSED
            return result
        except Exception as exc:
            async with self._lock:
                self._failures += 1
                if self._failures >= self._threshold:
                    self._state     = _State.OPEN
                    self._opened_at = time.monotonic()
                    logger.error(
                        "Circuit breaker OPENED",
                        extra={"failures": self._failures, "threshold": self._threshold},
                    )
            raise
