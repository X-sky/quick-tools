import type { HistoryItem } from "./types"

export const MAX_HISTORY_ITEMS = 50

/**
 * Put `content` at the top of the history. An existing entry with the same
 * content is replaced; its tags are kept and merged with `tags`.
 */
export function upsertHistoryItem(
  history: HistoryItem[],
  content: string,
  options: { tags?: string[]; timestamp?: number } = {}
): HistoryItem[] {
  const trimmed = content.trim()
  if (!trimmed) return history
  const existing = history.find((item) => item.content === trimmed)
  const tags = [...new Set([...(existing?.tags ?? []), ...(options.tags ?? [])])]
  const next: HistoryItem = {
    content: trimmed,
    timestamp: options.timestamp ?? Date.now(),
    tags
  }
  return [next, ...history.filter((item) => item.content !== trimmed)].slice(
    0,
    MAX_HISTORY_ITEMS
  )
}

export function removeHistoryItem(
  history: HistoryItem[],
  content: string
): HistoryItem[] {
  return history.filter((item) => item.content !== content)
}

export function addTagToHistoryItem(
  history: HistoryItem[],
  content: string,
  tag: string
): HistoryItem[] {
  const trimmedTag = tag.trim()
  if (!trimmedTag) return history
  return history.map((item) =>
    item.content === content
      ? { ...item, tags: [...new Set([...(item.tags ?? []), trimmedTag])] }
      : item
  )
}

export function removeTagFromHistoryItem(
  history: HistoryItem[],
  content: string,
  tag: string
): HistoryItem[] {
  return history.map((item) =>
    item.content === content
      ? { ...item, tags: (item.tags ?? []).filter((t) => t !== tag) }
      : item
  )
}

/** All distinct tags used in the history, sorted. */
export function collectHistoryTags(history: HistoryItem[]): string[] {
  return Array.from(new Set(history.flatMap((item) => item.tags ?? []))).sort()
}

/**
 * Filter history by tag (exact) and by a case-insensitive substring query on
 * the content. Both filters are optional and combine with AND.
 */
export function filterHistoryItems<T extends { content: string; tags?: string[] }>(
  items: T[],
  filter: { query?: string; tag?: string | null } = {}
): T[] {
  const query = filter.query?.trim().toLowerCase() ?? ""
  const tag = filter.tag ?? null
  return items.filter(
    (item) =>
      (!tag || (item.tags ?? []).includes(tag)) &&
      (!query || item.content.toLowerCase().includes(query))
  )
}

/** Local-date stamp `YYYY-MM-DD` used in exported file names. */
export function formatExportDate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function historyExportFilename(date: Date = new Date()): string {
  return `qrcode-history-${formatExportDate(date)}.json`
}

export function templateExportFilename(date: Date = new Date()): string {
  return `qrcode-templates-${formatExportDate(date)}.json`
}

/** File name for a saved QR image, e.g. `qr-hello_world.png`. */
export function qrImageFilename(
  content: string,
  ext: "png" | "svg",
  prefix = "qr"
): string {
  const slug = content.slice(0, 20).replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "_")
  return `${prefix}-${slug}.${ext}`
}
