/**
 * Mock PlatformProvider for E2E tests.
 */
import { registerPlatform } from "@quick-tools/platform"
import type {
  ClipboardAccess,
  ContentExtractor,
  ExtractedContent,
  FileDownloader,
  HttpClient,
  HttpRequestOptions,
  HttpResponse,
  PlatformResult,
  StorageAdapter
} from "@quick-tools/platform"
import { createErrorResult, createSuccess } from "@quick-tools/platform"

export const memoryStore = new Map<string, unknown>()
export const memoryClipboard: { text: string | null; image: Uint8Array | null } = {
  text: null,
  image: null
}
export const memoryDownloads: Array<{
  data: Uint8Array | string
  filename: string
  mimeType: string
  usedDialog: boolean
}> = []
export const memoryFileContents = new Map<string, string>()
export const memoryHttpHandlers = new Map<string, () => Promise<HttpResponse>>()

const storage: StorageAdapter = {
  async get<T>(key: string) {
    if (!memoryStore.has(key)) return createSuccess(null)
    return createSuccess(memoryStore.get(key) as T)
  },
  async set<T>(key: string, value: T) {
    memoryStore.set(key, value)
    return createSuccess(undefined)
  },
  async remove(key: string) {
    memoryStore.delete(key)
    return createSuccess(undefined)
  }
}

const clipboard: ClipboardAccess = {
  async writeText(text: string) {
    memoryClipboard.text = text
    return createSuccess(undefined)
  },
  async writeImage(data: Uint8Array, _mimeType: string) {
    memoryClipboard.image = data
    return createSuccess(undefined)
  }
}

const fileDownloader: FileDownloader = {
  async download(data, filename, mimeType) {
    memoryDownloads.push({ data, filename, mimeType, usedDialog: false })
    return createSuccess(undefined)
  },
  async downloadWithDialog(data, filename, mimeType) {
    memoryDownloads.push({ data, filename, mimeType, usedDialog: true })
    return createSuccess(undefined)
  }
}

const http: HttpClient = {
  async fetch(url: string, _options?: HttpRequestOptions): Promise<PlatformResult<HttpResponse>> {
    const handler = memoryHttpHandlers.get(url)
    if (!handler) {
      return createErrorResult("network", `No mock handler for ${url}`)
    }
    try {
      const response = await handler()
      return createSuccess(response)
    } catch (err) {
      return createErrorResult(
        "unknown",
        `Mock fetch failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}

const contentExtractor: ContentExtractor = {
  async extractFromCurrentPage() {
    return createErrorResult("not-found", "Mock does not support current-page extraction")
  },
  async extractFromUrl(url: string): Promise<PlatformResult<ExtractedContent>> {
    const handler = memoryHttpHandlers.get(url)
    if (!handler) {
      return createErrorResult("network", `No mock handler for ${url}`)
    }
    const res = await handler()
    if (res.status >= 400) {
      return createErrorResult("network", `Mock returned ${res.status} for ${url}`)
    }
    const html = res.body
    const titleMatch = html.match(/<title>([^<]*)<\/title>/)
    const title = titleMatch?.[1] ?? url
    const text = html
      .replace(/<script[\s\S]*?<\/script>/g, "")
      .replace(/<style[\s\S]*?<\/style>/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
    return createSuccess({
      title,
      url,
      capturedAt: new Date().toISOString(),
      markdown: `# ${title}\n\n${text}`,
      plainText: text
    })
  }
}

export const mockPlatform = {
  storage,
  clipboard,
  fileDownloader,
  http,
  contentExtractor
}

export function installMockPlatform(): void {
  memoryStore.clear()
  memoryClipboard.text = null
  memoryClipboard.image = null
  memoryDownloads.length = 0
  memoryFileContents.clear()
  memoryHttpHandlers.clear()
  registerPlatform(mockPlatform)
}
