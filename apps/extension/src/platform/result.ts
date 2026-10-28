import type { PlatformError, PlatformResult } from "@quick-tools/platform"

// The extension compiles without strictNullChecks, where `result.ok` does not
// narrow the PlatformResult union; read the error through this guard instead.
export function getResultError<T>(
  result: PlatformResult<T>
): PlatformError | null {
  return "error" in result ? result.error : null
}

/** Error message to show the user, or null when the result is ok or cancelled. */
export function getVisibleError<T>(result: PlatformResult<T>): string | null {
  const error = getResultError(result)
  if (!error || error.category === "cancelled") return null
  return error.message
}
