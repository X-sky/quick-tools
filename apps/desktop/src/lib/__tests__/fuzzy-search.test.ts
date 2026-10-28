import { describe, it, expect } from "vitest"

import { fuzzyMatch, fuzzySearch } from "../fuzzy-search"

describe("fuzzyMatch", () => {
  it("should return true for empty query", () => {
    expect(fuzzyMatch("", "anything")).toBe(true)
  })

  it("should return true when query matches target exactly", () => {
    expect(fuzzyMatch("hello", "hello")).toBe(true)
  })

  it("should return true for case-insensitive match", () => {
    expect(fuzzyMatch("ABC", "abcdef")).toBe(true)
    expect(fuzzyMatch("abc", "ABCDEF")).toBe(true)
  })

  it("should return true when query chars appear in order in target", () => {
    expect(fuzzyMatch("fmt", "format")).toBe(true)
    expect(fuzzyMatch("jf", "JSON Formatter")).toBe(true)
    expect(fuzzyMatch("qr", "QR Code Generator")).toBe(true)
  })

  it("should return false when query chars do not appear in order", () => {
    expect(fuzzyMatch("zx", "hello")).toBe(false)
    expect(fuzzyMatch("ba", "abc")).toBe(false)
  })

  it("should return false when query is longer than target", () => {
    expect(fuzzyMatch("abcdef", "abc")).toBe(false)
  })

  it("should handle single character queries", () => {
    expect(fuzzyMatch("f", "format")).toBe(true)
    expect(fuzzyMatch("z", "format")).toBe(false)
  })

  it("should handle query equal to target length", () => {
    expect(fuzzyMatch("abc", "abc")).toBe(true)
    expect(fuzzyMatch("abc", "xyz")).toBe(false)
  })

  it("should match non-contiguous characters", () => {
    expect(fuzzyMatch("fj", "format json")).toBe(true)
    expect(fuzzyMatch("ct", "context")).toBe(true)
  })
})

describe("fuzzySearch", () => {
  const items = [
    { id: "1", name: "Format JSON" },
    { id: "2", name: "Minify JSON" },
    { id: "3", name: "Generate QR Code" },
    { id: "4", name: "Export HTML" },
    { id: "5", name: "Toggle Dark Mode" },
  ]

  const getLabel = (item: { name: string }) => item.name

  it("should return all items for empty query", () => {
    const result = fuzzySearch("", items, getLabel)
    expect(result).toEqual(items)
  })

  it("should filter items by fuzzy match", () => {
    const result = fuzzySearch("json", items, getLabel)
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.name)).toEqual(["Format JSON", "Minify JSON"])
  })

  it("should be case-insensitive", () => {
    const result = fuzzySearch("QR", items, getLabel)
    expect(result).toHaveLength(1)
    expect(result.map((r) => r.name)).toEqual(["Generate QR Code"])
  })

  it("should return empty array when nothing matches", () => {
    const result = fuzzySearch("xyz", items, getLabel)
    expect(result).toHaveLength(0)
  })

  it("should preserve original order of matching items", () => {
    const result = fuzzySearch("o", items, getLabel)
    // "Format JSON", "Minify JSON", "Generate QR Code", "Export HTML", "Toggle Dark Mode"
    // All contain 'o' except none — let's check
    const names = result.map((r) => r.name)
    // "Format JSON" has 'o', "Minify JSON" has 'o', "Generate QR Code" has 'o',
    // "Export HTML" has 'o' (Exp'o'rt), "Toggle Dark Mode" has 'o'
    expect(names).toEqual([
      "Format JSON",
      "Minify JSON",
      "Generate QR Code",
      "Export HTML",
      "Toggle Dark Mode",
    ])
  })

  it("should match non-contiguous characters across items", () => {
    const result = fuzzySearch("tdm", items, getLabel)
    // "Toggle Dark Mode" — t...d...m
    expect(result).toHaveLength(1)
    expect(result.map((r) => r.name)).toEqual(["Toggle Dark Mode"])
  })
})
