from enum import Enum
from typing import Optional
from uuid import UUID
from pydantic import BaseModel
from app.core.validators import SafeStr, TopicStr

class ClassroomMode(str, Enum):
    explain    = "explain"
    quiz       = "quiz"
    pbl        = "pbl"
    whiteboard = "whiteboard"

class ClassroomStatus(str, Enum):
    pending    = "pending"
    generating = "generating"
    ready      = "ready"
    failed     = "failed"

class GenerateClassroomRequest(BaseModel):
    mode:               ClassroomMode
    subject:            SafeStr
    topic:              TopicStr
    syllabus:           str  = "CBSE"
    grade:              Optional[str] = None
    source_question_id: Optional[UUID] = None

class ClassroomStatusResponse(BaseModel):
    session_id:    str
    status:        ClassroomStatus
    classroom_url: Optional[str]
    error_message: Optional[str]
