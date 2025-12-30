import React, { useCallback, useRef, useState } from "react"

import { CompareIcon } from "~icons"

import { JsonEditor } from "./JsonEditor"

interface DiffLine {
  lineNumber: number
  type: "added" | "removed" | "modified" | "unchanged"
}

interface DiffResult {
  left: DiffLine[]
  right: DiffLine[]
}

/**
 * 逐行比对两个 JSON 字符串
 * 使用简单的逐行比对算法，标记新增、删除、修改和未改变的行
 */
const compareJsonLines = (leftText: string, rightText: string): DiffResult => {
  const leftLines = leftText.split("\n")
  const rightLines = rightText.split("\n")

  const leftDiff: DiffLine[] = []
  const rightDiff: DiffLine[] = []

  const maxLen = Math.max(leftLines.length, rightLines.length)

  for (let i = 0; i < maxLen; i++) {
    const leftLine = i < leftLines.length ? leftLines[i] : null
    const rightLine = i < rightLines.length ? rightLines[i] : null

    if (leftLine === null && rightLine !== null) {
      // 左侧缺失，右侧新增
      rightDiff.push({ lineNumber: i + 1, type: "added" })
    } else if (leftLine !== null && rightLine === null) {
      // 右侧缺失，左侧删除
      leftDiff.push({ lineNumber: i + 1, type: "removed" })
    } else if (leftLine !== null && rightLine !== null) {
      // 比较两行内容
      const leftTrimmed = leftLine.trim()
      const rightTrimmed = rightLine.trim()

      if (leftTrimmed === rightTrimmed) {
        // 相同行
        leftDiff.push({ lineNumber: i + 1, type: "unchanged" })
        rightDiff.push({ lineNumber: i + 1, type: "unchanged" })
      } else {
        // 不同行，标记为修改
        leftDiff.push({ lineNumber: i + 1, type: "modified" })
        rightDiff.push({ lineNumber: i + 1, type: "modified" })
      }
    }
  }

  return { left: leftDiff, right: rightDiff }
}

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
    const result = compareJsonLines(leftText, rightText)
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
