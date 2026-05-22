import { describe, it, expect } from "vitest"

import { calculateQrCapacity, validateQrContent } from "../qr-capacity"

describe("calculateQrCapacity", () => {
  it("should return correct charCount as byte length", () => {
    const result = calculateQrCapacity("hello", "L")
    expect(result.charCount).toBe(5)
    expect(result.maxCapacity).toBe(2953)
  })

  it("should count multi-byte characters by byte length", () => {
    const result = calculateQrCapacity("你好", "L")
    // Each Chinese character is 3 bytes in UTF-8
    expect(result.charCount).toBe(6)
  })

  it("should calculate percentage correctly", () => {
    const result = calculateQrCapacity("a".repeat(100), "L")
    expect(result.percentage).toBeCloseTo((100 / 2953) * 100, 2)
  })

  it("should set isOverCapacity to true when percentage > 100", () => {
    const overResult = calculateQrCapacity("a".repeat(2954), "L")
    expect(overResult.isOverCapacity).toBe(true)

    const exactResult = calculateQrCapacity("a".repeat(2953), "L")
    expect(exactResult.isOverCapacity).toBe(false)
  })

  it("should use correct max capacity for each level", () => {
    const content = "test"
    expect(calculateQrCapacity(content, "L").maxCapacity).toBe(2953)
    expect(calculateQrCapacity(content, "M").maxCapacity).toBe(2331)
    expect(calculateQrCapacity(content, "Q").maxCapacity).toBe(1663)
    expect(calculateQrCapacity(content, "H").maxCapacity).toBe(1273)
  })

  it("should handle empty string", () => {
    const result = calculateQrCapacity("", "L")
    expect(result.charCount).toBe(0)
    expect(result.percentage).toBe(0)
    expect(result.isOverCapacity).toBe(false)
  })

  it("should handle content at exact boundary", () => {
    const result = calculateQrCapacity("a".repeat(2953), "L")
    expect(result.percentage).toBeCloseTo(100, 2)
    expect(result.isOverCapacity).toBe(false)
  })
})

describe("validateQrContent", () => {
  it("should return valid for content within capacity", () => {
    const result = validateQrContent("hello world", "L")
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it("should return invalid with error for content exceeding capacity", () => {
    const result = validateQrContent("a".repeat(2954), "L")
    expect(result.valid).toBe(false)
    expect(result.error).toContain("内容过长")
    expect(result.error).toContain("2954")
    expect(result.error).toContain("2953")
  })

  it("should respect different error correction levels", () => {
    const content = "a".repeat(1664)
    expect(validateQrContent(content, "L").valid).toBe(true)
    expect(validateQrContent(content, "M").valid).toBe(true)
    expect(validateQrContent(content, "Q").valid).toBe(false)
    expect(validateQrContent(content, "H").valid).toBe(false)
  })

  it("should handle empty string as valid", () => {
    const result = validateQrContent("", "H")
    expect(result.valid).toBe(true)
  })
})
