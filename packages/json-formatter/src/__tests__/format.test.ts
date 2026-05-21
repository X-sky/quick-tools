import { describe, it, expect } from "vitest"

import { parseJsonOrJsObject } from "../parse"
import { formatJson, minifyJson } from "../format"

describe("parseJsonOrJsObject — JS object literal edge cases", () => {
  it("parses single-quoted strings", () => {
    const input = "{ 'key': 'value' }"
    const result = parseJsonOrJsObject(input)
    expect(result).toEqual({ key: "value" })
  })

  it("parses unquoted keys", () => {
    const input = '{ key: "value" }'
    const result = parseJsonOrJsObject(input)
    expect(result).toEqual({ key: "value" })
  })

  it("parses trailing commas", () => {
    const input = '{ "a": 1, "b": 2, }'
    const result = parseJsonOrJsObject(input)
    expect(result).toEqual({ a: 1, b: 2 })
  })

  it("parses with comments (block and inline)", () => {
    const input = `{ /* comment */ "a": 1 // inline
    }`
    const result = parseJsonOrJsObject(input)
    expect(result).toEqual({ a: 1 })
  })
})

describe("parseJsonOrJsObject — error messages", () => {
  it("throws with Chinese error message on invalid input", () => {
    expect(() => parseJsonOrJsObject("not valid at all !!!")).toThrow(
      "无法解析为JSON或JS对象:"
    )
  })
})

describe("minifyJson", () => {
  it("produces valid JSON with no extra whitespace", () => {
    const value = { name: "test", items: [1, 2, 3], nested: { a: true } }
    const minified = minifyJson(value)

    expect(minified).not.toMatch(/\s/)
    expect(JSON.parse(minified)).toEqual(value)
  })
})

describe("formatJson", () => {
  it("uses custom indent", () => {
    const value = { a: 1 }
    const result = formatJson(value, 4)
    expect(result).toBe('{\n    "a": 1\n}')
  })

  it("defaults to 2-space indent", () => {
    const value = { a: 1 }
    const result = formatJson(value)
    expect(result).toBe('{\n  "a": 1\n}')
  })
})
