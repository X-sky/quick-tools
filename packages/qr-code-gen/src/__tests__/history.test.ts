import { describe, it, expect } from "vitest"
import * as fc from "fast-check"

import { mergeHistory } from "../history"
import type { HistoryItem } from "../types"

/**
 * Feature: monorepo-refactor, Property 3: History merge preserves uniqueness and ordering
 * Validates: Requirements 2.2
 */

function arbitraryHistoryItem(): fc.Arbitrary<HistoryItem> {
  return fc.record({
    content: fc.string({ minLength: 1 }),
    timestamp: fc.integer({ min: 1 }),
    tags: fc.option(fc.array(fc.string(), { maxLength: 5 }), {
      nil: undefined
    })
  }) as fc.Arbitrary<HistoryItem>
}

describe("Feature: monorepo-refactor, Property 3: History merge preserves uniqueness and ordering", () => {
  it("merged result has unique content values, descending timestamp order, and length <= 50", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryHistoryItem(), { maxLength: 30 }),
        fc.array(arbitraryHistoryItem(), { maxLength: 30 }),
        (existing, imported) => {
          const result = mergeHistory(existing, imported)

          // (a) no two items share the same content
          const contents = result.map((item) => item.content)
          const uniqueContents = new Set(contents)
          expect(uniqueContents.size).toBe(contents.length)

          // (b) items sorted by timestamp descending
          for (let i = 1; i < result.length; i++) {
            const prev = result[i - 1]!
            const curr = result[i]!
            expect(prev.timestamp).toBeGreaterThanOrEqual(curr.timestamp)
          }

          // (c) result length <= 50
          expect(result.length).toBeLessThanOrEqual(50)
        }
      ),
      { numRuns: 20 }
    )
  })
})
