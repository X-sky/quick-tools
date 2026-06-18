import React, { useCallback, useEffect, useRef, useState } from "react"

/**
 * SplitEditor — 可拖拽调整比例的双栏编辑器布局组件。
 *
 * 功能：
 * - 分隔线：1px 默认 → 4px hover（150ms CSS transition，品牌色）；8px 拖拽 hit area
 * - 拖拽：60fps 实时面板宽度更新；每侧最小 200px；到达极限时光标变为 not-allowed
 * - 双击分隔线：200ms 动画恢复 50:50 比例
 * - 面板标签：10px 高，11px 大写字母，neutral-400
 * - 内容内边距：16px
 * - 空状态：40% 透明度引导文字 + 32px Phosphor 线性图标居中
 * - 窗口 resize 时保持分割比例（300ms CSS transition）
 *
 * 约束：
 * - 使用 @phosphor-icons/react 单一图标库（Requirement 12.5）
 * - 背景色使用 neutral-50/neutral-900，非纯黑/纯白（Requirement 12.4 implied via 5.4）
 */

export interface SplitEditorProps {
  leftLabel: string
  rightLabel: string
  leftContent: React.ReactNode
  rightContent: React.ReactNode
  leftPlaceholder?: { icon: React.ReactNode; text: string }
  rightPlaceholder?: { icon: React.ReactNode; text: string }
  defaultRatio?: number // default: 0.5
  minPanelWidth?: number // default: 200 (px)
}

