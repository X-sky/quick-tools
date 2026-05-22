export function filterHistory<T extends { content: string }>(
  items: T[],
  query: string
): T[] {
  if (!query.trim()) return items
  const lower = query.toLowerCase()
  return items.filter((item) => item.content.toLowerCase().includes(lower))
}
