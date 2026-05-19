import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { parse, print } from "../parser"

/**
 * Property 2: Template_String Round-Trip (parse → print)
 *
 * For every Template_String T that the Template_Parser accepts without error,
 * printing the parsed segment list SHALL reproduce T exactly.
 *
 * print(parse(T).segments) ≡ T
 *
 * **Validates: Requirements 4.1, 4.2, 4.12**
 */

/**
 * Generator for valid placeholder names matching [A-Za-z0-9_-]+
 */
const validPlaceholderName = fc.stringMatching(/^[A-Za-z0-9_-]{1,20}$/)

/**
 * Generator for literal text fragments.
 * Arbitrary Unicode strings that exclude `{` and `}`.
 */
const literalText = fc
  .string({ minLength: 0, maxLength: 30 })
  .map((s) => s.replace(/[{}]/g, ""))

/**
 * Generator for escaped brace sequences: `{{` or `}}`
 */
const escapedBrace = fc.constantFrom("{{", "}}")

/**
 * Generator for valid placeholder tokens: `{name}`
 */
const placeholderToken = validPlaceholderName.map((name) => `{${name}}`)

/**
 * Generator for a single fragment of a valid template string.
 * Can be: literal text, escaped braces, or a placeholder token.
 */
const templateFragment = fc.oneof(
  { weight: 3, arbitrary: literalText },
  { weight: 2, arbitrary: escapedBrace },
  { weight: 2, arbitrary: placeholderToken }
)

/**
 * Generator for valid Template_Strings by concatenating fragments.
 */
const validTemplateString = fc
  .array(templateFragment, { minLength: 0, maxLength: 10 })
  .map((fragments) => fragments.join(""))

describe("Feature: qr-template-generator, Property 2: Template_String Round-Trip", () => {
  it("print(parse(T).segments) ≡ T for all valid template strings", () => {
    fc.assert(
      fc.property(validTemplateString, (templateStr) => {
        const result = parse(templateStr)

        // Precondition: template must parse without errors
        fc.pre(result.errors.length === 0)

        // Round-trip: print the parsed segments and compare to original
        const printed = print(result.segments)
        expect(printed).toBe(templateStr)
      }),
      { numRuns: 100 }
    )
  })
})
