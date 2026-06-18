import { useCallback, useEffect, useRef, useState } from "react"

export interface WindowState {
  width: number
  height: number
  x: number
  y: number
}

export interface UseWindowStateReturn {
  windowState: WindowState | null
  isRestored: boolean
  saveWindowState: () => Promise<void>
  restoreWindowState: () => Promise<void>
}

const STORE_KEY = "window-state"
const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 800
const MIN_WIDTH = 900
const MIN_HEIGHT = 640

/**
 * Lazily loads the Tauri store for window state persistence.
 */
async function getStore() {
  const { load } = await import("@tauri-apps/plugin-store")
  return load("settings.json", { autoSave: true, defaults: {} })
}

/**
 * Reads the available-screen origin from the current display.
 * `availLeft` / `availTop` are non-standard WebKit/Electron extensions
 * (multi-monitor). When unavailable (e.g. headless browser or test env),
 * falls back to 0.
 */
function getScreenOrigin(): { left: number; top: number } {
  const screen = window.screen as Screen & {
    availLeft?: number
    availTop?: number
  }
  return {
    left: typeof screen.availLeft === "number" ? screen.availLeft : 0,
    top: typeof screen.availTop === "number" ? screen.availTop : 0
  }
}

/**
 * Gets the current window instance from Tauri.
 */
async function getWindow() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window")
  return getCurrentWindow()
}

/**
 * Reads the persisted window state from the store.
 */
async function loadWindowState(): Promise<WindowState | null> {
  try {
    const store = await getStore()
    const state = await store.get<WindowState>(STORE_KEY)
    if (
      state &&
      typeof state.width === "number" &&
      typeof state.height === "number" &&
      typeof state.x === "number" &&
      typeof state.y === "number"
    ) {
      return state
    }
  } catch {
    // Store unavailable (e.g. browser dev mode)
  }
  return null
}

/**
 * Persists window state to the store.
 */
async function persistWindowState(state: WindowState): Promise<void> {
  try {
    const store = await getStore()
    await store.set(STORE_KEY, state)
  } catch {
    // Store unavailable
  }
}

/**
 * Checks if a window position is within the available screen bounds.
 * A position is considered "on-screen" if at least part of the window
 * title bar (top 50px) is visible on any available screen.
 */
function isPositionOnScreen(
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  const screenWidth = window.screen.availWidth
  const screenHeight = window.screen.availHeight
  const { left: screenLeft, top: screenTop } = getScreenOrigin()

  // Check if at least part of the window is visible
  const windowRight = x + width
  const windowBottom = y + height

  const isHorizontallyVisible =
    windowRight > screenLeft && x < screenLeft + screenWidth
  const isVerticallyVisible =
    windowBottom > screenTop && y < screenTop + screenHeight

  return isHorizontallyVisible && isVerticallyVisible
}

/**
 * Calculates a centered position on the primary display.
 */
function getCenteredPosition(width: number, height: number) {
  const screenWidth = window.screen.availWidth
  const screenHeight = window.screen.availHeight
  const { left: screenLeft, top: screenTop } = getScreenOrigin()

  return {
    x: screenLeft + Math.round((screenWidth - width) / 2),
    y: screenTop + Math.round((screenHeight - height) / 2),
  }
}

/**
 * Clamps a size to fit within the screen, respecting minimum constraints.
 */
function clampSize(
  width: number,
  height: number
): { width: number; height: number } {
  const screenWidth = window.screen.availWidth
  const screenHeight = window.screen.availHeight

  let w = Math.max(width, MIN_WIDTH)
  let h = Math.max(height, MIN_HEIGHT)

  // If saved size exceeds screen, use default
  if (w > screenWidth || h > screenHeight) {
    w = DEFAULT_WIDTH
    h = DEFAULT_HEIGHT
  }

  // Final clamp to screen
  w = Math.min(w, screenWidth)
  h = Math.min(h, screenHeight)

  return { width: w, height: h }
}

/**
 * Hook for persisting and restoring window position and size.
 *
 * - On startup: reads saved state, validates position is on-screen,
 *   centers on primary display if off-screen.
 * - On close: saves current window position and size.
 * - Minimum window size (900×640) is enforced via Tauri config.
 * - Default size: 1200×800.
 */
export function useWindowState(): UseWindowStateReturn {
  const [windowState, setWindowState] = useState<WindowState | null>(null)
  const [isRestored, setIsRestored] = useState(false)
  const initializedRef = useRef(false)

  const saveWindowState = useCallback(async () => {
    try {
      const win = await getWindow()
      const position = await win.outerPosition()
      const size = await win.outerSize()

      const state: WindowState = {
        width: size.width,
        height: size.height,
        x: position.x,
        y: position.y,
      }

      setWindowState(state)
      await persistWindowState(state)
    } catch {
      // Window API unavailable
    }
  }, [])

  const restoreWindowState = useCallback(async () => {
    const saved = await loadWindowState()

    if (!saved) {
      // No saved state — use defaults (Tauri config handles initial size)
      setIsRestored(true)
      return
    }

    try {
      const win = await getWindow()

      // Clamp size to screen bounds
      const { width, height } = clampSize(saved.width, saved.height)

      // Check if saved position is on-screen
      if (isPositionOnScreen(saved.x, saved.y, width, height)) {
        // Restore saved position and size
        const { LogicalSize, LogicalPosition } = await import(
          "@tauri-apps/api/dpi"
        )
        await win.setSize(new LogicalSize(width, height))
        await win.setPosition(new LogicalPosition(saved.x, saved.y))

        setWindowState({ width, height, x: saved.x, y: saved.y })
      } else {
        // Position is off-screen — center on primary display with saved/default size
        const { LogicalSize, LogicalPosition } = await import(
          "@tauri-apps/api/dpi"
        )
        const centered = getCenteredPosition(width, height)

        await win.setSize(new LogicalSize(width, height))
        await win.setPosition(new LogicalPosition(centered.x, centered.y))

        setWindowState({ width, height, x: centered.x, y: centered.y })
      }
    } catch {
      // Window API unavailable (browser dev mode)
    }

    setIsRestored(true)
  }, [])

  // Restore window state on mount
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    restoreWindowState()
  }, [restoreWindowState])

  // Listen for window close event to save state
  useEffect(() => {
    let unlisten: (() => void) | undefined

    async function setupCloseListener() {
      try {
        const win = await getWindow()
        const unlistenFn = await win.onCloseRequested(async () => {
          await saveWindowState()
        })
        unlisten = unlistenFn
      } catch {
        // Window API unavailable
      }
    }

    setupCloseListener()

    return () => {
      unlisten?.()
    }
  }, [saveWindowState])

  return { windowState, isRestored, saveWindowState, restoreWindowState }
}
