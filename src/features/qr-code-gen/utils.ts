import type { HistoryItem } from "./types"

export const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })
}

const MAX_HISTORY = 50

function buildContentMap(items: HistoryItem[]): Map<string, HistoryItem> {
  const map = new Map<string, HistoryItem>()
  for (const item of items) {
    map.set(item.content, item)
  }
  return map
}

export function mergeHistory(
  existing: HistoryItem[],
  imported: HistoryItem[]
): HistoryItem[] {
  const map = buildContentMap(existing)

  for (const item of imported) {
    const content = (item.content ?? "").trim()
    if (!content) continue

    const existingItem = map.get(content)
    if (existingItem) {
      const mergedTags = [
        ...new Set([...(existingItem.tags || []), ...(item.tags || [])])
      ]
      map.set(content, {
        content,
        timestamp: Math.max(existingItem.timestamp, item.timestamp || 0),
        tags: mergedTags
      })
    } else {
      map.set(content, {
        content,
        timestamp: item.timestamp || Date.now(),
        tags: item.tags || []
      })
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_HISTORY)
}

function formatFileDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function exportHistoryToFile(history: HistoryItem[]): void {
  const exportData = history.map(({ content, timestamp, tags }) => ({
    content,
    timestamp,
    ...(tags && tags.length > 0 ? { tags } : {})
  }))
  const json = JSON.stringify(exportData, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `qrcode-history-${formatFileDate()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function isValidHistoryItem(obj: unknown): obj is HistoryItem {
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

export function importHistoryFromFile(
  file: File
): Promise<{ imported: HistoryItem[]; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        if (!Array.isArray(data)) {
          resolve({ imported: [], error: "文件格式不正确，应为 JSON 数组" })
          return
        }
        const valid = data.filter(isValidHistoryItem)
        if (valid.length === 0) {
          resolve({ imported: [], error: "文件中没有找到有效的地址记录" })
          return
        }
        resolve({ imported: valid })
      } catch {
        resolve({ imported: [], error: "文件内容不是有效的 JSON 格式" })
      }
    }
    reader.onerror = () => {
      resolve({ imported: [], error: "读取文件失败" })
    }
    reader.readAsText(file)
  })
}
