import { describe, it, expect } from "vitest"
import * as fc from "fast-check"

import { processBatchUrls } from "../batch-url-processor"
import type { UrlProcessor } from "../batch-url-processor"

/**
 * Property 8: 批量 URL 处理容错性
 *
 * For any 包含 N 个有效 URL 的批量输入（其中 M 个 URL 提取会失败），
 * 批量处理完成后的结果应满足：
 * (a) results.length === N
 * (b) 成功数 + 失败数 === N
 * (c) 失败的结果包含非空 error 字段
 * (d) 所有 URL 都被处理（不因单个失败而中断）
 *
 * Validates: Requirements 14.2, 14.4
 */

// Generate arrays of URLs with a set of indices that will fail
const batchInputArb = fc
  .integer({ min: 1, max: 30 })
  .chain((n) =>
    fc.tuple(
      fc.array(
        fc.webUrl({ withFragments: false, withQueryParameters: false }),
        { minLength: n, maxLength: n }
      ),
      fc.uniqueArray(fc.integer({ min: 0, max: n - 1 }), {
        minLength: 0,
        maxLength: n
      })
    )
  )

function createMockProcessor(failIndices: Set<number>): UrlProcessor {
  let callIndex = 0
  return async (url: string) => {
    const idx = callIndex++
    if (failIndices.has(idx)) {
      throw new Error(`Failed to extract: ${url}`)
    }
    return { title: `Title for ${url}` }
  }
}

describe("Feature: desktop-features-optimization, Property 8: 批量 URL 处理容错性", () => {
  it("results.length === N（结果数量等于输入 URL 数量）", async () => {
    await fc.assert(
      fc.asyncProperty(batchInputArb, async ([urls, failIndices]) => {
        const failSet = new Set(failIndices)
        const processor = createMockProcessor(failSet)
        const results = await processBatchUrls(urls, processor)

        expect(results.length).toBe(urls.length)
      }),
      { numRuns: 100 }
    )
  })

  it("成功数 + 失败数 === N", async () => {
    await fc.assert(
      fc.asyncProperty(batchInputArb, async ([urls, failIndices]) => {
        const failSet = new Set(failIndices)
        const processor = createMockProcessor(failSet)
        const results = await processBatchUrls(urls, processor)

        const successCount = results.filter((r) => r.success).length
        const failureCount = results.filter((r) => !r.success).length

        expect(successCount + failureCount).toBe(urls.length)
      }),
      { numRuns: 100 }
    )
  })

  it("失败的结果包含非空 error 字段", async () => {
    await fc.assert(
      fc.asyncProperty(batchInputArb, async ([urls, failIndices]) => {
        const failSet = new Set(failIndices)
        const processor = createMockProcessor(failSet)
        const results = await processBatchUrls(urls, processor)

        const failedResults = results.filter((r) => !r.success)
        for (const result of failedResults) {
          expect(result.error).toBeDefined()
          expect(result.error!.length).toBeGreaterThan(0)
        }
      }),
      { numRuns: 100 }
    )
  })

  it("所有 URL 都被处理（不因单个失败而中断）", async () => {
    await fc.assert(
      fc.asyncProperty(batchInputArb, async ([urls, failIndices]) => {
        const failSet = new Set(failIndices)
        const processedUrls: string[] = []

        const trackingProcessor: UrlProcessor = async (url: string) => {
          processedUrls.push(url)
          const idx = processedUrls.length - 1
          if (failSet.has(idx)) {
            throw new Error(`Failed to extract: ${url}`)
          }
          return { title: `Title for ${url}` }
        }

        await processBatchUrls(urls, trackingProcessor)

        // All URLs should have been processed regardless of failures
        expect(processedUrls.length).toBe(urls.length)
        for (let i = 0; i < urls.length; i++) {
          expect(processedUrls[i]).toBe(urls[i])
        }
      }),
      { numRuns: 100 }
    )
  })
})
