import { describe, it, expect } from "vitest"
import * as fc from "fast-check"

import { calculateQrCapacity } from "../qr-capacity"

/**
 * Property 3: 二维码容量计算与验证
 *
 * For any 字符串 content 和纠错等级 level，calculateQrCapacity(content, level)
 * 返回的 percentage 应等于 charCount / maxCapacity * 100（浮点误差 ≤ 0.01），
 * 且 isOverCapacity 应等于 percentage > 100。
 * 此外，对于任意两个字符串 s1 和 s2，若 s1 的字节长度 < s2 的字节长度，
 * 则 calculateQrCapacity(s1, level).percentage <= calculateQrCapacity(s2, level).percentage（单调性）。
 *
 * Validates: Requirements 6.4, 6.5
 */

const levelArb = fc.constantFrom("L" as const, "M" as const, "Q" as const, "H" as const)

const QR_MAX_BYTES: Record<"L" | "M" | "Q" | "H", number> = {
  L: 2953,
  M: 2331,
  Q: 1663,
  H: 1273
}

describe("Feature: desktop-features-optimization, Property 3: 二维码容量计算与验证", () => {
  it("percentage 计算正确性：percentage === charCount / maxCapacity * 100（误差 ≤ 0.01）", () => {
    fc.assert(
      fc.property(fc.string(), levelArb, (content, level) => {
        const result = calculateQrCapacity(content, level)
        const expectedPercentage =
          (result.charCount / QR_MAX_BYTES[level]) * 100

        expect(Math.abs(result.percentage - expectedPercentage)).toBeLessThanOrEqual(0.01)
      }),
      { numRuns: 100 }
    )
  })

  it("isOverCapacity 一致性：isOverCapacity === (percentage > 100)", () => {
    fc.assert(
      fc.property(fc.string(), levelArb, (content, level) => {
        const result = calculateQrCapacity(content, level)

        expect(result.isOverCapacity).toBe(result.percentage > 100)
      }),
      { numRuns: 100 }
    )
  })

  it("单调性：字节长度更短的字符串 percentage 不大于字节长度更长的字符串", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), levelArb, (s1, s2, level) => {
        const bytes1 = new TextEncoder().encode(s1).length
        const bytes2 = new TextEncoder().encode(s2).length

        fc.pre(bytes1 < bytes2)

        const result1 = calculateQrCapacity(s1, level)
        const result2 = calculateQrCapacity(s2, level)

        expect(result1.percentage).toBeLessThanOrEqual(result2.percentage)
      }),
      { numRuns: 100 }
    )
  })
})
