import { describe, it, expect } from "vitest"
import * as fc from "fast-check"

import { parseJsonOrJsObject } from "../parse"
import { formatJson } from "../format"

/**
 * Feature: monorepo-refactor, Property 1: JSON parse round-trip
 * Validates: Requirements 2.1, 2.6
 */
describe("Feature: monorepo-refactor, Property 1: JSON parse round-trip", () => {
  it("for any valid JSON value, parseJsonOrJsObject(formatJson(value)) deeply equals the original value", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        const formatted = formatJson(value)
        const parsed = parseJsonOrJsObject(formatted)
        expect(parsed).toStrictEqual(value)
      }),
      { numRuns: 20 }
    )
  })
})
