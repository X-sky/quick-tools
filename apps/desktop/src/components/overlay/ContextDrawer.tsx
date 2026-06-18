import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  CaretLeft,
  X as XIcon,
  Trash,
  MagnifyingGlass,
  ClockCounterClockwise,
} from "@phosphor-icons/react"

import { useReducedMotion } from "../../hooks/useReducedMotion"

/**
 * ContextDrawer — 右侧上下文抽屉面板（历史记录）。
 *
 * 使用 motion/react AnimatePresence 实现可中断的 slide-in/slide-out 动画。
 * 默认收起：32px 触发条在右侧边缘，opacity 0.6 → 1.0 on hover。
 * 展开：300px 宽，250ms translateX 滑入。
 * 响应式：<1024px 切换为 overlay 模式（不压缩主内容区域）。
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 9.2, 10.8, 12.5
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ContextDrawerProps {
  isOpen: boolean
  onToggle: () => void
  title: string
  children?: React.ReactNode
}

export interface HistoryItem {
  id: string
  summary: string // max 40 chars display
  timestamp: Date
  operationType: string // e.g. "format", "generate", "export"
}

export interface ContextDrawerContentProps {
  isOpen: boolean
  onToggle: () => void
  title: string
  items: HistoryItem[]
  onDelete: (id: string) => void
  onItemClick?: (item: HistoryItem) => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DRAWER_WIDTH = 300
const TRIGGER_WIDTH = 32
const SLIDE_DURATION = 0.25 // 250ms
const DELETE_DURATION = 0.2 // 200ms
const SUMMARY_MAX_CHARS = 40

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Truncate summary to max 40 chars */
function truncateSummary(text: string): string {
  if (text.length <= SUMMARY_MAX_CHARS) return text
  return text.slice(0, SUMMARY_MAX_CHARS - 1) + "…"
}

/** Format timestamp to relative time string */
function formatRelativeTime(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return "刚刚"
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 30) return `${days} 天前`
  return `${Math.floor(days / 30)} 月前`
}

/** Operation type display labels */
const OPERATION_LABELS: Record<string, string> = {
  format: "格式化",
  minify: "压缩",
  "generate-qr": "生成 QR",
  "export-html": "导出 HTML",
  "export-md": "导出 MD",
  "export-pdf": "导出 PDF",
}

function getOperationLabel(type: string): string {
  return OPERATION_LABELS[type] || type
}

// ─── Trigger Strip ───────────────────────────────────────────────────────────

interface TriggerStripProps {
  onClick: () => void
}

function TriggerStrip({ onClick }: TriggerStripProps) {
  return (
    <button
      onClick={onClick}
      className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity duration-[150ms] cursor-pointer"
      style={{
        width: `${TRIGGER_WIDTH}px`,
        height: "64px",
        backgroundColor: "var(--neutral-100)",
        borderTopLeftRadius: "6px",
        borderBottomLeftRadius: "6px",
      }}
      aria-label="展开历史记录面板"
    >
      <CaretLeft size={16} weight="light" style={{ color: "var(--neutral-500)" }} />
    </button>
  )
}

// ─── History Item Row ────────────────────────────────────────────────────────

interface HistoryItemRowProps {
  item: HistoryItem
  onDelete: (id: string) => void
  onClick?: (item: HistoryItem) => void
  reducedMotion: boolean
}

