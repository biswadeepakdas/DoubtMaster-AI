"""Chat follow-up endpoint — streaming LLM responses for solution clarifications."""

import json
import logging

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional

from app.core.auth import AuthContext, get_current_user
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class FollowupRequest(BaseModel):
    systemPrompt: str
    messages:     List[ChatMessage] = []


@router.post("/followup")
async def followup(
    body: FollowupRequest,
    ctx:  AuthContext = Depends(get_current_user),
):
    if not body.messages:
        raise HTTPException(400, "No messages provided")

    system = body.systemPrompt

    # Build message history for Claude — must end with a user message
    messages = [{"role": m.role, "content": m.content} for m in body.messages]

    # Strip any trailing assistant messages (Claude does not support prefill)
    while messages and messages[-1]["role"] == "assistant":
        messages.pop()

    if not messages or messages[-1]["role"] != "user":
        raise HTTPException(400, "Conversation must end with a user message")

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def stream_response():
        try:
            async with client.messages.stream(
                model="claude-haiku-4-5",
                max_tokens=512,
                system=system,
                messages=messages,
            ) as stream:
                async for text in stream.text_stream:
                    # SSE format
                    yield f"data: {json.dumps({'text': text})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error("Chat stream error: %s", e)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
