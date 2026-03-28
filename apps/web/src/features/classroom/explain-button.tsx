"use client"

import { useState, useCallback } from "react"
import { useClassroom } from "./use-classroom"
import { ClassroomViewer } from "./classroom-viewer"
import type { ClassroomMode, Syllabus } from "@doubtmaster/shared-types"

interface ExplainButtonProps {
  subject:  string
  topic:    string
  syllabus: Syllabus
  grade?:   string
  sourceQuestionId?: string
}

const MODES: { value: ClassroomMode; label: string; description: string }[] = [
  { value: "explain",    label: "Explain concept",    description: "Step-by-step explanation" },
  { value: "quiz",       label: "Quiz me",            description: "Test your understanding" },
  { value: "pbl",        label: "Problem-based",      description: "Learn by solving problems" },
  { value: "whiteboard", label: "Visual whiteboard",  description: "Interactive visual learning" },
]

export function ExplainButton({ subject, topic, syllabus, grade, sourceQuestionId }: ExplainButtonProps) {
  const [showPicker, setShowPicker] = useState(false)
  const { classroomUrl, error, isLoading, generate, reset } = useClassroom()

  const handleModeSelect = useCallback((mode: ClassroomMode) => {
    setShowPicker(false)
    generate({
      mode,
      subject,
      topic,
      syllabus,
      grade,
      source_question_id: sourceQuestionId,
    })
  }, [generate, subject, topic, syllabus, grade, sourceQuestionId])

  const handleClose = useCallback(() => {
    reset()
    setShowPicker(false)
  }, [reset])

  return (
    <>
      <button
        onClick={() => setShowPicker(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
      >
        Learn this concept
      </button>

      {/* Mode picker modal */}
      {showPicker && !isLoading && !classroomUrl && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Choose learning mode</h3>
            <div className="space-y-2">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => handleModeSelect(m.value)}
                  className="w-full text-left px-4 py-3 rounded-lg border hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  <div className="font-medium text-sm">{m.label}</div>
                  <div className="text-xs text-gray-500">{m.description}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowPicker(false)}
              className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Generating state */}
      {isLoading && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 text-center max-w-sm mx-4">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm text-gray-600">Generating your classroom...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 text-center max-w-sm mx-4">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-gray-100 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Classroom viewer */}
      {classroomUrl && (
        <ClassroomViewer classroomUrl={classroomUrl} onClose={handleClose} />
      )}
    </>
  )
}