function HistoryItemRow({ item, onDelete, onClick, reducedMotion }: HistoryItemRowProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      layout
      exit={{
        height: 0,
        opacity: 0,
        marginBottom: 0,
        transition: { duration: reducedMotion ? 0 : DELETE_DURATION },
      }}
      transition={{
        layout: { duration: reducedMotion ? 0 : DELETE_DURATION },
      }}
      className="relative group cursor-pointer"
      style={{
        borderBottom: "1px solid var(--neutral-200)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(item)}
      role="listitem"
    >
      <div className="flex items-start justify-between px-3 py-2.5">
        <div className="flex-1 min-w-0">
          {/* Summary */}
          <p
            className="text-[13px] leading-tight truncate"
            style={{ color: "var(--neutral-900)" }}
            title={item.summary}
          >
            {truncateSummary(item.summary)}
          </p>

          {/* Timestamp + operation type */}
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-[11px]"
              style={{ color: "var(--neutral-400)" }}
            >
              {formatRelativeTime(item.timestamp)}
            </span>
            <span
              className="text-[11px] px-1.5 py-0.5 rounded-dt-xs"
              style={{
                color: "var(--neutral-500)",
                backgroundColor: "var(--neutral-100)",
              }}
            >
              {getOperationLabel(item.operationType)}
            </span>
          </div>
        </div>

        {/* Delete button — 150ms fade-in on hover (CSS transition) */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(item.id)
          }}
          className="flex-shrink-0 p-1 rounded-dt-xs transition-opacity duration-[150ms]"
          style={{
            opacity: isHovered ? 1 : 0,
            pointerEvents: isHovered ? "auto" : "none",
            color: "var(--neutral-400)",
          }}
          aria-label={`删除记录: ${truncateSummary(item.summary)}`}
        >
          <Trash size={16} weight="light" />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  isSearching: boolean
}

function EmptyState({ isSearching }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <ClockCounterClockwise
        size={48}
        weight="light"
        style={{ color: "var(--neutral-300)" }}
      />
      <p
        className="mt-3 text-[13px]"
        style={{ color: "var(--neutral-400)" }}
      >
        {isSearching ? "无匹配项" : "暂无记录"}
      </p>
    </div>
  )
}

// ─── Drawer Panel ────────────────────────────────────────────────────────────

/**
 * ContextDrawer with full history list management.
 * Use this when you want the drawer to manage its own history display.
 */
