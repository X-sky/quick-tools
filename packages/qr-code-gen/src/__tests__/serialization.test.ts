import { describe, it, expect } from "vitest"
import * as fc from "fast-check"

import { exportHistoryData, parseHistoryImport } from "../history"
import type { HistoryItem } from "../types"

/**
 * Feature: monorepo-refactor, Property 4: History serialization round-trip
 * Validates: Requirements 2.2, 2.6
 */

function arbitraryHistoryItem(): fc.Arbitrary<HistoryItem> {
  return fc.record({
    content: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
    timestamp: fc.integer({ min: 1 }),
    tags: fc.oneof(
      fc.constant(undefined),
      fc.array(fc.string(), { minLength: 0, maxLength: 5 })
    )
  }) as fc.Arbitrary<HistoryItem>
}

describe("Feature: monorepo-refactor, Property 4: History serialization round-trip", () => {
  it("parseHistoryImport(exportHistoryData(items)) produces items with identical content, timestamp, and tags", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryHistoryItem(), { minLength: 1, maxLength: 10 }),
        (items) => {
          const serialized = exportHistoryData(items)
          const result = parseHistoryImport(serialized)

          expect(result.error).toBeUndefined()
          expect(result.items).toHaveLength(items.length)

          for (let i = 0; i < items.length; i++) {
            const original = items[i]!
            const parsed = result.items[i]!

            expect(parsed.content).toBe(original.content)
            expect(parsed.timestamp).toBe(original.timestamp)

            if (original.tags && original.tags.length > 0) {
              expect(parsed.tags).toEqual(original.tags)
            } else {
              expect(parsed.tags).toBeUndefined()
            }
          }
        }
      ),
      { numRuns: 20 }
    )
  })
})
