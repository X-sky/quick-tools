import { describe, it, expect } from "vitest"
import * as fc from "fast-check"

import { parse } from "../parser"
import { render } from "../renderer"

/**
 * Property 4: Substitution Idempotence on Placeholder-Free Templates
 *
 * For every Template_String T whose parsed segment list contains zero
 * Placeholder_Tokens and any value map m, applying the Template_Renderer
 * SHALL yield the same result as decoding escaped braces in T.
 *
 * render(T, m) ≡ unescape(T)   when T has no placeholders
 *
 * **Validates: Requirements 7.2**
 */
describe("Feature: qr-template-generator, Property 4: Substitution Idempotence", () => {
  /**
   * Generator for placeholder-free template strings.
   * Produces strings containing only literal text and escaped braces ({{ and }}).
   * No {name} placeholder tokens are present.
   */
  const placeholderFreeTemplateArb = fc
    .array(
      fc.oneof(
        // Regular text without braces
        fc.stringOf(
          fc.char().filter((c) => c !== "{" && c !== "}"),
          { minLength: 1 }
        ),
        // Escaped opening brace
        fc.constant("{{"),
        // Escaped closing brace
        fc.constant("}}")
      ),
      { minLength: 0, maxLength: 20 }
    )
    .map((parts) => parts.join(""))

  /**
   * Generator for arbitrary value maps (irrelevant since no placeholders exist).
   */
  const arbitraryValueMapArb = fc.dictionary(
    fc.stringOf(fc.char().filter((c) => /[A-Za-z0-9_-]/.test(c)), {
      minLength: 1,
      maxLength: 10
    }),
    fc.string({ minLength: 0, maxLength: 50 })
  )

  it("render(T, m) equals unescape(T) when T has no placeholders", () => {
    fc.assert(
      fc.property(
        placeholderFreeTemplateArb,
        arbitraryValueMapArb,
        (template, valueMap) => {
          // Precondition: T has no placeholders
          const parseResult = parse(template)
          expect(parseResult.placeholderNames.length).toBe(0)

          // Actual result from renderer
          const actual = render(template, valueMap)

          // Expected: unescape by replacing {{ with { and }} with }
          const expected = template
            .replace(/\{\{/g, "{")
            .replace(/\}\}/g, "}")

          expect(actual).toBe(expected)
        }
      ),
      { numRuns: 100 }
    )
  })
})
