import { useEffect, useState } from "react"

const MEDIA_QUERY = "(prefers-reduced-motion: reduce)"

/**
 * Defensive wrapper for `window.matchMedia`. The production code path is
 * straightforward, but we harden it because JSDOM 29 exposes no real
 * `matchMedia`, and some hosts (older test runners, SSR-like sandboxes)
 * can return `undefined` even when `matchMedia` is defined.
 */
function safeMatchMedia(query: string): { matches: boolean } {
  const noMedia: { matches: boolean } = { matches: false }
  if (typeof window === "undefined") return noMedia
  const w = window as unknown as {
    matchMedia?: unknown
  }
  if (typeof w.matchMedia !== "function") return noMedia
  try {
    const result = (w.matchMedia as (q: string) => unknown).call(window, query)
    if (result && typeof result === "object" && "matches" in (result as object)) {
      const m = (result as { matches: unknown }).matches
      if (typeof m === "boolean") return { matches: m }
    }
  } catch {
    // fall through
  }
  return noMedia
}

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    return safeMatchMedia(MEDIA_QUERY).matches === true
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    const w = window as unknown as { matchMedia?: unknown }
    if (typeof w.matchMedia !== "function") return
    let mql: MediaQueryList | null = null
    try {
      mql = (w.matchMedia as (q: string) => MediaQueryList).call(window, MEDIA_QUERY)
    } catch {
      return
    }
    if (!mql) return
    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches === true)
    }
    try {
      mql.addEventListener("change", handleChange)
    } catch {
      return
    }
    return () => {
      try {
        mql?.removeEventListener("change", handleChange)
      } catch {
        // ignore
      }
    }
  }, [])

  return reducedMotion
}
