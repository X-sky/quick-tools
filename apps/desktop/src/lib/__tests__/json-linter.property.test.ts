import { describe, it, expect } from "vitest"
import * as fc from "fast-check"
import { EditorState } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"

import { jsonLintSource } from "../json-linter"

/**
 * Property 1: JSON 语法检查诊断位置有效性
 *
 * For any 包含语法错误的 JSON 字符串，JSON linter 函数应产生至少一个诊断结果，
 * 且诊断的 from 和 to 位置应满足 0 <= from <= to <= input.length。
 *
 * Validates: Requirements 2.3
 */

function createMockView(text: string): EditorView {
  const state = EditorState.create({ doc: text })
  return { state } as unknown as EditorView
}

/**
 * Arbitrary that generates strings which are NOT valid JSON.
 * Strategy: generate arbitrary strings and filter out valid JSON,
 * plus generate corrupted valid JSON.
 */
const invalidJsonArb = fc.oneof(
  // Strategy 1: Arbitrary strings that fail JSON.parse
  fc.string({ minLength: 1 }).filter((s) => {
    try {
      JSON.parse(s)
      return false
    } catch {
      return true
    }
  }),
  // Strategy 2: Corrupt valid JSON by inserting/removing characters
  fc.tuple(
    fc.constantFrom(
      '{"key": "value"}',
      "[1, 2, 3]",
      '{"a": 1, "b": true}',
      '"hello"',
      "[null, false, 42]"
    ),
    fc.nat({ max: 20 }),
    fc.constantFrom("{", "}", "[", "]", ",", ":", "undefined", "NaN")
  ).map(([json, pos, insert]) => {
    const insertPos = Math.min(pos, json.length)
    return json.slice(0, insertPos) + insert + json.slice(insertPos + 1)
  }).filter((s) => {
    try {
      JSON.parse(s)
      return false
    } catch {
      return true
    }
  }),
  // Strategy 3: Common invalid patterns
  fc.constantFrom(
    "{",
    "}",
    "[",
    "]",
    "{invalid}",
    '{"key": }',
    '{"key": undefined}',
    "[1, 2,]",
    "{'single': 'quotes'}",
    "{\"a\": 1,}",
    "just text",
    "123abc",
    "{\"unclosed\": \"string}",
    "[1, 2, 3"
  )
)

describe("Feature: desktop-features-optimization, Property 1: JSON 语法检查诊断位置有效性", () => {
  it("对任意包含语法错误的 JSON 字符串，诊断的 from/to 满足 0 <= from <= to <= input.length", () => {
    fc.assert(
      fc.property(invalidJsonArb, (input) => {
        const view = createMockView(input)
        const diagnostics = jsonLintSource(view)

        // Should produce at least one diagnostic for invalid JSON
        expect(diagnostics.length).toBeGreaterThanOrEqual(1)

        // Each diagnostic should have valid positions
        for (const diag of diagnostics) {
          expect(diag.from).toBeGreaterThanOrEqual(0)
          expect(diag.from).toBeLessThanOrEqual(diag.to)
          expect(diag.to).toBeLessThanOrEqual(input.length)
        }
      }),
      { numRuns: 100 }
    )
  })
})
