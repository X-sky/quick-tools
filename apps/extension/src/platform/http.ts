import type {
  HttpClient,
  HttpRequestOptions,
  HttpResponse,
  PlatformResult
} from "@quick-tools/platform"
import { createErrorResult, createSuccess } from "@quick-tools/platform"

export const chromeHttpClient: HttpClient = {
  async fetch(
    url: string,
    options?: HttpRequestOptions
  ): Promise<PlatformResult<HttpResponse>> {
    try {
      const controller = new AbortController()
      let timeoutId: ReturnType<typeof setTimeout> | undefined

      if (options?.timeoutMs) {
        timeoutId = setTimeout(
          () => controller.abort(),
          options.timeoutMs
        )
      }

      const response = await fetch(url, {
        method: options?.method ?? "GET",
        headers: options?.headers,
        body: options?.body,
        signal: controller.signal
      })

      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }

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
