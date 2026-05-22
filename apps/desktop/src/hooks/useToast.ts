import { useCallback, useState } from "react"

interface ToastState {
  message: string
  type: "success" | "error" | "info"
  duration?: number
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info", duration?: number) => {
      setToast({ message, type, duration })
    },
    []
  )

  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

  return { toast, showToast, hideToast }
}
