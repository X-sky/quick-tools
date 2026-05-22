import { useEffect } from "react"

interface ToastProps {
  message: string
  type: "success" | "error" | "info"
  duration?: number
  onClose: () => void
}

const typeStyles: Record<ToastProps["type"], string> = {
  success:
    "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200",
  error:
    "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-200",
  info:
    "bg-stone-50 border-stone-200 text-stone-800 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200"
}

const typeIcons: Record<ToastProps["type"], string> = {
  success: "✓",
  error: "✕",
  info: "ℹ"
}

export const Toast = ({ message, type, duration = 2000, onClose }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div
      className={`fixed right-4 top-4 z-50 flex animate-in items-center gap-2 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${typeStyles[type]}`}
      role="alert">
      <span className="text-sm font-semibold">{typeIcons[type]}</span>
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 rounded-md p-0.5 text-sm opacity-50 transition-opacity hover:opacity-100"
        aria-label="关闭提示">
        ×
      </button>
    </div>
  )
}
