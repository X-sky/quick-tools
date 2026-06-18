import { useState, useCallback, useRef } from "react"
import { X, Warning } from "@phosphor-icons/react"

import { getPlatform } from "@quick-tools/platform"

import { truncatePath } from "../../lib/path-truncate"

export interface StatusStripProps {
  diagnostics: { errors: number; warnings: number }
  filePath?: string
  pageMode?: string
  stats: { chars: number; lines: number; encoding: string }
  onPathClick?: () => void
}

/**
 * StatusStrip — 底部状态信息条。
 *
 * Keyboard Navigation Tab Order (Requirement 10.3):
 * - StatusStrip is the 4th (last) tab stop in the shell layout
 *   (NavigationRail → CommandBar → main content → StatusStrip)
 * - Tab into StatusStrip focuses the file path button (if present)
 *
 * 高度 24px，字号 11px，neutral-500 文字色。
 * 三段式布局：左（诊断）| 中（路径/模式）| 右（统计）
 * 点击路径区域复制完整路径到剪贴板，显示反馈文字。
 */
export default function StatusStrip({
  diagnostics,
  filePath,
  pageMode,
  stats,
  onPathClick,
}: StatusStripProps) {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handlePathClick = useCallback(async () => {
    if (!filePath) return

    // Clear any existing feedback timer
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = null
    }

    try {
      const platform = getPlatform()
      const result = await platform.clipboard.writeText(filePath)

      if (result.ok) {
        setCopyFeedback("已复制")
      } else {
        setCopyFeedback("复制失败")
      }
    } catch {
      setCopyFeedback("复制失败")
    }

    // Restore path display after 1.5s
    feedbackTimerRef.current = setTimeout(() => {
      setCopyFeedback(null)
      feedbackTimerRef.current = null
    }, 1500)

    onPathClick?.()
  }, [filePath, onPathClick])

  const hasErrors = diagnostics.errors > 0

  return (
    <footer
      className="flex h-6 min-h-[24px] max-h-[24px] items-center border-t border-dt-neutral-200 px-4 text-dt-2xs text-dt-neutral-500 dark:border-dt-neutral-800"
      role="contentinfo"
      aria-label="Status bar"
    >
      {/* Left section: diagnostics */}
      <div className="flex items-center gap-2" aria-label="Diagnostics">
        {hasErrors && (
          <span
            className="inline-block h-[6px] w-[6px] rounded-full bg-rose-500 animate-pulse"
            aria-hidden="true"
          />
        )}
        <span className={hasErrors ? "text-rose-500" : undefined}>
          <span aria-label={`${diagnostics.errors} errors`} className="inline-flex items-center gap-0.5">
            <X size={10} weight="bold" aria-hidden="true" />
            {diagnostics.errors}
          </span>
        </span>
        <span aria-label={`${diagnostics.warnings} warnings`} className="inline-flex items-center gap-0.5">
          <Warning size={10} weight="bold" aria-hidden="true" />
          {diagnostics.warnings}
        </span>
      </div>

      {/* Center section: file path or page mode */}
      <div className="mx-4 flex-1 overflow-hidden text-center">
        {copyFeedback ? (
          <span aria-live="polite">{copyFeedback}</span>
        ) : filePath ? (
          <button
            type="button"
            onClick={handlePathClick}
            className="max-w-full cursor-pointer truncate border-none bg-transparent text-dt-2xs text-dt-neutral-500 hover:text-dt-neutral-700 dark:hover:text-dt-neutral-300"
            title={filePath}
            aria-label={`File path: ${filePath}. Click to copy.`}
          >
            {truncatePath(filePath, 60)}
          </button>
        ) : pageMode ? (
          <span>{pageMode}</span>
        ) : null}
      </div>

      {/* Right section: stats */}
      <div className="flex items-center gap-3 whitespace-nowrap" aria-label="File statistics">
        <span>{stats.chars} chars</span>
        <span>{stats.lines} lines</span>
        <span>{stats.encoding}</span>
      </div>
    </footer>
  )
}
