import { describe, it, expect } from "vitest"
import * as fc from "fast-check"
import { marked } from "marked"

import { createTurndownService } from "../turndown-config"

/**
 * Property 6: Turndown HTML 元素保留
 *
 * For any 包含标题（h1-h6）、链接（a）、图片（img）、代码块（pre/code）、列表（ul/ol）
 * 的有效 HTML 片段，经 Turndown 转换后的 Markdown 应满足：
 * (a) h{N} 标签转为以 N 个 # 开头的行
 * (b) <a href="url">text</a> 转为包含 [text](url) 的文本
 * (c) <img alt="alt" src="src"> 转为包含 ![alt](src) 的文本
 * (d) <pre><code>content</code></pre> 转为包含 ``` 围栏的代码块
 * (e) <ul><li>item</li></ul> 转为包含 "- item" 的列表
 *
 * Validates: Requirements 10.2, 10.3, 10.4, 10.5, 10.6
 */

const headingLevelArb = fc.integer({ min: 1, max: 6 })

// Text without leading/trailing whitespace and no special markdown chars
const safeTextArb = fc.stringOf(
  fc.char().filter((c) => /[a-zA-Z0-9\u4e00-\u9fff]/.test(c)),
  { minLength: 1, maxLength: 20 }
)

// URL that avoids characters Turndown would escape (parentheses, etc.)
const safeUrlArb = fc
  .tuple(
    fc.constantFrom("https://", "http://"),
    fc.stringOf(
      fc.char().filter((c) => /[a-z0-9]/.test(c)),
      { minLength: 3, maxLength: 15 }
    ),
    fc.constantFrom(".com", ".org", ".net", ".io"),
    fc.constantFrom("", "/page", "/path/to")
  )
  .map(([protocol, domain, tld, path]) => `${protocol}${domain}${tld}${path}`)

// Code content: simple alphanumeric with spaces
const safeCodeContentArb = fc
  .stringOf(
    fc.char().filter((c) => /[a-zA-Z0-9 _=;]/.test(c)),
    { minLength: 1, maxLength: 30 }
  )
  .map((s) => s.trim())
  .filter((s) => s.length > 0)

