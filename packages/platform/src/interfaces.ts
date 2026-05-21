import type {
  ExtractedContent,
  HttpRequestOptions,
  HttpResponse,
  PlatformResult
} from "./types"

export interface FileDownloader {
  download(
    data: Uint8Array | string,
    filename: string,
    mimeType: string
  ): Promise<PlatformResult<void>>
  downloadWithDialog(
    data: Uint8Array | string,
    suggestedName: string,
    mimeType: string
  ): Promise<PlatformResult<void>>
}

export interface ClipboardAccess {
  writeText(text: string): Promise<PlatformResult<void>>
  writeImage(data: Uint8Array, mimeType: string): Promise<PlatformResult<void>>
}

export interface StorageAdapter {
  get<T>(key: string): Promise<PlatformResult<T | null>>
  set<T>(key: string, value: T): Promise<PlatformResult<void>>
  remove(key: string): Promise<PlatformResult<void>>
}

export interface HttpClient {
  fetch(
    url: string,
    options?: HttpRequestOptions
  ): Promise<PlatformResult<HttpResponse>>
}

export interface ContentExtractor {
  extractFromCurrentPage(): Promise<PlatformResult<ExtractedContent>>
  extractFromUrl(url: string): Promise<PlatformResult<ExtractedContent>>
}

export interface PlatformProvider {
  fileDownloader: FileDownloader
  clipboard: ClipboardAccess
  storage: StorageAdapter
  http: HttpClient
  contentExtractor: ContentExtractor
}
