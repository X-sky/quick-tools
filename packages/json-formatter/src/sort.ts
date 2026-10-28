/**
 * Recursively sort object keys (locale-aware, ascending). Arrays keep their
 * element order; only the objects inside them are sorted.
 */
export function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonKeys(item))
  }
  if (value && typeof value === "object") {
    const sortedEntries = Object.entries(value as Record<string, unknown>)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, val]) => [key, sortJsonKeys(val)])
    return Object.fromEntries(sortedEntries)
  }
  return value
}
