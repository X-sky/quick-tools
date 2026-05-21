import type {
  PlatformError,
  PlatformErrorCategory,
  PlatformResult
} from "./types"

export const ERROR_CATEGORIES: readonly PlatformErrorCategory[] = [
  "network",
  "permission",
  "not-found",
  "timeout",
  "cancelled",
  "unknown"
]

export function createError(
  category: PlatformErrorCategory,
  message: string
): PlatformError {
  return { category, message }
}

export function createErrorResult<T>(
  category: PlatformErrorCategory,
  message: string
): PlatformResult<T> {
  return { ok: false, error: createError(category, message) }
}

export function createSuccess<T>(value: T): PlatformResult<T> {
  return { ok: true, value }
}
