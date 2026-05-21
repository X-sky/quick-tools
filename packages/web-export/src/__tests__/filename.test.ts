import { describe, it, expect } from "vitest"
import * as fc from "fast-check"

import { sanitizeFileName } from "../filename"

/**
 * Feature: monorepo-refactor, Property 2: Filename sanitization removes all forbidden characters
 * Validates: Requirements 2.3
 */

const FORBIDDEN_CHARS = /[<>:"/\\|?*\u0000-\u001f]/

describe("Feature: monorepo-refactor, Property 2: Filename sanitization removes all forbidden characters", () => {
  it("result contains no forbidden characters for any input string", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeFileName(input)
        expect(result).not.toMatch(FORBIDDEN_CHARS)
      }),
      { numRuns: 20 }
    )
  })

  it("result length is at most 120 for any input string", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeFileName(input)
        expect(result.length).toBeLessThanOrEqual(120)
      }),
      { numRuns: 20 }
    )
  })

  it("result contains no consecutive whitespace for any input string", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeFileName(input)
        expect(result).not.toMatch(/\s{2,}/)
      }),
      { numRuns: 20 }
    )
  })

  it("handles unicode, control chars, and special chars", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 300 }),
        (input) => {
          const result = sanitizeFileName(input)
          expect(result).not.toMatch(FORBIDDEN_CHARS)
          expect(result.length).toBeLessThanOrEqual(120)
          expect(result).not.toMatch(/\s{2,}/)
        }
      ),
      { numRuns: 20 }
    )
  })
})
