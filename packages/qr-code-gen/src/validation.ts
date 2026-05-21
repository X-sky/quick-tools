import type { HistoryItem } from "./types"

export function isValidHistoryItem(obj: unknown): obj is HistoryItem {
  if (typeof obj !== "object" || obj === null) return false
  const record = obj as Record<string, unknown>
  if (typeof record.content !== "string" || !record.content.trim()) return false
  if (record.timestamp != null && typeof record.timestamp !== "number")
    return false
  if (
    record.tags != null &&
    (!Array.isArray(record.tags) ||
      record.tags.some((t) => typeof t !== "string"))
  )
    return false
  return true
}
