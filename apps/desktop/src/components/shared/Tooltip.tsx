import { useState, useRef, useCallback, useEffect } from "react"

interface TooltipProps {
  content: string
  shortcut?: string
  delay?: number // default: 400ms for nav, 150ms for buttons
  position?: "right" | "bottom"
  maxWidth?: number // default: 200px
  /**
   * When true, suppress tooltip display on focus events.
   * Tooltip will only show on mouse hover (with delay).
   * Used for NavigationRail tooltips in the 900-1024px viewport range (Requirement 9.3).
   */
  hoverOnly?: boolean
  children: React.ReactNode
}

export const Tooltip = ({
  content,
  shortcut,
  delay = 400,
  position = "bottom",
  maxWidth = 200,
  hoverOnly = false,
  children,
}: TooltipProps) => {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setVisible(true)
    }, delay)
  }, [delay])

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setVisible(false)
  }, [])

  const handleFocus = useCallback(() => {
    if (!hoverOnly) {
      show()
    }
  }, [hoverOnly, show])

  const handleBlur = useCallback(() => {
    if (!hoverOnly) {
      hide()
    }
  }, [hoverOnly, hide])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const positionStyles: React.CSSProperties =
    position === "right"
      ? { left: "calc(100% + 8px)", top: "50%", transform: `translateY(-50%) ${visible ? "translateX(0)" : "translateX(-4px)"}` }
      : { top: "calc(100% + 8px)", left: "50%", transform: `translateX(-50%) ${visible ? "translateY(0)" : "translateY(-4px)"}` }

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
      <div
        role="tooltip"
        aria-hidden={!visible}
        className="pointer-events-none absolute z-50 w-max px-2 py-1"
        style={{
          ...positionStyles,
          maxWidth,
          fontSize: "12px",
          lineHeight: "16px",
          borderRadius: "var(--radius-sm, 6px)",
          boxShadow: "var(--shadow-raised, 0 2px 8px hsla(40, 10%, 20%, 0.06))",
          backgroundColor: "var(--neutral-800, hsl(40, 5%, 18%))",
          color: "var(--neutral-50, hsl(40, 6%, 97%))",
          opacity: visible ? 1 : 0,
          transition: "opacity var(--duration-instant, 100ms) var(--ease-smooth, cubic-bezier(0.4, 0, 0.2, 1)), transform var(--duration-instant, 100ms) var(--ease-smooth, cubic-bezier(0.4, 0, 0.2, 1))",
        }}
      >
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span>{content}</span>
          {shortcut && (
            <kbd
              className="inline-flex items-center rounded px-1"
              style={{
                fontSize: "11px",
                lineHeight: "14px",
                backgroundColor: "hsla(40, 5%, 97%, 0.15)",
                color: "var(--neutral-300, hsl(40, 4%, 74%))",
              }}
            >
              {shortcut}
            </kbd>
          )}
        </span>
      </div>
    </div>
  )
}
