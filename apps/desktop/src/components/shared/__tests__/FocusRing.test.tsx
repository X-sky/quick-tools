import { describe, it, expect } from "vitest"
import { focusRingClass } from "../FocusRing"

describe("FocusRing", () => {
  describe("focusRingClass", () => {
    it("should include outline-none to reset default browser outline", () => {
      expect(focusRingClass).toContain("outline-none")
    })

    it("should apply 2px outline width on focus-visible", () => {
      expect(focusRingClass).toContain("focus-visible:outline-2")
    })

    it("should use brand-500 color for the outline", () => {
      expect(focusRingClass).toContain("focus-visible:outline-[var(--brand-500)]")
    })

    it("should apply 2px offset from element", () => {
      expect(focusRingClass).toContain("focus-visible:outline-offset-2")
    })

    it("should inherit border-radius from element", () => {
      expect(focusRingClass).toContain("focus-visible:rounded-[inherit]")
    })

    it("should only target :focus-visible (not :focus)", () => {
      // All focus styles should be prefixed with focus-visible:
      const focusParts = focusRingClass.split(" ").filter((cls) => cls.includes("focus"))
      focusParts.forEach((part) => {
        expect(part).toMatch(/^focus-visible:/)
      })
    })
  })

  describe("FocusRing component", () => {
    it("should export FocusRing as a function component", async () => {
      const { FocusRing } = await import("../FocusRing")
      expect(FocusRing).toBeDefined()
      expect(typeof FocusRing).toBe("function")
    })

    it("should export focusRingClass as a string", () => {
      expect(typeof focusRingClass).toBe("string")
      expect(focusRingClass.length).toBeGreaterThan(0)
    })
  })
})
