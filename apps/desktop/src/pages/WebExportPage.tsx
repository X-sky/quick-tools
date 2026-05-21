import React, { useState } from "react"

import type { PlatformError, PlatformResult } from "@quick-tools/platform"
import { getPlatform } from "@quick-tools/platform"
import { buildDownloadFilename, buildFilenameBase } from "@quick-tools/web-export"
import { buildMarkdownDocument } from "@quick-tools/web-export"
import type { ExportFormat, MarkdownExportSource } from "@quick-tools/web-export"

export default function WebExportPage() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<PlatformError | null>(null)
  const [status, setStatus] = useState("")

  async function handleExport(format: ExportFormat) {
    if (!url.trim()) return

    setLoading(true)
    setError(null)
    setStatus("正在提取页面内容...")

    const platform = getPlatform()
    const result = await platform.contentExtractor.extractFromUrl(url.trim())

    if (!result.ok) {
      if (result.error.category === "timeout") {
        setError({
          category: "timeout",
          message: "请求超时，请检查网络连接后重试"
        })
      } else {
        setError(result.error)
      }
      setLoading(false)
      setStatus("")
      return
    }

    const source: MarkdownExportSource = result.value
    const markdown = buildMarkdownDocument(source)
    const filenameBase = buildFilenameBase(source)
    const filename = buildDownloadFilename(filenameBase, format)

    setStatus("正在保存文件...")

    const saveResult: PlatformResult<void> =
      await platform.fileDownloader.downloadWithDialog(
        markdown,
        filename,
        "text/markdown"
      )

    if (!saveResult.ok) {
      if (saveResult.error.category === "cancelled") {
        setStatus("")
        setError(null)
      } else {
        setError(saveResult.error)
      }
    } else {
      setStatus("导出完成")
    }

    setLoading(false)
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        Web Export
      </h2>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="输入要导出的网页 URL..."
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => void handleExport("markdown")}
          disabled={loading || !url.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
          导出 Markdown
        </button>
        <button
          onClick={() => void handleExport("pdf")}
          disabled={loading || !url.trim()}
          className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50">
          导出 PDF
        </button>
        <button
          onClick={() => void handleExport("png")}
          disabled={loading || !url.trim()}
          className="rounded bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50">
          导出 PNG
        </button>
      </div>
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error.category === "timeout"
            ? "⏱ " + error.message
            : error.message}
        </div>
      )}
      {status && !error && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
          {status}
        </div>
      )}
      <div className="flex-1 rounded border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          输入 URL 后选择导出格式
        </p>
      </div>
    </div>
  )
}
