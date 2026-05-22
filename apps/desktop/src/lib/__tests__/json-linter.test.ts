import { describe, it, expect } from "vitest"
import { EditorState } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"

import { jsonLintSource } from "../json-linter"

/**
 * Create a minimal mock EditorView that provides the state.doc
 * interface needed by jsonLintSource, without requiring a real DOM.
 */
function createMockView(text: string): EditorView {
  const state = EditorState.create({ doc: text })
  return { state } as unknown as EditorView
}

describe("jsonLintSource", () => {
  it("should return empty diagnostics for valid JSON", () => {
    const view = createMockView('{"key": "value"}')
    const diagnostics = jsonLintSource(view)
    expect(diagnostics).toEqual([])
  })

  it("should return empty diagnostics for empty input", () => {
    const view = createMockView("")
    const diagnostics = jsonLintSource(view)
    expect(diagnostics).toEqual([])
  })

  it("should return empty diagnostics for whitespace-only input", () => {
    const view = createMockView("   \n  \t  ")
    const diagnostics = jsonLintSource(view)
    expect(diagnostics).toEqual([])
  })

  it("should return a diagnostic for invalid JSON", () => {
    const view = createMockView("{invalid}")
    const diagnostics = jsonLintSource(view)
    expect(diagnostics.length).toBe(1)
    expect(diagnostics[0].severity).toBe("error")
  })

  it("should have valid from/to positions within document bounds", () => {
    const text = '{"key": value}'
    const view = createMockView(text)
    const diagnostics = jsonLintSource(view)
    expect(diagnostics.length).toBe(1)
    expect(diagnostics[0].from).toBeGreaterThanOrEqual(0)
    expect(diagnostics[0].to).toBeGreaterThanOrEqual(diagnostics[0].from)
    expect(diagnostics[0].to).toBeLessThanOrEqual(text.length)
  })

  it("should handle trailing comma error", () => {
    const text = '{"a": 1,}'
    const view = createMockView(text)
    const diagnostics = jsonLintSource(view)
    expect(diagnostics.length).toBe(1)
    expect(diagnostics[0].from).toBeGreaterThanOrEqual(0)
    expect(diagnostics[0].to).toBeLessThanOrEqual(text.length)
  })

  it("should handle multiline JSON with error on later line", () => {
    const text = '{\n  "a": 1,\n  "b": \n}'
    const view = createMockView(text)
    const diagnostics = jsonLintSource(view)
    expect(diagnostics.length).toBe(1)
    expect(diagnostics[0].from).toBeGreaterThanOrEqual(0)
    expect(diagnostics[0].to).toBeLessThanOrEqual(text.length)
  })

  it("should return valid JSON arrays without diagnostics", () => {
    const view = createMockView("[1, 2, 3]")
    const diagnostics = jsonLintSource(view)
    expect(diagnostics).toEqual([])
  })

  it("should include error message in diagnostic", () => {
    const view = createMockView("{bad}")
    const diagnostics = jsonLintSource(view)
    expect(diagnostics.length).toBe(1)
    expect(diagnostics[0].message).toBeTruthy()
    expect(typeof diagnostics[0].message).toBe("string")
  })

  it("should satisfy 0 <= from <= to <= length for single character input", () => {
    const text = "x"
    const view = createMockView(text)
    const diagnostics = jsonLintSource(view)
    expect(diagnostics.length).toBe(1)
    expect(diagnostics[0].from).toBeGreaterThanOrEqual(0)
    expect(diagnostics[0].from).toBeLessThanOrEqual(diagnostics[0].to)
    expect(diagnostics[0].to).toBeLessThanOrEqual(text.length)
  })

  it("should handle valid nested JSON", () => {
    const view = createMockView('{"a": {"b": [1, 2, 3]}}')
    const diagnostics = jsonLintSource(view)
    expect(diagnostics).toEqual([])
  })
})
