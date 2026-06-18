/**
 * Design Token Constants
 *
 * TypeScript constants for the "Refined Utility" design system.
 * Used by property tests and runtime logic (e.g., large container radius rule).
 */

export const TYPOGRAPHY_SCALE = {
  ratio: 1.25, // Major Third
  base: 14, // px
  steps: [-1, 0, 1, 2, 3] as const,
  // Generated: 11, 14, 17.5, 22, 27.5
}

export const SPACING_GRID = {
  base: 4, // px
  sequence: [4, 8, 12, 16, 24, 32, 48, 64, 96] as const,
}

export const BORDER_RADIUS = {
  xs: 3,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
} as const

export const SHADOWS = {
  surface: "0 1px 2px hsla(40, 10%, 20%, 0.04)",
  raised: "0 2px 8px hsla(40, 10%, 20%, 0.06)",
  overlay: "0 8px 24px hsla(40, 10%, 20%, 0.1)",
  modal: "0 16px 48px hsla(40, 10%, 20%, 0.16)",
} as const

export const DURATION = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
} as const

export const EASING = "cubic-bezier(0.4, 0, 0.2, 1)"

export const NEUTRAL_COLORS = {
  hueRange: [30, 50] as [number, number],
  saturationRange: [3, 8] as [number, number],
} as const

export const LARGE_CONTAINER_THRESHOLD = {
  width: 320,
  height: 240,
} as const
