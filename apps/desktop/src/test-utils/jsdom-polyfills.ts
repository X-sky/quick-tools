/**
 * JSDOM polyfills. Import this file BEFORE any React/Phosphor/motion
 * imports in any test that uses `// @vitest-environment jsdom`.
 *
 * ES module imports are hoisted, so top-level polyfill code in the test
 * file runs AFTER the React component imports — too late. Importing
 * this side-effect file as the first import guarantees the polyfill lands
 * before the first React component evaluates and calls hooks like
 * `useReducedMotion`.
 */
if (typeof window !== "undefined") {
  const w = window as unknown as Record<string, unknown>

  if (typeof w.matchMedia !== "function") {
    w.matchMedia = (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false
    })
  }

  // scrollIntoView — JSDOM 29 doesn't ship it on Element.prototype
  if (typeof Element !== "undefined") {
    const proto = (Element as unknown as { prototype: Record<string, unknown> })
      .prototype
    if (typeof proto.scrollIntoView !== "function") {
      proto.scrollIntoView = function scrollIntoView() {
        /* no-op in JSDOM */
      }
    }
  }

  const g = globalThis as unknown as {
    ResizeObserver?: unknown
    IntersectionObserver?: unknown
  }
  if (typeof g.ResizeObserver === "undefined") {
    g.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
  if (typeof g.IntersectionObserver === "undefined") {
    g.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
      root = null
      rootMargin = ""
      thresholds = []
    }
  }
}
export {}
