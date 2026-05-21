import type {
  ContentExtractor,
  ExtractedContent,
  PlatformResult
} from "@quick-tools/platform"
import { createErrorResult, createSuccess } from "@quick-tools/platform"

export const chromeContentExtractor: ContentExtractor = {
  async extractFromCurrentPage(): Promise<PlatformResult<ExtractedContent>> {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })

      if (!tab?.id) {
        return createErrorResult("not-found", "No active tab found")
      }

      if (!tab.url || tab.url.startsWith("chrome://")) {
        return createErrorResult(
          "permission",
          "Cannot extract content from browser internal pages"
        )
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          return {
            title: document.title,
            url: document.URL,
            html: document.documentElement.outerHTML
          }
        }
      })

      const result = results?.[0]?.result
      if (!result) {
        return createErrorResult(
          "unknown",
          "Content extraction returned no result"
        )
      }

      return createSuccess({
        title: result.title,
        url: result.url,
        capturedAt: new Date().toISOString(),
        markdown: "",
        plainText: ""
      })
    } catch (err) {
      return createErrorResult(
        "permission",
        `Content extraction failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  },

  async extractFromUrl(
    url: string
  ): Promise<PlatformResult<ExtractedContent>> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        return createErrorResult(
          "network",
          `Failed to fetch ${url}: HTTP ${response.status}`
        )
      }

      const html = await response.text()
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
      const title = titleMatch?.[1] ?? url

      return createSuccess({
        title,
        url,
        capturedAt: new Date().toISOString(),
        markdown: "",
        plainText: ""
      })
    } catch (err) {
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
