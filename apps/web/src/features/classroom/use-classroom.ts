"use client"

import { useState, useCallback, useRef } from "react"
import { apiRequest } from "@/lib/api-client"
import type { ClassroomStatusResponse, ClassroomMode, Syllabus } from "@doubtmaster/shared-types"

interface UseClassroomReturn {
  status:       ClassroomStatusResponse | null
  classroomUrl: string | null
  error:        string | null
  isLoading:    boolean
  generate:     (params: GenerateParams) => Promise<void>
  reset:        () => void
}

interface GenerateParams {
  mode:    ClassroomMode
  subject: string
  topic:   string
  syllabus: Syllabus
  grade?:   string
  source_question_id?: string
}

const POLL_INITIAL_MS  = 1000
const POLL_MAX_MS      = 10000
const POLL_BACKOFF     = 1.5
const POLL_MAX_RETRIES = 60

export function useClassroom(): UseClassroomReturn {
  const [status, setStatus]       = useState<ClassroomStatusResponse | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const pollRef                   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reset = useCallback(() => {
    if (pollRef.current) clearTimeout(pollRef.current)
    setStatus(null)
    setError(null)
    setIsLoading(false)
  }, [])

  const pollStatus = useCallback(async (sessionId: string, delayMs: number, attempt: number) => {
    if (attempt >= POLL_MAX_RETRIES) {
      setError("Classroom generation timed out. Please try again.")
      setIsLoading(false)
      return
    }

    try {
      const res = await apiRequest<ClassroomStatusResponse>(
        `/api/v1/classroom/status/${sessionId}`
      )
      setStatus(res)

      if (res.status === "ready") {
        setIsLoading(false)
        return
      }

      if (res.status === "failed") {
        setError(res.error_message || "Classroom generation failed.")
        setIsLoading(false)
        return
      }

      // Still generating — poll again with backoff
      const nextDelay = Math.min(delayMs * POLL_BACKOFF, POLL_MAX_MS)
      pollRef.current = setTimeout(() => pollStatus(sessionId, nextDelay, attempt + 1), delayMs)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to check classroom status")
      setIsLoading(false)
    }
  }, [])

  const generate = useCallback(async (params: GenerateParams) => {
    reset()
    setIsLoading(true)

    try {
      const res = await apiRequest<ClassroomStatusResponse>(
        "/api/v1/classroom/generate",
        { method: "POST", body: JSON.stringify(params) }
      )
      setStatus(res)

      if (res.status === "generating" || res.status === "pending") {
        pollStatus(res.session_id, POLL_INITIAL_MS, 0)
      } else if (res.status === "ready") {
        setIsLoading(false)
      } else if (res.status === "failed") {
        setError(res.error_message || "Generation failed")
        setIsLoading(false)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start classroom")
      setIsLoading(false)
    }
  }, [reset, pollStatus])

  return {
    status,
    classroomUrl: status?.classroom_url ?? null,
    error,
    isLoading,
    generate,
    reset,
  }
}
