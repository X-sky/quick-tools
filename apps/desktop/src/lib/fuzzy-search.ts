/**
 * Character-by-character fuzzy matching.
 * Each character of query must appear in order in target (case-insensitive).
 */
export function fuzzyMatch(query: string, target: string): boolean {
  if (query.length === 0) return true
  if (query.length > target.length) return false

  const lowerQuery = query.toLowerCase()
  const lowerTarget = target.toLowerCase()

  let queryIndex = 0

  for (let i = 0; i < lowerTarget.length; i++) {
    if (lowerTarget[i] === lowerQuery[queryIndex]) {
      queryIndex++
      if (queryIndex === lowerQuery.length) return true
    }
  }

  return false
}

/**
 * Filter items using fuzzy matching against a label extracted from each item.
 * Returns items whose label fuzzy-matches the query, preserving original order.
 */
export function fuzzySearch<T>(
  query: string,
  items: T[],
  getLabel: (item: T) => string
): T[] {
  if (query.length === 0) return items
  return items.filter((item) => fuzzyMatch(query, getLabel(item)))
}
