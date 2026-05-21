import { describe, it, expect, vi, beforeEach } from "vitest"
import * as fc from "fast-check"

import type { PlatformProvider } from "../interfaces"

/**
 * Feature: monorepo-refactor, Property 6: Platform registry round-trip
 * Validates: Requirements 6.7
 */

function arbitraryPlatformProvider(): fc.Arbitrary<PlatformProvider> {
  return fc.record({
    fileDownloader: fc.record({
      download: fc.constant(
        async () => ({ ok: true as const, value: undefined })
      ),
      downloadWithDialog: fc.constant(
        async () => ({ ok: true as const, value: undefined })
      )
    }),
    clipboard: fc.record({
      writeText: fc.constant(
        async () => ({ ok: true as const, value: undefined })
      ),
      writeImage: fc.constant(
        async () => ({ ok: true as const, value: undefined })
      )
    }),
    storage: fc.record({
      get: fc.constant(async () => ({ ok: true as const, value: null })),
      set: fc.constant(
        async () => ({ ok: true as const, value: undefined })
      ),
      remove: fc.constant(
        async () => ({ ok: true as const, value: undefined })
      )
    }),
    http: fc.record({
      fetch: fc.constant(
        async () => ({
          ok: true as const,
          value: { status: 200, headers: {}, body: "" }
        })
      )
    }),
    contentExtractor: fc.record({
      extractFromCurrentPage: fc.constant(
        async () => ({
          ok: true as const,
          value: {
            title: "",
            url: "",
            capturedAt: "",
            markdown: "",
            plainText: ""
          }
        })
      ),
      extractFromUrl: fc.constant(
        async () => ({
          ok: true as const,
          value: {
            title: "",
            url: "",
            capturedAt: "",
            markdown: "",
            plainText: ""
          }
        })
      )
    })
  }) as fc.Arbitrary<PlatformProvider>
}

describe("Feature: monorepo-refactor, Property 6: Platform registry round-trip", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("getPlatform() before registration throws an error", async () => {
    const { getPlatform } = await import("../registry")
    expect(() => getPlatform()).toThrow(
      "Platform not registered. Call registerPlatform() before using platform capabilities."
    )
  })

  it("registerPlatform(provider) followed by getPlatform() returns the same object reference", async () => {
    const { registerPlatform, getPlatform } = await import("../registry")
    fc.assert(
      fc.property(arbitraryPlatformProvider(), (provider) => {
        registerPlatform(provider)
        const retrieved = getPlatform()
        expect(retrieved).toBe(provider)
      }),
      { numRuns: 100 }
    )
  })
})
