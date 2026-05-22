import React, { useCallback, useRef, useState } from "react"

interface ResizableSplitPaneProps {
  left: React.ReactNode
  right: React.ReactNode
  defaultRatio?: number
  minRatio?: number
  maxRatio?: number
  direction?: "horizontal" | "vertical"
}

export function ResizableSplitPane({
  left,
  right,
  defaultRatio = 0.5,
  minRatio = 0.2,
  maxRatio = 0.8,
  direction = "horizontal"
}: ResizableSplitPaneProps) {
  const [ratio, setRatio] = useState(defaultRatio)
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      draggingRef.current = true
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    []
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      let newRatio: number

      if (direction === "horizontal") {
        newRatio = (e.clientX - rect.left) / rect.width
      } else {
        newRatio = (e.clientY - rect.top) / rect.height
      }

      newRatio = Math.max(minRatio, Math.min(maxRatio, newRatio))
      setRatio(newRatio)
    },
    [direction, minRatio, maxRatio]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = false
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    },
    []
  )

  const isHorizontal = direction === "horizontal"
  const leftBasis = `${ratio * 100}%`
  const rightBasis = `${(1 - ratio) * 100}%`

  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full ${isHorizontal ? "flex-row" : "flex-col"}`}>
      <div
        className="min-h-0 min-w-0 overflow-auto"
        style={{ flexBasis: leftBasis, flexShrink: 0, flexGrow: 0 }}>
        {left}
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`flex-shrink-0 ${
          isHorizontal
            ? "w-1 cursor-col-resize hover:bg-rose-300 dark:hover:bg-rose-700"
            : "h-1 cursor-row-resize hover:bg-rose-300 dark:hover:bg-rose-700"
        } bg-stone-200 transition-colors dark:bg-stone-700`}
      />
      <div
        className="min-h-0 min-w-0 overflow-auto"
        style={{ flexBasis: rightBasis, flexShrink: 0, flexGrow: 0 }}>
        {right}
      </div>
    </div>
  )
}