export function ContextDrawerWithHistory({
  isOpen,
  onToggle,
  title,
  items,
  onDelete,
  onItemClick,
}: ContextDrawerContentProps) {
  const reducedMotion = useReducedMotion()
  const [searchQuery, setSearchQuery] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [isOverlayMode, setIsOverlayMode] = useState(false)

  // Responsive: <1024px → overlay mode
  useEffect(() => {
    const checkWidth = () => {
      setIsOverlayMode(window.innerWidth < 1024)
    }
    checkWidth()
    window.addEventListener("resize", checkWidth)
    return () => window.removeEventListener("resize", checkWidth)
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onToggle()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onToggle])

  // Focus search input when opened
  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => {
      searchInputRef.current?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [isOpen])

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    const lower = searchQuery.toLowerCase()
    return items.filter(
      (item) =>
        item.summary.toLowerCase().includes(lower) ||
        item.operationType.toLowerCase().includes(lower) ||
        getOperationLabel(item.operationType).toLowerCase().includes(lower)
    )
  }, [items, searchQuery])

  const slideDuration = reducedMotion ? 0 : SLIDE_DURATION

  return (
    <>
      {/* Trigger strip — only visible when closed */}
      {!isOpen && <TriggerStrip onClick={onToggle} />}

      {/* Drawer panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay backdrop for <1024px */}
            {isOverlayMode && (
              <motion.div
                className="fixed inset-0 z-40"
                style={{ backgroundColor: "hsla(40, 5%, 11%, 0.3)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: slideDuration }}
                onClick={onToggle}
                aria-hidden="true"
              />
            )}

            <motion.aside
              className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-hidden"
              style={{
                width: `${DRAWER_WIDTH}px`,
                backgroundColor: "var(--neutral-50)",
                borderLeft: "1px solid var(--neutral-200)",
                boxShadow: isOverlayMode
                  ? "0 8px 24px hsla(40, 10%, 20%, 0.1)"
                  : "none",
              }}
              initial={{ x: DRAWER_WIDTH }}
              animate={{ x: 0 }}
              exit={{ x: DRAWER_WIDTH }}
              transition={{
                duration: slideDuration,
                ease: [0.4, 0, 0.2, 1],
              }}
              role="complementary"
              aria-label={title}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid var(--neutral-200)" }}
              >
                <h2
                  className="text-[14px] font-medium"
                  style={{ color: "var(--neutral-900)" }}
                >
                  {title}
                </h2>
                <button
                  onClick={onToggle}
                  className="p-1 rounded-dt-xs transition-colors duration-dt-instant"
                  style={{ color: "var(--neutral-400)" }}
                  aria-label="关闭面板"
                >
                  <XIcon size={16} weight="light" />
                </button>
              </div>

              {/* Search input */}
              <div
                className="flex items-center gap-2 px-4 py-2"
                style={{ borderBottom: "1px solid var(--neutral-200)" }}
              >
                <MagnifyingGlass
                  size={16}
                  weight="light"
                  className="shrink-0"
                  style={{ color: "var(--neutral-400)" }}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-dt-neutral-400"
                  style={{ color: "var(--neutral-900)" }}
                  placeholder="搜索记录..."
                  aria-label="搜索历史记录"
                />
              </div>

              {/* History list */}
              <div
                className="flex-1 overflow-y-auto"
                role="list"
                aria-label="历史记录列表"
              >
                <AnimatePresence initial={false}>
                  {filteredItems.length === 0 ? (
                    <EmptyState isSearching={searchQuery.trim().length > 0} />
                  ) : (
                    filteredItems.map((item) => (
                      <HistoryItemRow
                        key={item.id}
                        item={item}
                        onDelete={onDelete}
                        onClick={onItemClick}
                        reducedMotion={reducedMotion}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Simple ContextDrawer (children-based) ───────────────────────────────────

/**
 * ContextDrawer — generic drawer that renders children content.
 * For history-specific usage, prefer ContextDrawerWithHistory.
 */
export function ContextDrawer({ isOpen, onToggle, title, children }: ContextDrawerProps) {
  const reducedMotion = useReducedMotion()
  const [isOverlayMode, setIsOverlayMode] = useState(false)

  // Responsive: <1024px → overlay mode
  useEffect(() => {
    const checkWidth = () => {
      setIsOverlayMode(window.innerWidth < 1024)
    }
    checkWidth()
    window.addEventListener("resize", checkWidth)
    return () => window.removeEventListener("resize", checkWidth)
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onToggle()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onToggle])

  const slideDuration = reducedMotion ? 0 : SLIDE_DURATION

  return (
    <>
      {/* Trigger strip — only visible when closed */}
      {!isOpen && <TriggerStrip onClick={onToggle} />}

      {/* Drawer panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay backdrop for <1024px */}
            {isOverlayMode && (
              <motion.div
                className="fixed inset-0 z-40"
                style={{ backgroundColor: "hsla(40, 5%, 11%, 0.3)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: slideDuration }}
                onClick={onToggle}
                aria-hidden="true"
              />
            )}

            <motion.aside
              className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-hidden"
              style={{
                width: `${DRAWER_WIDTH}px`,
                backgroundColor: "var(--neutral-50)",
                borderLeft: "1px solid var(--neutral-200)",
                boxShadow: isOverlayMode
                  ? "0 8px 24px hsla(40, 10%, 20%, 0.1)"
                  : "none",
              }}
              initial={{ x: DRAWER_WIDTH }}
              animate={{ x: 0 }}
              exit={{ x: DRAWER_WIDTH }}
              transition={{
                duration: slideDuration,
                ease: [0.4, 0, 0.2, 1],
              }}
              role="complementary"
              aria-label={title}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid var(--neutral-200)" }}
              >
                <h2
                  className="text-[14px] font-medium"
                  style={{ color: "var(--neutral-900)" }}
                >
                  {title}
                </h2>
                <button
                  onClick={onToggle}
                  className="p-1 rounded-dt-xs transition-colors duration-dt-instant"
                  style={{ color: "var(--neutral-400)" }}
                  aria-label="关闭面板"
                >
                  <XIcon size={16} weight="light" />
                </button>
              </div>

              {/* Children content */}
              <div className="flex-1 overflow-y-auto">
                {children}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Hook: useContextDrawerMargin ────────────────────────────────────────────

/**
 * Returns the right margin value that PageContainer should apply
 * when the drawer is open (inline mode only, ≥1024px).
 *
 * Usage in PageContainer or parent layout:
 *   const marginRight = useContextDrawerMargin(isDrawerOpen)
 *   <div style={{ marginRight, transition: 'margin-right 250ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
 */
export function useContextDrawerMargin(isOpen: boolean): number {
  const [isOverlayMode, setIsOverlayMode] = useState(false)

  useEffect(() => {
    const checkWidth = () => {
      setIsOverlayMode(window.innerWidth < 1024)
    }
    checkWidth()
    window.addEventListener("resize", checkWidth)
    return () => window.removeEventListener("resize", checkWidth)
  }, [])

  // In overlay mode (<1024px), no margin compression
  if (isOverlayMode) return 0
  return isOpen ? DRAWER_WIDTH : 0
}

export default ContextDrawer
