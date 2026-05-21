/**
 * Format a value as pretty-printed JSON.
 *
 * @param value - Any JSON-serializable value
 * @param indent - Number of spaces for indentation (default: 2)
 * @returns Formatted JSON string
 */
export function formatJson(value: unknown, indent?: number): string {
  return JSON.stringify(value, null, indent ?? 2)
}

/**
 * Minify a value to compact JSON with no extra whitespace.
 *
 * @param value - Any JSON-serializable value
 * @returns Compact JSON string
 */
export function minifyJson(value: unknown): string {
  return JSON.stringify(value)
}
