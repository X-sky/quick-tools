import { useRef, useCallback, useState, useEffect } from "react"
import type { KeyboardEvent } from "react"
import type { Icon as PhosphorIcon } from "@phosphor-icons/react"
import { BracketsCurly, QrCode, Export, GearSix } from "@phosphor-icons/react"
import { Tooltip } from "../shared/Tooltip"
import { focusRingClass } from "../shared/FocusRing"

export type PageId = "json-formatter" | "qr-code-gen" | "web-export"

interface NavigationRailProps {
  activePage: PageId
  onPageChange: (page: PageId) => void
}

interface NavItem {
  id: PageId
  label: string
  icon: PhosphorIcon
}

const navItems: NavItem[] = [
  { id: "json-formatter", label: "JSON Formatter", icon: BracketsCurly },
  { id: "qr-code-gen", label: "QR Code", icon: QrCode },
  { id: "web-export", label: "Web Export", icon: Export },
]

/**
 * Keyboard Navigation Tab Order (Requirement 10.3):
 * 1. NavigationRail (tabIndex region: 1st in DOM order)
 * 2. CommandBar (tabIndex region: 2nd in DOM order)
 * 3. Main content / PageContainer (tabIndex region: 3rd in DOM order)
 * 4. StatusStrip (tabIndex region: 4th in DOM order)
 *
 * Within NavigationRail:
 * - Tab focuses the active nav item (roving tabindex pattern)
 * - Arrow Up/Down moves between nav items
 * - Enter activates the focused item
 */
export default function NavigationRail({ activePage, onPageChange }: NavigationRailProps) {
  const navItemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Detect 900-1024px viewport range for tooltip suppression (Requirement 9.3)
  // In this range, suppress auto-show (focus-triggered) tooltips; only show on 400ms hover
  const [isNarrowViewport, setIsNarrowViewport] = useState(false)

  useEffect(() => {
    const checkWidth = () => {
      const w = window.innerWidth
      setIsNarrowViewport(w >= 900 && w < 1024)
    }
    checkWidth()
    window.addEventListener("resize", checkWidth)
    return () => window.removeEventListener("resize", checkWidth)
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLUListElement>) => {
      const currentIndex = navItemRefs.current.findIndex(
        (ref) => ref === document.activeElement
      )
      if (currentIndex === -1) return

      let nextIndex: number | null = null

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          nextIndex = (currentIndex + 1) % navItems.length
          break
        case "ArrowUp":
          e.preventDefault()
          nextIndex = (currentIndex - 1 + navItems.length) % navItems.length
          break
        case "Enter": {
          e.preventDefault()
          const item = navItems[currentIndex]
          if (item) onPageChange(item.id)
          break
        }
        default:
          return
      }

      if (nextIndex !== null) {
        navItemRefs.current[nextIndex]?.focus()
      }
    },
    [onPageChange]
  )

  return (
    <nav
      className="relative flex h-full w-[64px] min-w-[64px] flex-col items-center border-r border-dt-neutral-200 bg-dt-neutral-50"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="mt-4 flex items-center justify-center">
        <div className="flex h-6 w-6 items-center justify-center rounded-dt-sm bg-dt-brand-500">
          <span className="text-[10px] font-bold text-dt-neutral-50 dark:text-dt-neutral-950">Q</span>
        </div>
      </div>

      {/* Nav items */}
      <ul
        className="mt-8 flex flex-col items-center gap-6"
        role="list"
        onKeyDown={handleKeyDown}
      >
        {navItems.map((item, index) => {
          const isActive = activePage === item.id
          const Icon = item.icon

          return (
            <li key={item.id} className="relative">
              {/* Active indicator bar */}
              {isActive && (
                <div
                  className="absolute left-[-20px] top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-[2px] bg-dt-brand-500"
                  aria-hidden="true"
                />
              )}

              <Tooltip content={item.label} position="right" delay={400} hoverOnly={isNarrowViewport}>
                <button
                  ref={(el) => { navItemRefs.current[index] = el }}
                  type="button"
                  onClick={() => onPageChange(item.id)}
                  tabIndex={isActive ? 0 : -1}
                  className={`nav-rail-item group relative flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-dt-instant ease-dt-smooth ${focusRingClass}`}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  {/* Hover background circle */}
                  <span
                    className="absolute inset-0 rounded-full bg-dt-neutral-950 opacity-0 transition-opacity duration-dt-instant ease-dt-smooth group-hover:opacity-[0.08] dark:group-hover:opacity-[0.12]"
                    aria-hidden="true"
                  />

                  {/* Icon */}
                  <span className="relative transition-transform duration-dt-instant ease-dt-smooth group-hover:scale-[1.1]">
                    <Icon
                      size={20}
                      weight={isActive ? "fill" : "light"}
                      className={
                        isActive
                          ? "text-dt-brand-500"
                          : "text-dt-neutral-500 transition-colors duration-dt-instant ease-dt-smooth"
                      }
                    />
                  </span>
                </button>
              </Tooltip>
            </li>
          )
        })}
      </ul>

      {/* Settings icon at bottom */}
      <div className="mb-4 mt-auto">
        <Tooltip content="Settings" position="right" delay={400} hoverOnly={isNarrowViewport}>
          <button
            type="button"
            className={`nav-rail-item group relative flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-dt-instant ease-dt-smooth ${focusRingClass}`}
            aria-label="Settings"
          >
            {/* Hover background circle */}
            <span
              className="absolute inset-0 rounded-full bg-dt-neutral-950 opacity-0 transition-opacity duration-dt-instant ease-dt-smooth group-hover:opacity-[0.08] dark:group-hover:opacity-[0.12]"
              aria-hidden="true"
            />

            {/* Icon */}
            <span className="relative transition-transform duration-dt-instant ease-dt-smooth group-hover:scale-[1.1]">
              <GearSix
                size={20}
                weight="light"
                className="text-dt-neutral-500 transition-colors duration-dt-instant ease-dt-smooth"
              />
            </span>
          </button>
        </Tooltip>
      </div>
    </nav>
  )
}
