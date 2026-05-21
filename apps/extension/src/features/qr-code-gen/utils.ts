import { exportHistoryData, mergeHistory, parseHistoryImport } from "@quick-tools/qr-code-gen"
import type { HistoryItem } from "@quick-tools/qr-code-gen"

export { mergeHistory }

export const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })
}

function formatFileDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function exportHistoryToFile(history: HistoryItem[]): void {
  const json = exportHistoryData(history)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `qrcode-history-${formatFileDate()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importHistoryFromFile(
  file: File
): Promise<{ imported: HistoryItem[]; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = parseHistoryImport(reader.result as string)
      if (result.error) {
        resolve({ imported: [], error: result.error })
      } else {
        resolve({ imported: result.items })
      }
    }
    reader.onerror = () => {
      resolve({ imported: [], error: "读取文件失败" })
    }
    reader.readAsText(file)
  })
}
