export type {
  HttpRequestOptions,
  HttpResponse,
  ExtractedContent,
  PlatformErrorCategory,
  PlatformError,
  PlatformResult
} from "./types"

export type {
  FileDownloader,
  ClipboardAccess,
  StorageAdapter,
  HttpClient,
  ContentExtractor,
  PlatformProvider
} from "./interfaces"

export { ERROR_CATEGORIES, createError, createErrorResult, createSuccess } from "./errors"

export { registerPlatform, getPlatform } from "./registry"
