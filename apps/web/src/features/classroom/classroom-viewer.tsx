"use client"

import { useCallback, useEffect, useState } from "react"
import { ErrorBoundary } from "@/components/error-boundary"

interface ClassroomViewerProps {
  classroomUrl: string
  onClose:      () => void
}

function ClassroomViewerInner({ classroomUrl, onClose }: ClassroomViewerProps) {
  const [loading, setLoading] = useState(true)

  const handleLoad = useCallback(() => {
    setLoading(false)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 bg-white rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
          <span className="text-sm font-medium text-gray-700">Interactive Classroom</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold px-2"
            aria-label="Close classroom"
          >
            &times;
          </button>
        </div>

        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        )}

        {/* Iframe */}
        <iframe
          src={classroomUrl}
          title="OpenMAIC Interactive Classroom"
          className="w-full h-[calc(100%-48px)]"
          onLoad={handleLoad}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          allow="microphone; camera"
        />
      </div>
    </div>
  )
}

export function ClassroomViewer(props: ClassroomViewerProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-8 text-center max-w-md">
            <p className="text-sm text-gray-600 mb-4">
              Something went wrong loading the classroom.
            </p>
            <button
              onClick={props.onClose}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm"
            >
              Close
            </button>
          </div>
        </div>
      }
    >
      <ClassroomViewerInner {...props} />
    </ErrorBoundary>
  )
}
