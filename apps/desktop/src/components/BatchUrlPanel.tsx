import { useState } from "react"

import { parseBatchUrls } from "~/lib/batch-parser"

export type ExportFormat = "markdown" | "pdf" | "png"

export interface BatchExportProgress {
  total: number
  completed: number
  currentUrl: string
  results: BatchExportResult[]
}

export interface BatchExportResult {
  url: string
  success: boolean
  title?: string
  error?: string
}

interface BatchUrlPanelProps {
  onBatchExport: (urls: string[], format: ExportFormat) => void
  progress?: BatchExportProgress | null
}

export const BatchUrlPanel = ({
  onBatchExport,
  progress
}: BatchUrlPanelProps) => {
  const [urlText, setUrlText] = useState("")
  const [format, setFormat] = useState<ExportFormat>("markdown")

  const isExporting = progress !== null && progress !== undefined &&
    progress.completed < progress.total

  const handleExport = () => {
    const parsed = parseBatchUrls(urlText)
    const validUrls = parsed.filter((r) => r.valid).map((r) => r.content)
    if (validUrls.length === 0) return
    onBatchExport(validUrls, format)
  }

  const parsed = urlText.trim() ? parseBatchUrls(urlText) : []
  const validCount = parsed.filter((r) => r.valid).length
  const invalidCount = parsed.filter((r) => !r.valid).length

  const showResults = progress && progress.completed === progress.total &&
    progress.results.length > 0

  const successCount = progress?.results.filter((r) => r.success).length ?? 0
  const failureCount = progress?.results.filter((r) => !r.success).length ?? 0
  const failedResults = progress?.results.filter((r) => !r.success) ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          批量 URL 输入（每行一个）
        </label>
        <textarea
          value={urlText}
          onChange={(e) => setUrlText(e.target.value)}
          placeholder={"https://example.com/page1\nhttps://example.com/page2\nhttps://example.com/page3"}
          rows={8}
          disabled={isExporting}
          className="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-700 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
        />
        {parsed.length > 0 && (
          <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>共 {parsed.length} 个 URL</span>
            <span className="text-green-600 dark:text-green-400">
              有效 {validCount}
            </span>
            {invalidCount > 0 && (
              <span className="text-red-500 dark:text-red-400">
                无效 {invalidCount}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          导出格式
        </label>
        <div className="flex gap-4">
          {(["markdown", "pdf", "png"] as const).map((f) => (
            <label
              key={f}
              className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="export-format"
                value={f}
                checked={format === f}
                onChange={() => setFormat(f)}
                disabled={isExporting}
                className="text-blue-500 focus:ring-blue-400"
              />
              {f === "markdown" ? "Markdown" : f.toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting || validCount === 0}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600">
        {isExporting ? "导出中..." : "批量导出"}
      </button>

      {isExporting && progress && (
        <div className="flex flex-col gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/30">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-blue-700 dark:text-blue-300">
              导出进度
            </span>
            <span className="text-blue-600 dark:text-blue-400">
              {progress.completed} / {progress.total}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-blue-800">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{
                width: `${(progress.completed / progress.total) * 100}%`
              }}
            />
          </div>
          <div className="truncate text-xs text-blue-600 dark:text-blue-400">
            正在处理: {progress.currentUrl}
          </div>
        </div>
      )}

      {showResults && progress && (
        <div className="flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            导出完成
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-green-600 dark:text-green-400">
              成功 {successCount} 个
            </span>
            {failureCount > 0 && (
              <span className="text-red-500 dark:text-red-400">
                失败 {failureCount} 个
              </span>
            )}
          </div>
          {failedResults.length > 0 && (
            <div className="mt-1 flex flex-col gap-1">
              <div className="text-xs font-medium text-red-500 dark:text-red-400">
                失败列表:
              </div>
              <ul className="space-y-1">
                {failedResults.map((r, i) => (
                  <li
                    key={i}
                    className="flex flex-col gap-0.5 rounded bg-red-50 px-2 py-1 dark:bg-red-900/20">
                    <span className="truncate text-xs text-gray-700 dark:text-gray-300">
                      {r.url}
                    </span>
                    {r.error && (
                      <span className="text-xs text-red-500 dark:text-red-400">
                        {r.error}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
