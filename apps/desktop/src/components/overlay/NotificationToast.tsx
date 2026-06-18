import { AnimatePresence, motion } from "motion/react"
import { XIcon } from "@phosphor-icons/react"
import { useReducedMotion } from "../../hooks/useReducedMotion"
import type { ToastItem } from "../../hooks/useToastStack"

/**
 * NotificationToast & ToastStack — 通知吐司组件。
 *
 * 使用 motion/react AnimatePresence 管理堆栈动画（可中断、弹簧物理）。
 * 位置：右上角 16px；尺寸：300px 宽，最大 120px 高。
 * 左侧 3px 语义色条：success=emerald-500, error=rose-500, warning=amber-500, info=sky-500。
 * 自动退出 3s，悬停暂停；堆叠最多 5 个可见，超出时移除最旧。
 *
 * Toast 语言规范：直接、自信，不使用感叹号。
 * 成功用过去时态（"Formatted successfully"），错误直接陈述问题（"JSON parse failed at line 12"）。
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type { ToastItem }

export interface ToastStackProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
  onPause?: (id: string) => void
  onResume?: (id: string) => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_VISIBLE = 5

/** Semantic color bar mapping (left 3px bar) */
const SEMANTIC_COLORS: Record<ToastItem["type"], string> = {
  success: "bg-emerald-500",
  error: "bg-rose-500",
  warning: "bg-amber-500",
  info: "bg-sky-500",
}

// ─── Single Toast ────────────────────────────────────────────────────────────

interface NotificationToastProps {
  toast: ToastItem
  onDismiss: (id: string) => void
  onPause?: (id: string) => void
  onResume?: (id: string) => void
  reducedMotion: boolean
}

function NotificationToast({ toast, onDismiss, onPause, onResume, reducedMotion }: NotificationToastProps) {
  const handleMouseEnter = () => {
    onPause?.(toast.id)
  }

  const handleMouseLeave = () => {
    onResume?.(toast.id)
  }

  const duration200 = reducedMotion ? 0 : 0.2
  const duration150 = reducedMotion ? 0 : 0.15

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0, transition: { duration: duration200 } }}
      exit={{ opacity: 0, x: 8, transition: { duration: duration150 } }}
      transition={{
        layout: { type: "spring", stiffness: 500, damping: 35 },
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative flex w-[300px] max-h-[120px] overflow-hidden rounded-dt-sm bg-dt-neutral-50 dark:bg-dt-neutral-800 shadow-dt-raised"
      role="alert"
      aria-live="polite"
    >
      {/* Semantic color bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-dt-sm ${SEMANTIC_COLORS[toast.type]}`}
      />

      {/* Content */}
      <div className="flex-1 min-w-0 py-[12px] pl-[12px] pr-[8px]">
        <p className="text-[13px] font-bold leading-tight text-dt-neutral-900 dark:text-dt-neutral-100 truncate">
          {toast.title}
        </p>
        {toast.description && (
          <p className="mt-[4px] text-[12px] leading-[16px] text-dt-neutral-500 dark:text-dt-neutral-400 line-clamp-2">
            {toast.description}
          </p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 self-start mt-[8px] mr-[8px] p-[4px] rounded-dt-xs text-dt-neutral-400 hover:text-dt-neutral-700 dark:hover:text-dt-neutral-200 transition-colors duration-dt-instant"
        aria-label="Dismiss notification"
      >
        <XIcon size={16} weight="light" />
      </button>
    </motion.div>
  )
}

// ─── Toast Stack ─────────────────────────────────────────────────────────────

/**
 * ToastStack renders a stack of notification toasts in the top-right corner.
 * Max 5 visible at a time; oldest are removed when exceeded.
 * Uses AnimatePresence for entry/exit/reorder animations.
 */
export function ToastStack({ toasts, onDismiss, onPause, onResume }: ToastStackProps) {
  const reducedMotion = useReducedMotion()

  // Only show the most recent MAX_VISIBLE toasts
  const visibleToasts = toasts.slice(-MAX_VISIBLE)

  return (
    <div
      className="fixed top-[16px] right-[16px] z-50 flex flex-col gap-[8px]"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {visibleToasts.map((toast) => (
          <NotificationToast
            key={toast.id}
            toast={toast}
            onDismiss={onDismiss}
            onPause={onPause}
            onResume={onResume}
            reducedMotion={reducedMotion}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

export default ToastStack
