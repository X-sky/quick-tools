import type { ExportFormat } from "./types"

export const MAX_EXPORT_HISTORY = 50

export interface ExportHistoryItem {
  url: string
  title: string
  format: ExportFormat
  timestamp: number
  /** Searchable text (title + url) */
  content: string
}

/** Newest first; a repeat export of the same url + format replaces the old entry. */
export function addExportHistoryItem(
  history: ExportHistoryItem[],
  item: ExportHistoryItem
): ExportHistoryItem[] {
  return [
    item,
    ...history.filter((h) => !(h.url === item.url && h.format === item.format))
  ].slice(0, MAX_EXPORT_HISTORY)
}

export function removeExportHistoryItem(
  history: ExportHistoryItem[],
  item: Pick<ExportHistoryItem, "url" | "format" | "timestamp">
): ExportHistoryItem[] {
  return history.filter(
    (h) =>
      !(
        h.url === item.url &&
        h.format === item.format &&
        h.timestamp === item.timestamp
      )
  )
}

/** Case-insensitive match on title or url. */
export function filterExportHistory(
  history: ExportHistoryItem[],
  query: string
): ExportHistoryItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return history
  return history.filter(
    (h) => h.title.toLowerCase().includes(q) || h.url.toLowerCase().includes(q)
  )
}

export interface BatchUrlLine {
  line: number
  content: string
  valid: boolean
  error?: string
}

/** One URL per line; blank lines are skipped, non-http(s) lines are invalid. */
export function parseBatchUrls(text: string): BatchUrlLine[] {
  const results: BatchUrlLine[] = []
  text.split("\n").forEach((raw, i) => {
    const content = raw.trim()
    if (!content) return
    const valid = content.startsWith("http://") || content.startsWith("https://")
    results.push({
      line: i + 1,
      content,
      valid,
      error: valid ? undefined : "URL 格式无效，必须以 http:// 或 https:// 开头"
    })
  })
  return results
}

/** Paged PNG file name: `<base>-p01.png` when there is more than one page. */
export function buildPageFilename(base: string, index: number, total: number): string {
  return total > 1
    ? `${base}-p${String(index + 1).padStart(2, "0")}.png`
    : `${base}.png`
}
