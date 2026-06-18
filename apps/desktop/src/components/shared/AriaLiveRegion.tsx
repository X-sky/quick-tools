import { createContext, useContext, useCallback, useState, useRef, type ReactNode } from "react"

/**
 * AriaLiveRegion — 无障碍实时通知区域。
 *
 * 提供 aria-live 区域用于向屏幕阅读器通知操作结果：
 * - polite: 成功消息、状态更新（不打断当前朗读）
 * - assertive: 错误消息（立即通知用户）
 *
 * 用法：
 * 1. 在应用根部放置 <AriaLiveRegion />
 * 2. 通过 useAriaLive() hook 获取 announce 函数
 * 3. 调用 announce("message", "polite") 或 announce("message", "assertive")
 *
 * Requirement 10.5: 操作结果通过 aria-live="polite" 通知，错误使用 aria-live="assertive"
 */

type Politeness = "polite" | "assertive"

interface AriaLiveContextValue {
  announce: (message: string, politeness?: Politeness) => void
}

const AriaLiveContext = createContext<AriaLiveContextValue | null>(null)

/**
 * Hook to access the aria-live announcement function.
 * Must be used within an AriaLiveProvider.
 */
export function useAriaLive(): AriaLiveContextValue {
  const context = useContext(AriaLiveContext)
  if (!context) {
    throw new Error("useAriaLive must be used within an AriaLiveProvider")
  }
  return context
}

interface AriaLiveProviderProps {
  children: ReactNode
}

/**
 * AriaLiveProvider wraps the app and provides announcement capabilities.
 * Renders two visually-hidden aria-live regions (polite and assertive).
 */
export function AriaLiveProvider({ children }: AriaLiveProviderProps) {
  const [politeMessage, setPoliteMessage] = useState("")
  const [assertiveMessage, setAssertiveMessage] = useState("")
  const politeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const assertiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const announce = useCallback((message: string, politeness: Politeness = "polite") => {
    if (politeness === "assertive") {
      // Clear previous assertive message to force re-announcement
      if (assertiveTimerRef.current) {
        clearTimeout(assertiveTimerRef.current)
      }
      setAssertiveMessage("")
      // Use requestAnimationFrame to ensure DOM update triggers re-read
      requestAnimationFrame(() => {
        setAssertiveMessage(message)
      })
      // Clear after 5s to keep region clean
      assertiveTimerRef.current = setTimeout(() => {
        setAssertiveMessage("")
        assertiveTimerRef.current = null
      }, 5000)
    } else {
      // Clear previous polite message to force re-announcement
      if (politeTimerRef.current) {
        clearTimeout(politeTimerRef.current)
      }
      setPoliteMessage("")
      requestAnimationFrame(() => {
        setPoliteMessage(message)
      })
      // Clear after 5s to keep region clean
      politeTimerRef.current = setTimeout(() => {
        setPoliteMessage("")
        politeTimerRef.current = null
      }, 5000)
    }
  }, [])

  return (
    <AriaLiveContext.Provider value={{ announce }}>
      {children}

      {/* Visually hidden aria-live regions */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>

      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AriaLiveContext.Provider>
  )
}

/**
 * Standalone AriaLiveRegion component for cases where the provider pattern
 * is not needed. Renders both polite and assertive regions.
 */
export function AriaLiveRegion() {
  return (
    <>
      <div
        id="aria-live-polite"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        id="aria-live-assertive"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  )
}

export default AriaLiveRegion
