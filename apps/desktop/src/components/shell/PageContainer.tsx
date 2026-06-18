import { AnimatePresence, motion } from "motion/react"
import type { ReactNode } from "react"

import { useReducedMotion } from "../../hooks/useReducedMotion"
import type { PageId } from "./NavigationRail"

interface PageContainerProps {
  activePage: PageId
  children: Record<PageId, ReactNode>
}

/**
 * Page transition orchestrator using motion/react.
 *
 * Keyboard Navigation Tab Order (Requirement 10.3):
 * - PageContainer (main content) is the 3rd tab stop in the shell layout
 *   (NavigationRail → CommandBar → main content → StatusStrip)
 * - Tab into main content focuses the first interactive element within the active page
 *
 * - Exit: opacity 1→0, translateY 0→-4px, 100ms ease-out
 * - Enter: opacity 0→1, translateY 4px→0, 150ms ease-out
 * - AnimatePresence mode="wait" ensures sequential exit→enter
 * - Rapid page switches are handled natively by motion/react's interruption model
 * - Respects prefers-reduced-motion by zeroing all durations
 */
export default function PageContainer({ activePage, children }: PageContainerProps) {
  const reducedMotion = useReducedMotion()

  // ease-out curve: cubic-bezier(0, 0, 0.58, 1)
  const easeOut: [number, number, number, number] = [0, 0, 0.58, 1]

  const pageVariants = {
    initial: { opacity: 0, y: 4 },
    animate: {
      opacity: 1,
      y: 0,
      transition: reducedMotion
        ? { duration: 0 }
        : { duration: 0.15, ease: easeOut }, // enter: 150ms ease-out
    },
    exit: {
      opacity: 0,
      y: -4,
      transition: reducedMotion
        ? { duration: 0 }
        : { duration: 0.1, ease: easeOut }, // exit: 100ms ease-out
    },
  }

  return (
    <div className="relative flex h-full w-full flex-1 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={activePage}
          className="h-full w-full min-h-0 min-w-0"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {children[activePage]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/**
 * Startup entrance choreography wrapper.
 *
 * Staggered fade-in for shell regions:
 * - NavRail: delay 0ms, duration 150ms, opacity 0→1
 * - Content: delay 100ms, duration 150ms, opacity 0→1
 * - Toolbar: delay 200ms, duration 150ms, opacity 0→1
 *
 * Respects prefers-reduced-motion by zeroing all durations and delays.
 */
export type StartupRegion = "nav-rail" | "content" | "toolbar"

const STARTUP_DELAYS: Record<StartupRegion, number> = {
  "nav-rail": 0,
  content: 0.1, // 100ms
  toolbar: 0.2, // 200ms
}

const STARTUP_DURATION = 0.15 // 150ms

interface StartupEntranceProps {
  region: StartupRegion
  children: ReactNode
  /** Extra class names — use to preserve flex layout (e.g. "flex flex-1 min-h-0") */
  className?: string
}

export function StartupEntrance({ region, children, className }: StartupEntranceProps) {
  const reducedMotion = useReducedMotion()

  const easeOut: [number, number, number, number] = [0, 0, 0.58, 1]

  const transition = reducedMotion
    ? { duration: 0, delay: 0 }
    : { duration: STARTUP_DURATION, delay: STARTUP_DELAYS[region], ease: easeOut }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={transition}
    >
      {children}
    </motion.div>
  )
}
