import type {
  HttpClient,
  HttpRequestOptions,
  HttpResponse,
  PlatformResult
} from "@quick-tools/platform"
import { createErrorResult, createSuccess } from "@quick-tools/platform"
import { fetch as tauriFetch } from "@tauri-apps/plugin-http"

const DEFAULT_TIMEOUT_MS = 30_000

export const tauriHttpClient: HttpClient = {
  async fetch(
    url: string,
    options?: HttpRequestOptions
  ): Promise<PlatformResult<HttpResponse>> {
    try {
      const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
      const controller = new AbortController()
      const timeoutId = setTimeout(
        () => controller.abort(),
        timeoutMs
      )

      const response = await tauriFetch(url, {
        method: options?.method ?? "GET",
        headers: options?.headers,
        body: options?.body
          ? typeof options.body === "string"
            ? options.body
            : options.body
          : undefined,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const bodyText = await response.text()
      const headers: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        headers[key] = value
      })

      return createSuccess({
        status: response.status,
        headers,
        body: bodyText
      })
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return createErrorResult("timeout", `Request to ${url} timed out`)
      }
      if (err instanceof TypeError) {
        return createErrorResult(
          "network",
          `Network error for ${url}: ${err.message}`
        )
      }
      return createErrorResult(
        "unknown",
        `HTTP request failed for ${url}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}
