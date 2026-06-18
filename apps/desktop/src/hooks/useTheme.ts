import { useCallback, useEffect, useRef, useState } from "react"

export type ThemeMode = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

interface UseThemeReturn {
  /** User-selected theme mode */
  theme: ThemeMode
  /** Actual applied theme (resolves "system" to light/dark) */
  resolvedTheme: ResolvedTheme
  /** Update the theme mode */
  setTheme: (mode: ThemeMode) => void
}

const STORE_KEY = "theme-preference"
const DARK_CLASS = "dark"
const MEDIA_QUERY = "(prefers-color-scheme: dark)"

/**
 * Resolves the effective theme based on mode and system preference.
 */
function resolveTheme(mode: ThemeMode, systemIsDark: boolean): ResolvedTheme {
  if (mode === "system") {
    return systemIsDark ? "dark" : "light"
  }
  return mode
}

/**
 * Applies or removes the `.dark` class on `<html>`.
 */
function applyThemeClass(resolved: ResolvedTheme): void {
  const root = document.documentElement
  if (resolved === "dark") {
    root.classList.add(DARK_CLASS)
  } else {
    root.classList.remove(DARK_CLASS)
  }
}

/**
 * Lazily loads and caches the Tauri store instance.
 * Falls back to localStorage if @tauri-apps/plugin-store is unavailable.
 */
const STORE_OPTIONS = {
  defaults: { [STORE_KEY]: "system" as ThemeMode },
  autoSave: true,
}

async function loadPreference(): Promise<ThemeMode> {
  try {
    const { load } = await import("@tauri-apps/plugin-store")
    const store = await load("settings.json", STORE_OPTIONS)
    const value = await store.get<ThemeMode>(STORE_KEY)
    if (value === "light" || value === "dark" || value === "system") {
      return value
    }
  } catch {
    // Fallback to localStorage (e.g. in browser dev mode)
    const value = localStorage.getItem(STORE_KEY)
    if (value === "light" || value === "dark" || value === "system") {
      return value
    }
  }
  return "system"
}

async function savePreference(mode: ThemeMode): Promise<void> {
  try {
    const { load } = await import("@tauri-apps/plugin-store")
    const store = await load("settings.json", STORE_OPTIONS)
    await store.set(STORE_KEY, mode)
  } catch {
    // Fallback to localStorage
    localStorage.setItem(STORE_KEY, mode)
  }
}

/**
 * Hook for managing dark mode with system preference detection.
 *
 * - On mount, reads persisted preference (defaults to "system")
 * - If "system", detects OS preference via matchMedia
 * - Applies/removes `.dark` class on document.documentElement
 * - Listens for system preference changes when in "system" mode
 * - Persists user preference via @tauri-apps/plugin-store (localStorage fallback)
 */
export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<ThemeMode>("system")
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia(MEDIA_QUERY).matches
  })
  const initializedRef = useRef(false)

  const resolvedTheme = resolveTheme(theme, systemIsDark)

  // Apply .dark class whenever resolvedTheme changes
  useEffect(() => {
    applyThemeClass(resolvedTheme)
  }, [resolvedTheme])

  // Load persisted preference on mount
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    loadPreference().then((saved) => {
      setThemeState(saved)
    })
  }, [])

  // Listen for system color scheme changes
  useEffect(() => {
    const mql = window.matchMedia(MEDIA_QUERY)

    const handler = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches)
    }

    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode)
    savePreference(mode)
  }, [])

  return { theme, resolvedTheme, setTheme }
}
