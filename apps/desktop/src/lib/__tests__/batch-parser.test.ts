import { describe, it, expect } from "vitest"

import { parseBatchContent, parseBatchUrls } from "../batch-parser"

describe("parseBatchContent", () => {
  it("should parse non-empty lines and skip empty lines", () => {
    const text = "hello\n\nworld\n  \nfoo"
    const results = parseBatchContent(text, "L")

    expect(results).toHaveLength(3)
    expect(results[0]).toEqual({ line: 1, content: "hello", valid: true })
    expect(results[1]).toEqual({ line: 3, content: "world", valid: true })
    expect(results[2]).toEqual({ line: 5, content: "foo", valid: true })
  })

  it("should trim whitespace from each line", () => {
    const text = "  hello  \n\tworld\t"
    const results = parseBatchContent(text, "L")

    expect(results[0].content).toBe("hello")
    expect(results[1].content).toBe("world")
  })

  it("should mark content exceeding capacity as invalid", () => {
    const longContent = "a".repeat(2954)
    const text = `short\n${longContent}`
    const results = parseBatchContent(text, "L")

    expect(results[0].valid).toBe(true)
    expect(results[0].error).toBeUndefined()
    expect(results[1].valid).toBe(false)
    expect(results[1].error).toContain("内容过长")
    expect(results[1].error).toContain("2954")
    expect(results[1].error).toContain("2953")
  })

  it("should respect different error correction levels", () => {
    const content = "a".repeat(1664)
    const text = content

    expect(parseBatchContent(text, "L")[0].valid).toBe(true)
    expect(parseBatchContent(text, "M")[0].valid).toBe(true)
    expect(parseBatchContent(text, "Q")[0].valid).toBe(false)
    expect(parseBatchContent(text, "H")[0].valid).toBe(false)
  })

  it("should handle content at exact capacity boundary", () => {
    const exactL = "a".repeat(2953)
    expect(parseBatchContent(exactL, "L")[0].valid).toBe(true)

    const overL = "a".repeat(2954)
    expect(parseBatchContent(overL, "L")[0].valid).toBe(false)
  })

  it("should return empty array for empty input", () => {
    expect(parseBatchContent("", "L")).toEqual([])
    expect(parseBatchContent("   \n  \n  ", "L")).toEqual([])
  })

  it("should handle multi-byte characters correctly", () => {
    const chinese = "你好世界"
    const results = parseBatchContent(chinese, "H")
    expect(results[0].valid).toBe(true)
  })
})

describe("parseBatchUrls", () => {
  it("should validate URLs starting with http:// or https://", () => {
    const text = "https://example.com\nhttp://test.org\nftp://invalid.com"
    const results = parseBatchUrls(text)

    expect(results).toHaveLength(3)
    expect(results[0]).toEqual({ line: 1, content: "https://example.com", valid: true })
    expect(results[1]).toEqual({ line: 2, content: "http://test.org", valid: true })
    expect(results[2].valid).toBe(false)
    expect(results[2].error).toContain("URL 格式无效")
  })

  it("should skip empty lines", () => {
    const text = "https://a.com\n\nhttps://b.com"
    const results = parseBatchUrls(text)

    expect(results).toHaveLength(2)
    expect(results[0].line).toBe(1)
    expect(results[1].line).toBe(3)
  })

  it("should trim whitespace from URLs", () => {
    const text = "  https://example.com  "
    const results = parseBatchUrls(text)

    expect(results[0].content).toBe("https://example.com")
    expect(results[0].valid).toBe(true)
  })

  it("should mark plain text as invalid", () => {
    const text = "not a url\nexample.com\nhttps://valid.com"
    const results = parseBatchUrls(text)

    expect(results[0].valid).toBe(false)
    expect(results[1].valid).toBe(false)
    expect(results[2].valid).toBe(true)
  })

  it("should return empty array for empty input", () => {
    expect(parseBatchUrls("")).toEqual([])
    expect(parseBatchUrls("  \n  ")).toEqual([])
  })
})
