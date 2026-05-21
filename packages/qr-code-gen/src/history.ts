import type { HistoryItem } from "./types"
import { isValidHistoryItem } from "./validation"

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

export function exportHistoryData(history: HistoryItem[]): string {
  const exportData = history.map(({ content, timestamp, tags }) => ({
    content,
    timestamp,
    ...(tags && tags.length > 0 ? { tags } : {})
  }))
  return JSON.stringify(exportData, null, 2)
}

export function parseHistoryImport(
  jsonString: string
): { items: HistoryItem[]; error?: string } {
  try {
    const data = JSON.parse(jsonString)
    if (!Array.isArray(data)) {
      return { items: [], error: "文件格式不正确，应为 JSON 数组" }
    }
    const valid = data.filter(isValidHistoryItem)
    if (valid.length === 0) {
      return { items: [], error: "文件中没有找到有效的地址记录" }
    }
    return { items: valid }
  } catch {
    return { items: [], error: "文件内容不是有效的 JSON 格式" }
  }
}
