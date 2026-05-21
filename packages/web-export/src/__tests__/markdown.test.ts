import { describe, it, expect } from "vitest"
import * as fc from "fast-check"

import { buildMarkdownDocument } from "../markdown"
import type { MarkdownExportSource } from "../types"

/**
 * Feature: monorepo-refactor, Property 5: Markdown document structure invariants
 * Validates: Requirements 2.3, 2.6
 */

const nonEmptyString = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0)

const markdownExportSourceArb = fc.record({
  title: nonEmptyString,
  url: nonEmptyString,
  byline: fc.option(fc.string(), { nil: undefined }),
  excerpt: fc.option(fc.string(), { nil: undefined }),
  capturedAt: nonEmptyString,
  markdown: nonEmptyString,
  plainText: nonEmptyString
}) as fc.Arbitrary<MarkdownExportSource>

describe("Feature: monorepo-refactor, Property 5: Markdown document structure invariants", () => {
  it("output starts with # {title}", () => {
    fc.assert(
      fc.property(markdownExportSourceArb, (source) => {
        const result = buildMarkdownDocument(source)
        expect(result.startsWith(`# ${source.title}`)).toBe(true)
      }),
      { numRuns: 20 }
    )
  })

  it("output contains - Source: {url}", () => {
    fc.assert(
      fc.property(markdownExportSourceArb, (source) => {
        const result = buildMarkdownDocument(source)
        expect(result).toContain(`- Source: ${source.url}`)
      }),
      { numRuns: 20 }
    )
  })

  it("output contains - Captured At: {capturedAt}", () => {
    fc.assert(
      fc.property(markdownExportSourceArb, (source) => {
        const result = buildMarkdownDocument(source)
        expect(result).toContain(`- Captured At: ${source.capturedAt}`)
      }),
      { numRuns: 20 }
    )
  })

  it("output ends with newline", () => {
    fc.assert(
      fc.property(markdownExportSourceArb, (source) => {
        const result = buildMarkdownDocument(source)
        expect(result.endsWith("\n")).toBe(true)
      }),
      { numRuns: 20 }
    )
  })
})
