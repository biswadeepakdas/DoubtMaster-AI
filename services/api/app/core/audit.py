"""Write to audit_log for all security-sensitive operations."""

import json
import logging
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def audit(
    db:          AsyncSession,
    action:      str,
    user_id:     Optional[str] = None,
    resource:    Optional[str] = None,
    resource_id: Optional[str] = None,
    ip_address:  Optional[str] = None,
    user_agent:  Optional[str] = None,
    metadata:    Optional[dict] = None,
) -> None:
    """Non-blocking audit log write. Never raises — audit must not break flows.

    metadata is serialized to JSON (not Python repr) so PostgreSQL JSONB cast succeeds.
    """
    try:
        await db.execute(
            text("""
                INSERT INTO audit_log
                    (user_id, action, resource, resource_id, ip_address, user_agent, metadata)
                VALUES
                    (:user_id, :action, :resource, :resource_id, :ip, :ua, :meta::jsonb)
            """),
            {
                "user_id":     user_id,
                "action":      action,
                "resource":    resource,
                "resource_id": resource_id,
                "ip":          ip_address,
                "ua":          user_agent,
                "meta":        json.dumps(metadata or {}),  # valid JSON, not Python repr
            },
        )
    except Exception as e:
        logger.error("Audit log write failed", extra={"action": action, "error": str(e)})
