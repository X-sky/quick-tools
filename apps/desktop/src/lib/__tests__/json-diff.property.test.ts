import { describe, it, expect } from "vitest"
import * as fc from "fast-check"

import { computeLineDiff } from "../json-diff"

/**
 * Property 2: JSON Diff 正确性
 *
 * For any 两段 JSON 字符串 A 和 B，如果 A === B，则 diff 结果应为空（无差异）；
 * 如果 A !== B，则 diff 结果应包含至少一个变更条目。
 *
 * Validates: Requirements 3.2
 */

describe("Feature: desktop-features-optimization, Property 2: JSON Diff 正确性", () => {
  it("A === B 时 diff 为空", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const result = computeLineDiff(text, text)
        expect(result).toHaveLength(0)
      }),
      { numRuns: 100 }
    )
  })

  it("A !== B 时 diff 包含至少一个变更", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        fc.pre(a !== b)

        const result = computeLineDiff(a, b)
        expect(result.length).toBeGreaterThanOrEqual(1)
      }),
      { numRuns: 100 }
    )
  })
})
