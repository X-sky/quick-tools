import type {
  ClipboardAccess,
  ContentExtractor,
  FileDownloader,
  HttpClient,
  HttpRequestOptions,
  HttpResponse,
  PlatformProvider,
  PlatformResult,
  StorageAdapter
} from "@quick-tools/platform"
import { createErrorResult, createSuccess } from "@quick-tools/platform"
import { Readability } from "@mozilla/readability"

import { createTurndownService } from "~/lib/turndown-config"

const DEFAULT_TIMEOUT_MS = 30_000

function toBlob(data: Uint8Array | string, mimeType: string): Blob {
  if (typeof data === "string") {
    return new Blob([data], { type: mimeType })
  }
  return new Blob([data], { type: mimeType })
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function parseHtmlToDocument(html: string, url: string): Document {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  const base = doc.createElement("base")
  base.href = url
  doc.head.appendChild(base)
  return doc
}

async function fetchWithTimeout(
  url: string,
  options?: HttpRequestOptions
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  )

  try {
    return await fetch(url, {
      method: options?.method ?? "GET",
      headers: options?.headers,
      body:
        options?.body instanceof Uint8Array
          ? options.body
          : options?.body,
      signal: controller.signal
    })
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export const browserStorageAdapter: StorageAdapter = {
  async get<T>(key: string): Promise<PlatformResult<T | null>> {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw === null) {
        return createSuccess(null)
      }
      return createSuccess(JSON.parse(raw) as T)
    } catch (err) {
      return createErrorResult(
        "unknown",
        `Failed to read storage key "${key}": ${err instanceof Error ? err.message : String(err)}`
      )
    }
  },

  async set<T>(key: string, value: T): Promise<PlatformResult<void>> {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
      return createSuccess(undefined)
    } catch (err) {
      return createErrorResult(
        "unknown",
        `Failed to write storage key "${key}": ${err instanceof Error ? err.message : String(err)}`
      )
    }
  },

  async remove(key: string): Promise<PlatformResult<void>> {
    try {
      window.localStorage.removeItem(key)
      return createSuccess(undefined)
    } catch (err) {
      return createErrorResult(
        "unknown",
        `Failed to remove storage key "${key}": ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}

export const browserClipboardAccess: ClipboardAccess = {
  async writeText(text: string): Promise<PlatformResult<void>> {
    try {
      await navigator.clipboard.writeText(text)
      return createSuccess(undefined)
    } catch (err) {
      return createErrorResult(
        "permission",
        `Clipboard write failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  },

  async writeImage(
    data: Uint8Array,
    mimeType: string
  ): Promise<PlatformResult<void>> {
    try {
      if (typeof ClipboardItem === "undefined") {
        return createErrorResult(
          "permission",
          "Clipboard image is not supported in this browser"
        )
      }

      const blob = new Blob([data], { type: mimeType })
      const item = new ClipboardItem({ [mimeType]: blob })
      await navigator.clipboard.write([item])
      return createSuccess(undefined)
    } catch (err) {
      return createErrorResult(
        "permission",
        `Clipboard image write failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}

export const browserFileDownloader: FileDownloader = {
  async download(
    data: Uint8Array | string,
    filename: string,
    mimeType: string
  ): Promise<PlatformResult<void>> {
    try {
      triggerDownload(toBlob(data, mimeType), filename)
      return createSuccess(undefined)
    } catch (err) {
      return createErrorResult(
        "unknown",
        `Download failed for "${filename}": ${err instanceof Error ? err.message : String(err)}`
      )
    }
  },

  async downloadWithDialog(
    data: Uint8Array | string,
    suggestedName: string,
    mimeType: string
  ): Promise<PlatformResult<void>> {
    try {
      triggerDownload(toBlob(data, mimeType), suggestedName)
      return createSuccess(undefined)
    } catch (err) {
      return createErrorResult(
        "unknown",
        `Download failed for "${suggestedName}": ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}

export const browserHttpClient: HttpClient = {
  async fetch(
    url: string,
    options?: HttpRequestOptions
  ): Promise<PlatformResult<HttpResponse>> {
    try {
      const response = await fetchWithTimeout(url, options)
      const body = await response.text()
      const headers: Record<string, string> = {}

      response.headers.forEach((value, key) => {
        headers[key] = value
      })

      return createSuccess({
        status: response.status,
        headers,
        body
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

export const browserContentExtractor: ContentExtractor = {
  async extractFromCurrentPage() {
    return createErrorResult(
      "not-found",
      "Browser fallback does not support extracting the current page from inside the desktop shell."
    )
  },

  async extractFromUrl(url: string) {
    try {
      const response = await fetchWithTimeout(url)
      if (!response.ok) {
        return createErrorResult(
          "network",
          `Failed to fetch ${url}: HTTP ${response.status}`
        )
      }

      const html = await response.text()
      const doc = parseHtmlToDocument(html, url)
      const article = new Readability(doc).parse()

      if (!article) {
        return createErrorResult(
          "unknown",
          "当前页面正文提取失败。请在普通网页中重试。"
        )
      }

      const turndown = createTurndownService()
      return createSuccess({
        title: article.title || doc.title || url,
        url,
        byline: article.byline || undefined,
        excerpt: article.excerpt || undefined,
        capturedAt: new Date().toISOString(),
        markdown: turndown.turndown(article.content || ""),
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

export const browserPlatform: PlatformProvider = {
  fileDownloader: browserFileDownloader,
  clipboard: browserClipboardAccess,
  storage: browserStorageAdapter,
  http: browserHttpClient,
  contentExtractor: browserContentExtractor
}