export function SplitEditor({
  leftLabel,
  rightLabel,
  leftContent,
  rightContent,
  leftPlaceholder,
  rightPlaceholder,
  defaultRatio = 0.5,
  minPanelWidth = 200,
}: SplitEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ratio, setRatio] = useState(defaultRatio)
  const [isDragging, setIsDragging] = useState(false)
  const [isAtLimit, setIsAtLimit] = useState(false)
  const [isResizing, setIsResizing] = useState(false)

  const draggingRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clamp ratio based on container width and minPanelWidth
  const clampRatio = useCallback(
    (newRatio: number): number => {
      const container = containerRef.current
      if (!container) return Math.max(0.1, Math.min(0.9, newRatio))

      const containerWidth = container.getBoundingClientRect().width
      if (containerWidth <= 0) return newRatio

      const minRatio = minPanelWidth / containerWidth
      const maxRatio = 1 - minPanelWidth / containerWidth

      return Math.max(minRatio, Math.min(maxRatio, newRatio))
    },
    [minPanelWidth]
  )

  // Handle drag start
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      draggingRef.current = true
      setIsDragging(true)
      setIsAtLimit(false)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    []
  )

  // Handle drag move with requestAnimationFrame for 60fps
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current || !containerRef.current) return

      // Cancel any pending rAF to avoid stacking
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }

      const clientX = e.clientX

      rafRef.current = requestAnimationFrame(() => {
        const container = containerRef.current
        if (!container) return

        const rect = container.getBoundingClientRect()
        const rawRatio = (clientX - rect.left) / rect.width
        const clampedRatio = clampRatio(rawRatio)

        // Detect if at limit
        const containerWidth = rect.width
        const minR = minPanelWidth / containerWidth
        const maxR = 1 - minPanelWidth / containerWidth
        setIsAtLimit(rawRatio <= minR || rawRatio >= maxR)

        setRatio(clampedRatio)
        rafRef.current = null
      })
    },
    [clampRatio, minPanelWidth]
  )

  // Handle drag end
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = false
      setIsDragging(false)
      setIsAtLimit(false)
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    },
    []
  )

  // Handle double-click to restore 50:50
  const handleDoubleClick = useCallback(() => {
    setRatio(clampRatio(0.5))
  }, [clampRatio])

  // Preserve split ratio on container resize using ResizeObserver
  // Uses 300ms CSS transition (duration-normal) for smooth adjustment
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => {
      // Don't apply transition during active drag
      if (draggingRef.current) return

      setIsResizing(true)

      // Re-clamp ratio in case container got smaller
      setRatio((prev) => clampRatio(prev))

      // Clear previous timer
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current)
      }

      // Remove resizing state after transition completes (300ms)
      resizeTimerRef.current = setTimeout(() => {
        setIsResizing(false)
      }, 300)
    })

    observer.observe(container)

    return () => {
      observer.disconnect()
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current)
      }
    }
  }, [clampRatio])

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  const leftWidth = `${ratio * 100}%`
  const rightWidth = `${(1 - ratio) * 100}%`

  // Determine panel transition class:
  // - During drag: no transition (real-time 60fps feedback)
  // - During resize: 300ms transition (duration-normal)
  // - Double-click / idle: 200ms transition (duration-fast)
  const getPanelTransitionClass = (): string => {
    if (isDragging) return ""
    if (isResizing) return "transition-[flex-basis] duration-dt-normal ease-dt-smooth"
    return "transition-[flex-basis] duration-dt-fast ease-dt-smooth"
  }

  const panelTransitionClass = getPanelTransitionClass()

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full flex-row"
      data-testid="split-editor"
    >
      {/* Left Panel */}
      <div
        className={`flex min-w-0 flex-col overflow-hidden ${panelTransitionClass}`}
        style={{ flexBasis: leftWidth, flexShrink: 0, flexGrow: 0 }}
        data-testid="split-editor-left"
      >
        {/* Label bar */}
        <div className="flex h-[10px] items-center px-4">
          <span className="text-[11px] font-medium uppercase leading-none tracking-wider text-dt-neutral-400">
            {leftLabel}
          </span>
        </div>

        {/* Content area */}
        <div className="relative flex-1 overflow-auto bg-dt-neutral-50 p-4 dark:bg-dt-neutral-900">
          {leftContent ? (
            leftContent
          ) : leftPlaceholder ? (
            <div className="flex h-full flex-col items-center justify-center opacity-40">
              <div className="mb-2">{leftPlaceholder.icon}</div>
              <p className="text-center text-xs text-dt-neutral-400">
                {leftPlaceholder.text}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Divider */}
      <div
        className="relative flex-shrink-0"
        style={{ width: "8px" }}
        data-testid="split-editor-divider"
      >
        {/* Visual divider line */}
        <div
          className={[
            "absolute left-1/2 top-0 h-full -translate-x-1/2",
            "transition-all duration-[150ms] ease-dt-smooth",
            isDragging
              ? "w-[4px] bg-dt-brand-500"
              : "w-[1px] bg-dt-neutral-200 hover:w-[4px] hover:bg-dt-brand-500 dark:bg-dt-neutral-800",
          ].join(" ")}
        />

        {/* Invisible hit area for dragging */}
        <div
          className="absolute inset-0 z-10"
          style={{
            cursor: isAtLimit ? "not-allowed" : "col-resize",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={Math.round(ratio * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Resize panels"
          tabIndex={0}
        />
      </div>

      {/* Right Panel */}
      <div
        className={`flex min-w-0 flex-col overflow-hidden ${panelTransitionClass}`}
        style={{ flexBasis: rightWidth, flexShrink: 0, flexGrow: 0 }}
        data-testid="split-editor-right"
      >
        {/* Label bar */}
        <div className="flex h-[10px] items-center px-4">
          <span className="text-[11px] font-medium uppercase leading-none tracking-wider text-dt-neutral-400">
            {rightLabel}
          </span>
        </div>

        {/* Content area */}
        <div className="relative flex-1 overflow-auto bg-dt-neutral-50 p-4 dark:bg-dt-neutral-900">
          {rightContent ? (
            rightContent
          ) : rightPlaceholder ? (
            <div className="flex h-full flex-col items-center justify-center opacity-40">
              <div className="mb-2">{rightPlaceholder.icon}</div>
              <p className="text-center text-xs text-dt-neutral-400">
                {rightPlaceholder.text}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default SplitEditor
