import { describe, it, expect } from "vitest"
import * as fc from "fast-check"

import { parse, print } from "../parser"
import type { Segment } from "../types"

/**
 * Property 1: Parser and Pretty Printer Round-Trip (print → parse)
 *
 * For every well-formed segment list S (any sequence of literal fragments
 * and Placeholder_Tokens whose names match [A-Za-z0-9_-]+), parsing the
 * printed form SHALL reproduce S exactly.
 *
 * parse(print(S)).segments ≡ S
 *
 * Validates: Requirements 4.12, 4.4, 4.5
 */

const placeholderNameArb = fc.stringMatching(/^[A-Za-z0-9_-]+$/, {
  size: "small"
})

const literalSegmentArb: fc.Arbitrary<Segment> = fc
  .unicode()
  .filter((s) => s.length > 0)
  .map((value) => ({ type: "literal" as const, value }))

const placeholderSegmentArb: fc.Arbitrary<Segment> = placeholderNameArb.map(
  (value) => ({ type: "placeholder" as const, value })
)

/**
 * Generate a well-formed segment list where no two adjacent segments
 * are both literals (since the parser merges adjacent literals).
 */
const segmentListArb: fc.Arbitrary<Segment[]> = fc
  .array(
    fc.oneof(
      { weight: 1, arbitrary: literalSegmentArb },
      { weight: 1, arbitrary: placeholderSegmentArb }
    ),
    { minLength: 0, maxLength: 20 }
  )
  .map((segments) => {
    // Merge adjacent literal segments to match parser behavior
    const merged: Segment[] = []
    for (const seg of segments) {
      if (
        seg.type === "literal" &&
        merged.length > 0 &&
        merged[merged.length - 1].type === "literal"
      ) {
        merged[merged.length - 1] = {
          type: "literal",
          value: merged[merged.length - 1].value + seg.value
        }
      } else {
        merged.push({ ...seg })
      }
    }
    return merged
  })

describe("Feature: qr-template-generator, Property 1: Parser and Pretty Printer Round-Trip", () => {
  it("parse(print(S)).segments ≡ S for any well-formed segment list", () => {
    fc.assert(
      fc.property(segmentListArb, (segments) => {
        const printed = print(segments)
        const result = parse(printed)

        expect(result.errors).toEqual([])
        expect(result.segments).toEqual(segments)
      }),
      { numRuns: 100 }
    )
  })
})
