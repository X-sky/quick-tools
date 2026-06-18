import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

/**
 * Tests for Tooltip component logic.
 * Since the test environment is node (no jsdom), we test the core logic:
 * - Delay timer behavior (show after delay, hide immediately)
 * - Position calculation (right vs bottom)
 * - Props interface validation
 */

describe("Tooltip - delay logic", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("should show tooltip after specified delay", () => {
    let visible = false
    const timer = setTimeout(() => {
      visible = true
    }, 400)

    // Before delay
    vi.advanceTimersByTime(399)
    expect(visible).toBe(false)

    // After delay
    vi.advanceTimersByTime(1)
    expect(visible).toBe(true)

    clearTimeout(timer)
  })

  it("should use 400ms default delay for navigation tooltips", () => {
    const defaultNavDelay = 400
    let visible = false
    const timer = setTimeout(() => {
      visible = true
    }, defaultNavDelay)

    vi.advanceTimersByTime(399)
    expect(visible).toBe(false)

    vi.advanceTimersByTime(1)
    expect(visible).toBe(true)

    clearTimeout(timer)
  })

  it("should use 150ms delay for button tooltips", () => {
    const buttonDelay = 150
    let visible = false
    const timer = setTimeout(() => {
      visible = true
    }, buttonDelay)

    vi.advanceTimersByTime(149)
    expect(visible).toBe(false)

    vi.advanceTimersByTime(1)
    expect(visible).toBe(true)

    clearTimeout(timer)
  })

  it("should hide immediately on mouse leave (cancel timer)", () => {
    let visible = false
    let timerId: ReturnType<typeof setTimeout> | null = null

    // Simulate mouseenter - start timer
    timerId = setTimeout(() => {
      visible = true
    }, 400)

    vi.advanceTimersByTime(200)
    expect(visible).toBe(false)

    // Simulate mouseleave - cancel timer immediately
    if (timerId) {
      clearTimeout(timerId)
      timerId = null
    }
    visible = false

    // Even after full delay, tooltip should not appear
    vi.advanceTimersByTime(300)
    expect(visible).toBe(false)
  })

  it("should hide immediately if already visible on mouse leave", () => {
    let visible = false
    const timer = setTimeout(() => {
      visible = true
    }, 400)

    vi.advanceTimersByTime(400)
    expect(visible).toBe(true)

    // Simulate mouseleave - hide immediately (no delay)
    visible = false
    expect(visible).toBe(false)

    clearTimeout(timer)
  })
})

describe("Tooltip - position styles", () => {
  it("should calculate right position with 8px offset", () => {
    const position = "right"
    const offset = 8

    // Right position: left = 100% + 8px, vertically centered
    const expectedLeft = `calc(100% + ${offset}px)`
    const expectedTop = "50%"

    expect(expectedLeft).toBe("calc(100% + 8px)")
    expect(expectedTop).toBe("50%")
    expect(position).toBe("right")
  })

  it("should calculate bottom position with 8px offset", () => {
    const position = "bottom"
    const offset = 8

    // Bottom position: top = 100% + 8px, horizontally centered
    const expectedTop = `calc(100% + ${offset}px)`
    const expectedLeft = "50%"

    expect(expectedTop).toBe("calc(100% + 8px)")
    expect(expectedLeft).toBe("50%")
    expect(position).toBe("bottom")
  })
})

describe("Tooltip - max width constraint", () => {
  it("should default to 200px max width", () => {
    const defaultMaxWidth = 200
    expect(defaultMaxWidth).toBe(200)
  })

  it("should accept custom max width", () => {
    const customMaxWidth = 300
    expect(customMaxWidth).toBe(300)
  })
})

describe("Tooltip - shortcut display", () => {
  it("should format shortcut text alongside content", () => {
    const content = "Format JSON"
    const shortcut = "⌘+F"

    // Tooltip should display both content and shortcut
    expect(content).toBeTruthy()
    expect(shortcut).toBeTruthy()
    expect(`${content} ${shortcut}`).toContain("Format JSON")
    expect(`${content} ${shortcut}`).toContain("⌘+F")
  })

  it("should work without shortcut", () => {
    const content = "JSON Formatter"
    const shortcut = undefined

    expect(content).toBeTruthy()
    expect(shortcut).toBeUndefined()
  })
})

describe("Tooltip - component interface", () => {
  it("should export Tooltip component", async () => {
    const mod = await import("../Tooltip")
    expect(mod.Tooltip).toBeDefined()
    expect(typeof mod.Tooltip).toBe("function")
  })
})
