import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { MagnifyingGlass } from "@phosphor-icons/react"

import { useReducedMotion } from "../../hooks/useReducedMotion"

/**
 * CommandPalette — 命令面板覆盖层组件。
 *
 * 使用 motion/react 实现可中断的 open/close 动画。
 * 位置：窗口中央偏上（距顶 20%），520px 宽，最大 60vh 高。
 * 背景：modal 阴影（暖色调）+ backdrop-blur 12px。
 *
 * 功能：
 * - 打开时自动聚焦搜索输入框
 * - 列表最多显示 8 项，超出滚动
 * - 键盘：上/下箭头移动高亮，Enter 执行，Escape 关闭
 * - 点击外部关闭
 * - 空状态："无匹配命令" 居中文字
 */

import type { PaletteCommand } from "../../hooks/useCommandPalette"
export type { PaletteCommand }

export interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  commands: PaletteCommand[]
  /** Current search query (controlled). */
  query?: string
  /** Called when the search query changes. */
  onQueryChange?: (q: string) => void
}

export function CommandPalette({ isOpen, onClose, commands, query, onQueryChange }: CommandPaletteProps) {
  const reducedMotion = useReducedMotion()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [highlightIndex, setHighlightIndex] = useState(0)

  // Reset highlight when commands change or palette opens
  useEffect(() => {
    if (isOpen) {
      setHighlightIndex(0)
    }
  }, [isOpen, commands])

  // Auto-focus search input on open
  useEffect(() => {
    if (!isOpen) return
    // Small delay to ensure the element is rendered after animation starts
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 10)
    return () => clearTimeout(timer)
  }, [isOpen])

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return
    const items = listRef.current.querySelectorAll("[data-palette-item]")
    const target = items[highlightIndex]
    if (target) {
      target.scrollIntoView({ block: "nearest" })
    }
  }, [highlightIndex])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setHighlightIndex((prev) =>
            prev < commands.length - 1 ? prev + 1 : prev
          )
          break
        case "ArrowUp":
          e.preventDefault()
          setHighlightIndex((prev) => (prev > 0 ? prev - 1 : prev))
          break
        case "Enter": {
          e.preventDefault()
          const target = commands[highlightIndex]
          if (commands.length > 0 && target) {
            target.onExecute()
            onClose()
          }
          break
        }
        case "Escape":
          e.preventDefault()
          onClose()
          break
      }
    },
    [commands, highlightIndex, onClose]
  )

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      // Only close if clicking the backdrop itself
      if (e.target === e.currentTarget) {
        onClose()
      }
    },
    [onClose]
  )

  const handleItemClick = useCallback(
    (command: PaletteCommand) => {
      command.onExecute()
      onClose()
    },
    [onClose]
  )

  // Animation config
  const duration = reducedMotion ? 0 : 0.15
  const exitDuration = reducedMotion ? 0 : 0.1

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-center"
          style={{ paddingTop: "20vh" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: exitDuration }}
          onClick={handleBackdropClick}
          role="presentation"
        >
          <motion.div
            className="w-[520px] max-h-[60vh] flex flex-col rounded-lg shadow-dt-modal overflow-hidden"
            style={{
              backgroundColor: "var(--neutral-50)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              height: "fit-content",
            }}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration }}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-label="命令面板"
            aria-modal="true"
          >
            {/* Search input */}
            <div
              className="flex items-center gap-2 px-4 py-3 border-b"
              style={{ borderColor: "var(--neutral-200)" }}
            >
              <MagnifyingGlass
                size={18}
                weight="light"
                className="shrink-0"
                style={{ color: "var(--neutral-400)" }}
              />
              <input
                ref={inputRef}
                type="text"
                value={query ?? ""}
                onChange={(e) => onQueryChange?.(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-dt-neutral-400"
                style={{
                  color: "var(--neutral-900)",
                  fontSize: "14px",
                }}
                placeholder="搜索命令..."
                aria-label="搜索命令"
              />
            </div>

            {/* Command list */}
            <div
              ref={listRef}
              className="overflow-y-auto"
              style={{ maxHeight: "calc(8 * 44px)" }}
              role="listbox"
              aria-label="命令列表"
            >
              {commands.length === 0 ? (
                <div
                  className="flex items-center justify-center py-8"
                  style={{ color: "var(--neutral-400)", fontSize: "14px" }}
                >
                  无匹配命令
                </div>
              ) : (
                commands.map((command, index) => (
                  <div
                    key={command.id}
                    data-palette-item
                    className="flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors duration-dt-instant"
                    style={{
                      backgroundColor:
                        index === highlightIndex
                          ? "hsla(350, 55%, 50%, 0.08)"
                          : "transparent",
                    }}
                    onClick={() => handleItemClick(command)}
                    onMouseEnter={() => setHighlightIndex(index)}
                    role="option"
                    aria-selected={index === highlightIndex}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--neutral-900)", fontSize: "14px" }}
                      >
                        {command.name}
                      </span>
                      <span
                        className="text-dt-2xs"
                        style={{ color: "var(--neutral-400)", fontSize: "11px" }}
                      >
                        {command.category}
                      </span>
                    </div>
                    {command.shortcut && (
                      <kbd
                        className="text-dt-2xs px-1.5 py-0.5 rounded-dt-xs"
                        style={{
                          color: "var(--neutral-500)",
                          backgroundColor: "var(--neutral-100)",
                          fontSize: "11px",
                        }}
                      >
                        {command.shortcut}
                      </kbd>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CommandPalette
