"""Homework solver — routes to 3-tier LLM cost router."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, get_current_user
from app.core.database import get_db
from app.core import llm_router
from app.core.validators import SafeStr, TopicStr

router = APIRouter(prefix="/homework", tags=["homework"])

class HomeworkRequest(BaseModel):
    question: str
    subject:  SafeStr
    syllabus: str = "CBSE"

class HomeworkResponse(BaseModel):
    answer:      str
    tier_used:   int
    model_used:  str
    cache_hit:   bool

@router.post("/solve", response_model=HomeworkResponse)
async def solve(
    body: HomeworkRequest,
    db:   AsyncSession = Depends(get_db),
    ctx:  AuthContext   = Depends(get_current_user),
):
    feature       = "homework_solve"
    system_prompt = llm_router.get_system_prompt(body.syllabus, body.subject.lower())
    resp          = await llm_router.call(feature, system_prompt, body.question)
    await llm_router.log_routing(db, feature, resp, student_id=ctx.user_id)
    return HomeworkResponse(
        answer=resp.content, tier_used=int(resp.tier),
        model_used=resp.model, cache_hit=resp.cache_hit,
    )
