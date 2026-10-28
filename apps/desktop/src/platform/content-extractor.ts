import type {
  ContentExtractor,
  ExtractedContent,
  PlatformResult
} from "@quick-tools/platform"
import { createErrorResult, createSuccess } from "@quick-tools/platform"
import { fetch as tauriFetch } from "@tauri-apps/plugin-http"
import { ExtractionError, extractFromHtml } from "@quick-tools/web-export-dom"

const DEFAULT_TIMEOUT_MS = 30_000

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
      return createSuccess(extractFromHtml(html, url))
    } catch (err) {
      if (err instanceof ExtractionError) {
        return createErrorResult("unknown", err.message)
      }
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
