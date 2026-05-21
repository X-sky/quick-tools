export interface HttpRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  headers?: Record<string, string>
  body?: string | Uint8Array
  timeoutMs?: number
}

export interface HttpResponse {
  status: number
  headers: Record<string, string>
  body: string
  bodyBytes?: Uint8Array
}

export interface ExtractedContent {
  title: string
  url: string
  byline?: string
  excerpt?: string
  capturedAt: string
  markdown: string
  plainText: string
}

export type PlatformErrorCategory =
  | "network"
  | "permission"
  | "not-found"
  | "timeout"
  | "cancelled"
  | "unknown"

export interface PlatformError {
  category: PlatformErrorCategory
  message: string
}

export type PlatformResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: PlatformError }
