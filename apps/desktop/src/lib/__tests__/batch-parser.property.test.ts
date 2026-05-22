import { describe, it, expect } from "vitest"
import * as fc from "fast-check"

import { parseBatchContent } from "../batch-parser"
import { validateQrContent } from "../qr-capacity"

/**
 * Property 4: 批量内容解析与验证
 *
 * For any 多行文本字符串和纠错等级，parseBatchContent(text, level) 返回的结果应满足：
 * (a) 结果数量等于输入中非空行（trim 后非空）的数量
 * (b) 每个结果的 content 等于对应行 trim 后的值
 * (c) valid 为 true 当且仅当该行内容未超过对应纠错等级的容量限制
 * (d) 结果顺序与输入行顺序一致
 *
 * Validates: Requirements 8.2, 8.5
 */

const levelArb = fc.constantFrom("L" as const, "M" as const, "Q" as const, "H" as const)

const multilineTextArb = fc.array(
  fc.oneof(
    { weight: 3, arbitrary: fc.string({ minLength: 1, maxLength: 200 }) },
    { weight: 1, arbitrary: fc.constant("") },
    { weight: 1, arbitrary: fc.constant("   ") }
  ),
  { minLength: 1, maxLength: 30 }
).map((lines) => lines.join("\n"))

describe("Feature: desktop-features-optimization, Property 4: 批量内容解析与验证", () => {
  it("结果数量等于输入中非空行（trim 后非空）的数量", () => {
    fc.assert(
      fc.property(multilineTextArb, levelArb, (text, level) => {
        const results = parseBatchContent(text, level)
        const nonEmptyLines = text
          .split("\n")
          .filter((line) => line.trim() !== "")

        expect(results.length).toBe(nonEmptyLines.length)
      }),
      { numRuns: 100 }
    )
  })

  it("每个结果的 content 等于对应行 trim 后的值", () => {
    fc.assert(
      fc.property(multilineTextArb, levelArb, (text, level) => {
        const results = parseBatchContent(text, level)
        const nonEmptyLines = text
          .split("\n")
          .filter((line) => line.trim() !== "")
          .map((line) => line.trim())

        for (let i = 0; i < results.length; i++) {
          expect(results[i]!.content).toBe(nonEmptyLines[i])
        }
      }),
      { numRuns: 100 }
    )
  })

  it("valid 与容量限制一致", () => {
    fc.assert(
      fc.property(multilineTextArb, levelArb, (text, level) => {
        const results = parseBatchContent(text, level)

        for (const result of results) {
          const validation = validateQrContent(result.content, level)
          expect(result.valid).toBe(validation.valid)
        }
      }),
      { numRuns: 100 }
    )
  })

  it("结果顺序与输入行顺序一致", () => {
    fc.assert(
      fc.property(multilineTextArb, levelArb, (text, level) => {
        const results = parseBatchContent(text, level)
        const lines = text.split("\n")

        // Collect expected line numbers (1-indexed) for non-empty lines
        const expectedLineNumbers: number[] = []
        for (let i = 0; i < lines.length; i++) {
          if (lines[i]!.trim() !== "") {
            expectedLineNumbers.push(i + 1)
          }
        }

        // Verify line numbers are strictly increasing and match expected
        for (let i = 0; i < results.length; i++) {
          expect(results[i]!.line).toBe(expectedLineNumbers[i])
        }

        // Verify ordering is strictly increasing
        for (let i = 1; i < results.length; i++) {
          expect(results[i]!.line).toBeGreaterThan(results[i - 1]!.line)
        }
      }),
      { numRuns: 100 }
    )
  })
})
