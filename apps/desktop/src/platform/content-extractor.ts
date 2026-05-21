import type {
  ContentExtractor,
  ExtractedContent,
  PlatformResult
} from "@quick-tools/platform"
import { createErrorResult, createSuccess } from "@quick-tools/platform"
import { fetch as tauriFetch } from "@tauri-apps/plugin-http"
import { Readability } from "@mozilla/readability"

const DEFAULT_TIMEOUT_MS = 30_000

function parseHtmlToDocument(html: string, url: string): Document {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  const base = doc.createElement("base")
  base.href = url
  doc.head.appendChild(base)
  return doc
}

export const tauriContentExtractor: ContentExtractor = {
  async extractFromCurrentPage(): Promise<PlatformResult<ExtractedContent>> {
    return createErrorResult(
      "not-found",
      "Desktop app does not have a current page context. Use extractFromUrl instead."
    )
  },

  async extractFromUrl(
    url: string
  ): Promise<PlatformResult<ExtractedContent>> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(
        () => controller.abort(),
        DEFAULT_TIMEOUT_MS
      )

      const response = await tauriFetch(url, {
        method: "GET",
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return createErrorResult(
          "network",
          `Failed to fetch ${url}: HTTP ${response.status}`
        )
      }

      const html = await response.text()
      const doc = parseHtmlToDocument(html, url)
      const reader = new Readability(doc)
      const article = reader.parse()

      if (!article) {
        return createErrorResult(
          "unknown",
          "当前页面正文提取失败。请在普通网页中重试。"
        )
      }

      return createSuccess({
        title: article.title || doc.title || url,
        url,
        byline: article.byline || undefined,
        excerpt: article.excerpt || undefined,
        capturedAt: new Date().toISOString(),
        markdown: article.textContent || "",
        plainText: article.textContent || ""
      })
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return createErrorResult("timeout", `Request to ${url} timed out`)
      }
      if (err instanceof TypeError) {
        return createErrorResult(
          "network",
          `Network error fetching ${url}: ${err.message}`
        )
      }
      return createErrorResult(
        "unknown",
        `Content extraction from URL failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}
