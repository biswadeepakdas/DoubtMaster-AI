"""SMS OTP delivery via Fast2SMS."""

import logging

import httpx

logger = logging.getLogger(__name__)


async def send_otp_sms(phone: str, otp: str) -> bool:
    """
    Send a 6-digit OTP to an Indian mobile number via Fast2SMS.

    phone – any of: "+919876543210", "919876543210", "9876543210"
    Returns True on success, False on failure (caller should still proceed;
    the OTP is stored in otp_store regardless).
    """
    from app.core.config import settings

    # Strip country code to get 10-digit number
    digits = phone.strip().lstrip("+")
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]

    if not settings.FAST2SMS_API_KEY:
        # Dev fallback — OTP visible in Railway logs only
        logger.info("SMS not configured. OTP for %s: %s", phone, otp)
        return True

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.post(
                "https://www.fast2sms.com/dev/bulkV2",
                headers={"authorization": settings.FAST2SMS_API_KEY},
                json={
                    "route": "otp",
                    "variables_values": otp,
                    "numbers": digits,
                },
            )
        data = res.json()
        if data.get("return") is True:
            logger.info("OTP SMS sent to %s (request_id=%s)", phone, data.get("request_id"))
            return True
        logger.error("Fast2SMS rejected OTP to %s: %s", phone, data)
        return False
    except Exception as exc:
        logger.error("Fast2SMS request failed for %s: %s", phone, exc)
        return False
