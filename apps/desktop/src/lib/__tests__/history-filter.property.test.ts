import { describe, it, expect } from "vitest"
import * as fc from "fast-check"

import { filterHistory } from "../history-filter"

/**
 * Property 5: 历史记录搜索过滤正确性
 *
 * For any 历史记录列表和搜索关键词 query，filterHistory(items, query) 返回的结果应满足：
 * (a) 所有返回项的 content 字段包含 query（大小写不敏感），
 * (b) 所有未返回项的 content 字段不包含 query（大小写不敏感），
 * (c) 返回项的相对顺序与原列表一致。
 *
 * Validates: Requirements 9.3
 */

const historyItemArb = fc.record({
  content: fc.string(),
  timestamp: fc.nat()
})

const historyListArb = fc.array(historyItemArb)

describe("Feature: desktop-features-optimization, Property 5: 历史记录搜索过滤正确性", () => {
  it("所有返回项的 content 包含 query（大小写不敏感）", () => {
    fc.assert(
      fc.property(historyListArb, fc.string(), (items, query) => {
        fc.pre(query.trim().length > 0)

        const result = filterHistory(items, query)
        const lower = query.toLowerCase()

        for (const item of result) {
          expect(item.content.toLowerCase()).toContain(lower)
        }
      }),
      { numRuns: 100 }
    )
  })

  it("所有未返回项的 content 不包含 query（大小写不敏感）", () => {
    fc.assert(
      fc.property(historyListArb, fc.string(), (items, query) => {
        fc.pre(query.trim().length > 0)

        const result = filterHistory(items, query)
        const lower = query.toLowerCase()
        const resultSet = new Set(result)

        for (const item of items) {
          if (!resultSet.has(item)) {
            expect(item.content.toLowerCase()).not.toContain(lower)
          }
        }
      }),
      { numRuns: 100 }
    )
  })

  it("返回项的相对顺序与原列表一致", () => {
    fc.assert(
      fc.property(historyListArb, fc.string(), (items, query) => {
        fc.pre(query.trim().length > 0)

        const result = filterHistory(items, query)

        let lastIndex = -1
        for (const item of result) {
          const currentIndex = items.indexOf(item)
          expect(currentIndex).toBeGreaterThan(lastIndex)
          lastIndex = currentIndex
        }
      }),
      { numRuns: 100 }
    )
  })
})
