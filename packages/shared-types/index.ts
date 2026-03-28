// packages/shared-types/index.ts
// Canonical contract between frontend and FastAPI.
// These must stay in sync with the Pydantic models in services/api/app/features/*/types.py

export type ClassroomMode = "explain" | "quiz" | "pbl" | "whiteboard"
export type ClassroomStatus = "pending" | "generating" | "ready" | "failed"
export type UserRole = "student" | "teacher" | "admin"
export type Syllabus = "CBSE" | "ICSE" | "Common Core" | "IB"

export interface GenerateClassroomRequest {
  mode:     ClassroomMode
  subject:  string
  topic:    string
  syllabus: Syllabus
  grade?:   string
  source_question_id?: string
}

export interface ClassroomStatusResponse {
  session_id:    string
  status:        ClassroomStatus
  classroom_url: string | null
  error_message: string | null
}

export interface TokenPair {
  access_token:  string
  refresh_token: string
  token_type:    string
  expires_in:    number
}

export interface AuthUser {
  userId: string
  email:  string
  role:   UserRole
  isPro:  boolean
}
