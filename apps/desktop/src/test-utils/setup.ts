/**
 * Vitest setup for all tests.
 *
 * Runs in node env by default. For JSDOM tests, opt in per-file with
 * `// @vitest-environment jsdom` AND import `~/test-utils/jsdom-polyfills`
 * at the top of the file (before any React imports).
 */
import "@testing-library/jest-dom/vitest"
import { afterEach, vi } from "vitest"

// Only wire testing-library cleanup when a DOM is actually present.
// Calling cleanup() in a node env without jsdom throws.
if (typeof window !== "undefined" && typeof document !== "undefined") {
  void (async () => {
    const { cleanup } = await import("@testing-library/react")
    afterEach(() => {
      cleanup()
      vi.restoreAllMocks()
    })
  })()
} else {
  afterEach(() => {
    vi.restoreAllMocks()
  })
}
