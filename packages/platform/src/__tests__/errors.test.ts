import { describe, it, expect } from "vitest"
import * as fc from "fast-check"

import {
  ERROR_CATEGORIES,
  createErrorResult,
  createSuccess
} from "../errors"
import type { PlatformErrorCategory } from "../types"

/**
 * Feature: monorepo-refactor, Property 7: Platform error results are well-typed
 * Validates: Requirements 6.6
 */
describe("Feature: monorepo-refactor, Property 7: Platform error results are well-typed", () => {
  const categoryArb = fc.constantFrom(...ERROR_CATEGORIES)
  const nonEmptyMessageArb = fc.string({ minLength: 1 })

  it("createErrorResult produces { ok: false, error: { category, message } } with valid category and non-empty message", () => {
    fc.assert(
      fc.property(
        categoryArb,
        nonEmptyMessageArb,
        (category: PlatformErrorCategory, message: string) => {
          const result = createErrorResult(category, message)

          expect(result.ok).toBe(false)

          if (!result.ok) {
            expect(ERROR_CATEGORIES).toContain(result.error.category)
            expect(result.error.category).toBe(category)
            expect(result.error.message).toBe(message)
            expect(result.error.message.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it("createSuccess produces { ok: true, value }", () => {
    fc.assert(
      fc.property(
        fc.anything(),
        (value: unknown) => {
          const result = createSuccess(value)

          expect(result.ok).toBe(true)

          if (result.ok) {
            expect(result.value).toBe(value)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it("ERROR_CATEGORIES contains all valid PlatformErrorCategory values", () => {
    const expectedCategories: PlatformErrorCategory[] = [
      "network",
      "permission",
      "not-found",
      "timeout",
      "cancelled",
      "unknown"
    ]

    expect(ERROR_CATEGORIES).toHaveLength(expectedCategories.length)

    for (const category of expectedCategories) {
      expect(ERROR_CATEGORIES).toContain(category)
    }
  })

  it("error category from createErrorResult is always a valid PlatformErrorCategory", () => {
    fc.assert(
      fc.property(
        categoryArb,
        nonEmptyMessageArb,
        (category: PlatformErrorCategory, message: string) => {
          const result = createErrorResult(category, message)

          if (!result.ok) {
            const validCategories: readonly string[] = ERROR_CATEGORIES
            expect(validCategories).toContain(result.error.category)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
