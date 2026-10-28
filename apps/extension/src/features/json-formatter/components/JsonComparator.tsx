import type { DiffLine, LineDiffResult } from "@quick-tools/json-formatter"
import { diffLines } from "@quick-tools/json-formatter"
import React, { useCallback, useRef, useState } from "react"

import { CompareIcon } from "~icons"

import { JsonEditor } from "./JsonEditor"

type DiffResult = LineDiffResult

export const JsonComparator = () => {
  const [leftText, setLeftText] = useState(`{
  "message": "Paste your JSON here"
}`)
  const [rightText, setRightText] = useState(`{
  "message": "Paste your JSON here"
}`)
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
  const [isComparing, setIsComparing] = useState(false)

  const leftEditorRef = useRef<{
    applyDiff: (diffLines: DiffLine[]) => void
    clearDiff: () => void
  }>(null)
  const rightEditorRef = useRef<{
    applyDiff: (diffLines: DiffLine[]) => void
    clearDiff: () => void
  }>(null)

  const handleCompare = useCallback(() => {
    setIsComparing(true)
    const result = diffLines(leftText, rightText)
    setDiffResult(result)

    // 应用装饰到编辑器
    setTimeout(() => {
      if (leftEditorRef.current && result.left) {
        leftEditorRef.current.applyDiff(result.left)
      }

      if (rightEditorRef.current && result.right) {
        rightEditorRef.current.applyDiff(result.right)
      }
      setIsComparing(false)
    }, 100)
  }, [leftText, rightText])

  const handleLeftChange = () => {
    setDiffResult(null)
    if (leftEditorRef.current) {
      leftEditorRef.current.clearDiff()
    }
    if (rightEditorRef.current) {
      rightEditorRef.current.clearDiff()
    }
  }

  const handleRightChange = () => {
    setDiffResult(null)
    if (leftEditorRef.current) {
      leftEditorRef.current.clearDiff()
    }
    if (rightEditorRef.current) {
      rightEditorRef.current.clearDiff()
    }
  }

  return (
    <div className="plasmo-h-full plasmo-min-h-screen plasmo-flex plasmo-flex-col plasmo-bg-gray-50">
      {/* Header */}
      <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-px-6 plasmo-py-5 plasmo-bg-white plasmo-border-b plasmo-border-gray-200 plasmo-shadow-sm">
        <div>
          <h1 className="plasmo-text-2xl plasmo-font-semibold plasmo-text-gray-900 plasmo-tracking-tight">
            JSON Formatter & Comparator
          </h1>
          <p className="plasmo-text-sm plasmo-text-gray-500 plasmo-mt-1">
            Format, validate, and compare JSON files
          </p>
        </div>
        <button
          onClick={handleCompare}
          disabled={isComparing}
          className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-px-5 plasmo-py-2.5 plasmo-bg-[#FF5A5F] plasmo-text-white plasmo-rounded-lg hover:plasmo-bg-[#FF6B70] disabled:plasmo-opacity-50 disabled:plasmo-cursor-not-allowed plasmo-transition-all plasmo-text-sm plasmo-font-medium plasmo-shadow-sm hover:plasmo-shadow-md plasmo-transform hover:plasmo-scale-[1.02]">
          <CompareIcon className="plasmo-w-5 plasmo-h-5" />
          {isComparing ? "Comparing..." : "Compare"}
        </button>
      </div>

      {/* Editor Container */}
      <div className="plasmo-flex-1 plasmo-min-h-0 plasmo-m-6 plasmo-mt-4 plasmo-mb-6 plasmo-flex plasmo-gap-4 plasmo-overflow-hidden">
        <JsonEditor
          ref={leftEditorRef}
          value={leftText}
          onChange={setLeftText}
          label="Left"
          onDiffChange={handleLeftChange}
        />
        <JsonEditor
          ref={rightEditorRef}
          value={rightText}
          onChange={setRightText}
          label="Right"
          onDiffChange={handleRightChange}
        />
      </div>
    </div>
  )
}
