import { useCallback, useEffect, useRef, useState } from "react"

/**
 * useToastStack — 管理通知 Toast 堆栈。
 *
 * 功能：
 * - 添加 toast（自动生成 id）
 * - 移除 toast（手动关闭或自动退出）
 * - 最多保留 5 个可见 toast（超出时自动移除最旧）
 * - 自动退出计时器（默认 3000ms）
 * - 悬停暂停/恢复计时器（pauseToast / resumeToast）
 * - 支持 success/error/warning/info 类型
 *
 * Requirements: 7.4, 7.5
 */

export interface ToastItem {
  id: string
  type: "success" | "error" | "warning" | "info"
  title: string
  description?: string
  duration?: number // default: 3000ms
}

export interface UseToastStackReturn {
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, "id">) => void
  dismissToast: (id: string) => void
  pauseToast: (id: string) => void
  resumeToast: (id: string) => void
}

const MAX_VISIBLE_TOASTS = 5
const DEFAULT_DURATION = 3000

interface TimerState {
  timerId: ReturnType<typeof setTimeout> | null
  remaining: number
  startedAt: number
}

let toastIdCounter = 0

function generateId(): string {
  toastIdCounter += 1
  return `toast-${Date.now()}-${toastIdCounter}`
}

export function useToastStack(): UseToastStackReturn {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, TimerState>>(new Map())

  const dismissToast = useCallback((id: string) => {
    // Clear timer
    const timer = timersRef.current.get(id)
    if (timer?.timerId) {
      clearTimeout(timer.timerId)
    }
    timersRef.current.delete(id)

    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const startTimer = useCallback(
    (id: string, duration: number) => {
      const timerId = setTimeout(() => {
        dismissToast(id)
      }, duration)

      timersRef.current.set(id, {
        timerId,
        remaining: duration,
        startedAt: Date.now(),
      })
    },
    [dismissToast]
  )

  const addToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = generateId()
      const duration = toast.duration ?? DEFAULT_DURATION
      const newToast: ToastItem = { ...toast, id, duration }

      setToasts((prev) => {
        const updated = [...prev, newToast]
        // Enforce max 5 visible toasts — remove oldest (first in array)
        if (updated.length > MAX_VISIBLE_TOASTS) {
          const removed = updated.slice(0, updated.length - MAX_VISIBLE_TOASTS)
          // Clean up timers for removed toasts
          for (const removedToast of removed) {
            const timer = timersRef.current.get(removedToast.id)
            if (timer?.timerId) {
              clearTimeout(timer.timerId)
            }
            timersRef.current.delete(removedToast.id)
          }
          return updated.slice(-MAX_VISIBLE_TOASTS)
        }
        return updated
      })

      // Start auto-dismiss timer
      startTimer(id, duration)
    },
    [startTimer]
  )

  const pauseToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (!timer || !timer.timerId) return

    // Clear the running timer
    clearTimeout(timer.timerId)

    // Calculate remaining time
    const elapsed = Date.now() - timer.startedAt
    const remaining = Math.max(0, timer.remaining - elapsed)

    timersRef.current.set(id, {
      timerId: null,
      remaining,
      startedAt: timer.startedAt,
    })
  }, [])

  const resumeToast = useCallback(
    (id: string) => {
      const timer = timersRef.current.get(id)
      if (!timer || timer.timerId !== null) return

      // Restart timer with remaining duration
      const remaining = timer.remaining
      if (remaining <= 0) {
        dismissToast(id)
        return
      }

      const timerId = setTimeout(() => {
        dismissToast(id)
      }, remaining)

      timersRef.current.set(id, {
        timerId,
        remaining,
        startedAt: Date.now(),
      })
    },
    [dismissToast]
  )

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        if (timer.timerId) {
          clearTimeout(timer.timerId)
        }
      }
      timersRef.current.clear()
    }
  }, [])

  return { toasts, addToast, dismissToast, pauseToast, resumeToast }
}
