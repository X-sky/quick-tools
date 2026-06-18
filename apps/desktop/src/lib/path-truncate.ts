/**
 * Path truncation utility for StatusStrip display.
 *
 * Preserves the first directory segment and the final filename segment.
 * If the path has more than 3 segments and exceeds the available width
 * (maxLength), middle segments are replaced with "…".
 */

const PATH_SEPARATOR_REGEX = /[/\\]/

/**
 * Truncates a file path for display, preserving the first directory segment
 * and the final filename segment.
 *
 * @param path - The file path string to truncate
 * @param maxLength - Maximum character length for the displayed path
 * @returns The truncated path string
 */
export function truncatePath(path: string, maxLength: number): string {
  // Edge case: empty string
  if (!path) return ""

  // If path fits within maxLength, return as-is
  if (path.length <= maxLength) return path

  // Determine the separator used in this path
  const separator = path.includes("\\") ? "\\" : "/"

  // Split path into segments, filtering out empty strings from leading separators
  const segments = path.split(PATH_SEPARATOR_REGEX).filter(Boolean)

  // Determine if path has a leading separator (absolute path)
  const hasLeadingSeparator = path.startsWith("/") || path.startsWith("\\")

  // Single segment (filename only) — can't truncate meaningfully
  if (segments.length <= 1) return path

  // 3 or fewer segments — can't truncate meaningfully (no middle to replace)
  if (segments.length <= 3) return path

  // Build truncated path: first segment + "…" + last segment
  const first = segments[0]
  const last = segments[segments.length - 1]
  const prefix = hasLeadingSeparator ? separator : ""
  const truncated = `${prefix}${first}${separator}…${separator}${last}`

  return truncated
}
