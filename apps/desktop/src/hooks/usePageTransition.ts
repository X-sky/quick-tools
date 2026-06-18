import { useCallback, useState } from "react"
import type { Transition } from "motion/react"
import { useReducedMotion } from "./useReducedMotion"

export type TransitionPhase = "idle" | "exiting" | "entering"

export interface PageTransitionConfig {
  /** motion/react transition config for page exit/enter animations */
  transition: Transition
  /** Initial state for entering page */
  initial: { opacity: number; y: number }
  /** Animate-to state for visible page */
  animate: { opacity: number; y: number }
  /** Exit state for leaving page */
  exit: { opacity: number; y: number }
}

export interface StartupStaggerConfig {
  /** motion/react transition config for staggered startup entrance */
  transition: Transition
  /** Initial state (hidden) */
  initial: { opacity: number }
  /** Animate-to state (visible) */
  animate: { opacity: number }
}

export interface UsePageTransitionReturn {
  /** Current transition phase */
  transitionPhase: TransitionPhase
  /** motion/react config for page transition animations */
  pageTransitionConfig: Transition
  /** Returns motion/react config for startup choreography at given stagger index */
  startupStaggerConfig: (index: number) => StartupStaggerConfig
  /** Full page motion props (initial, animate, exit, transition) */
  pageMotionProps: PageTransitionConfig
  /** Notify the hook that exit phase has started */
  onExitStart: () => void
  /** Notify the hook that enter phase has started */
  onEnterStart: () => void
  /** Notify the hook that transition is complete */
  onTransitionComplete: () => void
}

/** Stagger delay step in ms for startup choreography */
const STAGGER_DELAY_STEP = 100
/** Duration for each startup stagger element in ms */
const STAGGER_DURATION = 150

/**
 * Manages page transition phase state and provides motion/react transition
 * config objects for PageContainer and startup choreography.
 *
 * Integrates with useReducedMotion to set all durations to 0 when the user
 * prefers reduced motion.
 */
export function usePageTransition(): UsePageTransitionReturn {
  const reducedMotion = useReducedMotion()
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>("idle")

  const onExitStart = useCallback(() => {
    setTransitionPhase("exiting")
  }, [])

  const onEnterStart = useCallback(() => {
    setTransitionPhase("entering")
  }, [])

  const onTransitionComplete = useCallback(() => {
    setTransitionPhase("idle")
  }, [])

  // Page transition config for motion/react
  // Exit: 100ms, Enter: 150ms, ease-out
  const pageTransitionConfig: Transition = reducedMotion
    ? { duration: 0 }
    : {
        duration: 0.15, // enter duration (150ms)
        ease: [0.4, 0, 0.2, 1],
      }

  const pageMotionProps: PageTransitionConfig = {
    initial: { opacity: 0, y: reducedMotion ? 0 : 4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reducedMotion ? 0 : -4 },
    transition: reducedMotion
      ? { duration: 0 }
      : {
          duration: 0.15,
          ease: [0.4, 0, 0.2, 1],
        },
  }

  /**
   * Returns motion/react config for startup entrance choreography.
   * Each element is staggered by 100ms * index, with 150ms duration.
   *
   * Index mapping:
   *   0 = NavRail (delay 0ms)
   *   1 = Content (delay 100ms)
   *   2 = Toolbar (delay 200ms)
   */
  const startupStaggerConfig = useCallback(
    (index: number): StartupStaggerConfig => {
      if (reducedMotion) {
        return {
          initial: { opacity: 1 },
          animate: { opacity: 1 },
          transition: { duration: 0 },
        }
      }

      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: {
          duration: STAGGER_DURATION / 1000, // convert to seconds for motion/react
          delay: (index * STAGGER_DELAY_STEP) / 1000,
          ease: [0.4, 0, 0.2, 1],
        },
      }
    },
    [reducedMotion]
  )

  return {
    transitionPhase,
    pageTransitionConfig,
    startupStaggerConfig,
    pageMotionProps,
    onExitStart,
    onEnterStart,
    onTransitionComplete,
  }
}
