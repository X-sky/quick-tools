import { describe, it, expect } from "vitest"
import * as fc from "fast-check"

import { parse } from "../parser"
import { render } from "../renderer"

/**
 * Property 3: Substitution Fidelity
 *
 * For every Template_String T accepted by the Template_Parser and every
 * value map m that supplies a value for each Placeholder in T, the
 * Final_String SHALL equal the concatenation of the parsed segment list
 * with each Placeholder_Token replaced by m[name] and each literal
 * segment kept as-is.
 *
 * render(T, m) ≡ concat(segments.map(s => s.type === "literal" ? s.value : m[s.value]))
 *
 * **Validates: Requirements 7.1, 10.2**
 */
describe("Feature: qr-template-generator, Property 3: Substitution Fidelity", () => {
  /**
   * Generator for valid placeholder names matching [A-Za-z0-9_-]+
   */
  const placeholderNameArb = fc.stringOf(
    fc.char().filter((c) => /[A-Za-z0-9_-]/.test(c)),
    { minLength: 1, maxLength: 12 }
  )

  /**
   * Generator for literal text segments that may contain escaped braces.
   * Produces strings with {{ and }} escapes mixed with regular text.
   */
  const literalPartArb = fc
    .array(
      fc.oneof(
        // Regular text without braces
        fc.stringOf(
          fc.char().filter((c) => c !== "{" && c !== "}"),
          { minLength: 1, maxLength: 5 }
        ),
        // Escaped opening brace
        fc.constant("{{"),
        // Escaped closing brace
        fc.constant("}}")
      ),
      { minLength: 0, maxLength: 5 }
    )
    .map((parts) => parts.join(""))

  /**
   * Generator for a valid template string containing a mix of literal
   * segments (with escaped braces) and valid placeholder tokens.
   * Returns [templateString, placeholderNames[]] tuple.
   */
  const validTemplateArb = fc
    .array(
      fc.oneof(
        // Literal segment
        literalPartArb.map((text) => ({ type: "literal" as const, text })),
        // Placeholder segment
        placeholderNameArb.map((name) => ({
          type: "placeholder" as const,
          text: `{${name}}`
        }))
      ),
      { minLength: 1, maxLength: 10 }
    )
    .map((parts) => parts.map((p) => p.text).join(""))

  /**
   * Generator for arbitrary placeholder values including strings with
   * special characters like {, }, newlines, unicode, etc.
   */
  const placeholderValueArb = fc.string({ minLength: 0, maxLength: 30 })

  it("render(T, m) equals concat of segments with placeholders substituted", () => {
    fc.assert(
      fc.property(validTemplateArb, (template) => {
        const parseResult = parse(template)

        // Only test templates that parse without errors
        if (parseResult.errors.length > 0) return

        // Generate a complete value map for all placeholder names
        const valueMap: Record<string, string> = {}
        for (const name of parseResult.placeholderNames) {
          // Use a deterministic but varied value based on the name
          valueMap[name] = `value_for_${name}_${name.length}`
        }

        // Actual result from renderer
        const actual = render(template, valueMap)

        // Expected: manually concatenate segments with substitution
        const expected = parseResult.segments
          .map((s) => (s.type === "literal" ? s.value : valueMap[s.value]))
          .join("")

        expect(actual).toBe(expected)
      }),
      { numRuns: 100 }
    )
  })

  it("render(T, m) substitutes arbitrary values verbatim without re-parsing", () => {
    fc.assert(
      fc.property(
        validTemplateArb,
        placeholderValueArb,
        (template, arbitraryValue) => {
          const parseResult = parse(template)

          // Only test templates that parse without errors
          if (parseResult.errors.length > 0) return
          // Need at least one placeholder to test substitution
          if (parseResult.placeholderNames.length === 0) return

          // Assign the same arbitrary value (which may contain {, }, etc.)
          // to all placeholders
          const valueMap: Record<string, string> = {}
          for (const name of parseResult.placeholderNames) {
            valueMap[name] = arbitraryValue
          }

          // Actual result from renderer
          const actual = render(template, valueMap)

          // Expected: manually concatenate segments with substitution
          const expected = parseResult.segments
            .map((s) => (s.type === "literal" ? s.value : valueMap[s.value]))
            .join("")

          expect(actual).toBe(expected)
        }
      ),
      { numRuns: 100 }
    )
  })
})
