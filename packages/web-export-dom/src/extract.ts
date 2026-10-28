import { Readability } from "@mozilla/readability"
import type { MarkdownExportSource } from "@quick-tools/web-export"
import TurndownService from "turndown"
import { gfm } from "turndown-plugin-gfm"

export function createTurndownService(): TurndownService {
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
    strongDelimiter: "**"
  })
  service.use(gfm)
  return service
}

export class ExtractionError extends Error {}

/**
 * Turn a page's HTML into an export source with Readability + Turndown.
 * Both apps call this: the extension with the live tab's DOM snapshot, the
 * desktop app with the HTML it fetched, so the Markdown is identical.
 */
export function extractFromHtml(
  html: string,
  url: string,
  options: { capturedAt?: string; fallbackTitle?: string } = {}
): MarkdownExportSource {
  const doc = new DOMParser().parseFromString(html, "text/html")
  // Readability resolves relative links/images against the document base.
  doc.querySelectorAll("base").forEach((b) => b.remove())
  const base = doc.createElement("base")
  base.href = url
  doc.head.appendChild(base)

  const pageTitle = doc.title
  const article = new Readability(doc).parse()
  if (!article || !article.content) {
    throw new ExtractionError("当前页面没有可导出的正文内容。")
  }

  const markdown = createTurndownService().turndown(article.content).trim()
  if (!markdown) {
    throw new ExtractionError("当前页面没有可导出的正文内容。")
  }

  return {
    title: article.title || pageTitle || options.fallbackTitle || url,
    url,
    byline: article.byline || undefined,
    excerpt: article.excerpt || undefined,
    capturedAt: options.capturedAt ?? new Date().toISOString(),
    markdown,
    plainText: (article.textContent ?? "").trim()
  }
}