describe("Feature: desktop-features-optimization, Property 6: Turndown HTML 元素保留", () => {
  it("(a) h{N} 标签转为以 N 个 # 开头的行", () => {
    fc.assert(
      fc.property(headingLevelArb, safeTextArb, (level, text) => {
        const service = createTurndownService()
        const html = `<h${level}>${text}</h${level}>`
        const md = service.turndown(html)
        const prefix = "#".repeat(level) + " "
        const hasHeading = md
          .split("\n")
          .some((line) => line.startsWith(prefix))

        expect(hasHeading).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it("(b) <a href='url'>text</a> 转为包含 [text](url) 的文本", () => {
    fc.assert(
      fc.property(safeTextArb, safeUrlArb, (text, url) => {
        const service = createTurndownService()
        const html = `<a href="${url}">${text}</a>`
        const md = service.turndown(html)
        const expected = `[${text}](${url})`

        expect(md).toContain(expected)
      }),
      { numRuns: 100 }
    )
  })

  it("(c) <img alt='alt' src='src'> 转为包含 ![alt](src) 的文本", () => {
    fc.assert(
      fc.property(safeTextArb, safeUrlArb, (alt, src) => {
        const service = createTurndownService()
        const html = `<img alt="${alt}" src="${src}">`
        const md = service.turndown(html)
        const expected = `![${alt}](${src})`

        expect(md).toContain(expected)
      }),
      { numRuns: 100 }
    )
  })

  it("(d) <pre><code>content</code></pre> 转为包含围栏代码块", () => {
    fc.assert(
      fc.property(safeCodeContentArb, (content) => {
        const service = createTurndownService()
        const html = `<pre><code>${content}</code></pre>`
        const md = service.turndown(html)

        expect(md).toContain("```")
      }),
      { numRuns: 100 }
    )
  })

  it("(e) <ul><li>item</li></ul> 转为包含 '- item' 的列表", () => {
    fc.assert(
      fc.property(safeTextArb, (item) => {
        const service = createTurndownService()
        const html = `<ul><li>${item}</li></ul>`
        const md = service.turndown(html)
        // Turndown with GFM may use variable spacing after -
        const hasListItem = md
          .split("\n")
          .some((line) => {
            const trimmed = line.trimStart()
            return trimmed.startsWith("-") && trimmed.includes(item)
          })

        expect(hasListItem).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})

/**
 * Property 7: Turndown 转换 round-trip 语义等价性
 *
 * For any 由标题、段落、链接、列表、代码块组成的有效 HTML 文档，
 * 经 Turndown 转换为 Markdown 后，再经 marked 解析回 HTML，
 * 所得 HTML 的语义结构（标题层级数量、链接 href 集合、列表项数量）应与原始 HTML 一致。
 *
 * Validates: Requirements 10.7
 */

function countHeadingsByLevel(html: string): Record<number, number> {
  const counts: Record<number, number> = {}
  const regex = /<h([1-6])[^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1]!, 10)
    counts[level] = (counts[level] || 0) + 1
  }
  return counts
}

function extractLinkHrefs(html: string): Set<string> {
  const hrefs = new Set<string>()
  const regex = /<a[^>]+href="([^"]*)"[^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(html)) !== null) {
    hrefs.add(match[1]!)
  }
  return hrefs
}

function countListItems(html: string): number {
  const regex = /<li[^>]*>/gi
  const matches = html.match(regex)
  return matches ? matches.length : 0
}

const headingArb = fc.tuple(
  fc.integer({ min: 1, max: 6 }),
  safeTextArb
).map(([level, text]) => `<h${level}>${text}</h${level}>`)

const paragraphArb = safeTextArb.map((text) => `<p>${text}</p>`)

const linkArb = fc.tuple(safeTextArb, safeUrlArb).map(
  ([text, url]) => `<a href="${url}">${text}</a>`
)

const listArb = fc.array(safeTextArb, { minLength: 1, maxLength: 5 }).map(
  (items) => `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`
)

const htmlDocArb = fc.tuple(
  fc.array(headingArb, { minLength: 1, maxLength: 3 }),
  fc.array(paragraphArb, { minLength: 0, maxLength: 3 }),
  fc.array(linkArb, { minLength: 0, maxLength: 3 }),
  fc.array(listArb, { minLength: 0, maxLength: 2 })
).map(([headings, paragraphs, links, lists]) => {
  const parts = [
    ...headings,
    ...paragraphs,
    ...links.map((link) => `<p>${link}</p>`),
    ...lists
  ]
  return parts.join("\n")
})

describe("Feature: desktop-features-optimization, Property 7: Turndown 转换 round-trip 语义等价性", () => {
  it("HTML → Markdown → HTML 后标题层级数量一致", () => {
    fc.assert(
      fc.property(htmlDocArb, (html) => {
        const service = createTurndownService()
        const markdown = service.turndown(html)
        const roundTripHtml = marked.parse(markdown) as string
        const originalCounts = countHeadingsByLevel(html)
        const roundTripCounts = countHeadingsByLevel(roundTripHtml)
        expect(roundTripCounts).toEqual(originalCounts)
      }),
      { numRuns: 100 }
    )
  })

  it("HTML → Markdown → HTML 后链接 href 集合一致", () => {
    fc.assert(
      fc.property(htmlDocArb, (html) => {
        const service = createTurndownService()
        const markdown = service.turndown(html)
        const roundTripHtml = marked.parse(markdown) as string
        const originalHrefs = extractLinkHrefs(html)
        const roundTripHrefs = extractLinkHrefs(roundTripHtml)
        expect(roundTripHrefs).toEqual(originalHrefs)
      }),
      { numRuns: 100 }
    )
  })

  it("HTML → Markdown → HTML 后列表项数量一致", () => {
    fc.assert(
      fc.property(htmlDocArb, (html) => {
        const service = createTurndownService()
        const markdown = service.turndown(html)
        const roundTripHtml = marked.parse(markdown) as string
        const originalCount = countListItems(html)
        const roundTripCount = countListItems(roundTripHtml)
        expect(roundTripCount).toBe(originalCount)
      }),
      { numRuns: 100 }
    )
  })
})
