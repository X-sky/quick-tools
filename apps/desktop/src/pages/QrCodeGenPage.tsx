import React, { useState } from "react"

import type { PlatformError } from "@quick-tools/platform"
import {
  exportHistoryData,
  mergeHistory,
  parseHistoryImport
} from "@quick-tools/qr-code-gen"
import type { HistoryItem } from "@quick-tools/qr-code-gen"

export default function QrCodeGenPage() {
  const [content, setContent] = useState("")
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [error, setError] = useState<PlatformError | null>(null)

  function handleGenerate() {
    if (!content.trim()) return
    const newItem: HistoryItem = {
      content: content.trim(),
      timestamp: Date.now()
    }
    setHistory((prev) => mergeHistory(prev, [newItem]))
    setError(null)
  }

  function handleExport() {
    const data = exportHistoryData(history)
    void navigator.clipboard.writeText(data).catch(() => {
      setError({
        category: "cancelled",
        message: "导出历史记录失败"
      })
    })
  }

  function handleImport(jsonString: string) {
    const result = parseHistoryImport(jsonString)
    if (result.error) {
      setError({
        category: "unknown",
        message: result.error
      })
      return
    }
    setHistory((prev) => mergeHistory(prev, result.items))
    setError(null)
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        QR Code Generator
      </h2>
      <div className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="输入要生成二维码的内容..."
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        />
        <button
          onClick={handleGenerate}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
          生成
        </button>
      </div>
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error.message}
        </div>
      )}
      <div className="flex-1 rounded border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {history.length > 0
            ? `历史记录: ${history.length} 条`
            : "暂无历史记录"}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          disabled={history.length === 0}
          className="rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50">
          导出历史
        </button>
      </div>
    </div>
  )
}
