import { useCallback, useState } from "react"

import { getPlatform } from "@quick-tools/platform"
import type { ExportFormat, MarkdownExportSource } from "@quick-tools/web-export"
import { buildDownloadFilename, buildFilenameBase, buildMarkdownDocument } from "@quick-tools/web-export"
import { open } from "@tauri-apps/plugin-dialog"
import { writeFile } from "@tauri-apps/plugin-fs"

import { BatchUrlPanel } from "~/components/BatchUrlPanel"
import type { BatchExportProgress, BatchExportResult } from "~/components/BatchUrlPanel"
import { HistoryPanel } from "~/components/HistoryPanel"
import { MarkdownPreview } from "~/components/MarkdownPreview"
import { ResizableSplitPane } from "~/components/ResizableSplitPane"
import { Toast } from "~/components/Toast"
import { useHistory } from "~/hooks/useHistory"
import { useToast } from "~/hooks/useToast"
import { renderToPdf, renderToPng } from "~/lib/pdf-png-renderer"
import { tauriContentExtractor } from "~/platform/content-extractor"

interface ExportHistoryItem {
  url: string
  title: string
  format: ExportFormat
  timestamp: number
  content: string
}

async function loadFonts(): Promise<{ body: ArrayBuffer; mono: ArrayBuffer }> {
  // Load fonts from the extension assets bundled in the public folder
  // Fallback: use fetch to load from a known path or generate minimal placeholder
  try {
    const [bodyRes, monoRes] = await Promise.all([
      fetch("/fonts/Arial Unicode.ttf"),
      fetch("/fonts/Courier New.ttf")
    ])
    if (bodyRes.ok && monoRes.ok) {
      return {
        body: await bodyRes.arrayBuffer(),
        mono: await monoRes.arrayBuffer()
      }
    }
  } catch {
    // fallback below
  }
  // Minimal fallback: create empty ArrayBuffers (rendering will be degraded)
  return { body: new ArrayBuffer(0), mono: new ArrayBuffer(0) }
}

export default function WebExportPage() {
  // Mode
  const [mode, setMode] = useState<"single" | "batch">("single")

  // Single mode state
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState<MarkdownExportSource | null>(null)
  const [previewMode, setPreviewMode] = useState<"rendered" | "source">("rendered")

  // Batch mode state
  const [batchProgress, setBatchProgress] = useState<BatchExportProgress | null>(null)

  // History
  const {
    items: historyItems,
    add: addHistory,
    remove: removeHistory,
    search: searchHistory
  } = useHistory<ExportHistoryItem>({ storageKey: "web-export-history" })
  const [historySearchQuery, setHistorySearchQuery] = useState("")

  // Toast
  const { toast, showToast, hideToast } = useToast()

  const filteredHistory = historySearchQuery
    ? searchHistory(historySearchQuery)
    : historyItems

  // --- Single mode handlers ---

  const handleExtract = useCallback(async () => {
    if (!url.trim()) return
    setLoading(true)
    setSource(null)

    const result = await tauriContentExtractor.extractFromUrl(url.trim())

    if (!result.ok) {
      if (result.error.category === "timeout") {
        showToast("请求超时，请检查网络连接后重试", "error")
      } else {
        showToast(`页面内容提取失败: ${result.error.message}`, "error")
      }
      setLoading(false)
      return
    }

    setSource(result.value as MarkdownExportSource)
    setLoading(false)
    showToast("内容提取成功", "success")
  }, [url, showToast])

  const handleExportMarkdown = useCallback(async () => {
    if (!source) return

    const markdown = buildMarkdownDocument(source)
    const filenameBase = buildFilenameBase(source)
    const filename = buildDownloadFilename(filenameBase, "markdown")

    const platform = getPlatform()
    const result = await platform.fileDownloader.downloadWithDialog(
      markdown,
      filename,
      "text/markdown"
    )

    if (result.ok) {
      showToast("Markdown 导出成功", "success")
      await addHistory({
        url: source.url,
        title: source.title,
        format: "markdown",
        timestamp: Date.now(),
        content: source.title + " " + source.url
      })
    } else if (result.error.category !== "cancelled") {
      showToast(`导出失败: ${result.error.message}`, "error")
    }
  }, [source, showToast, addHistory])

  const handleExportPdf = useCallback(async () => {
    if (!source) return

    try {
      const fonts = await loadFonts()
      const pdfBytes = await renderToPdf(
        source.markdown || source.plainText || "",
        source,
        { width: 794, pageSize: "A4", fonts }
      )

      const filenameBase = buildFilenameBase(source)
      const filename = buildDownloadFilename(filenameBase, "pdf")

      const platform = getPlatform()
      const result = await platform.fileDownloader.downloadWithDialog(
        pdfBytes,
        filename,
        "application/pdf"
      )

      if (result.ok) {
        showToast("PDF 导出成功", "success")
        await addHistory({
          url: source.url,
          title: source.title,
          format: "pdf",
          timestamp: Date.now(),
          content: source.title + " " + source.url
        })
      } else if (result.error.category !== "cancelled") {
        showToast(`导出失败: ${result.error.message}`, "error")
      }
    } catch (err) {
      showToast(
        `渲染失败: ${err instanceof Error ? err.message : String(err)}`,
        "error"
      )
    }
  }, [source, showToast, addHistory])

  const handleExportPng = useCallback(async () => {
    if (!source) return

    try {
      const fonts = await loadFonts()
      const pngBytes = await renderToPng(
        source.markdown || source.plainText || "",
        source,
        { width: 800, fonts }
      )

      const filenameBase = buildFilenameBase(source)
      const filename = buildDownloadFilename(filenameBase, "png")

      const platform = getPlatform()
      const result = await platform.fileDownloader.downloadWithDialog(
        pngBytes,
        filename,
        "image/png"
      )

      if (result.ok) {
        showToast("PNG 导出成功", "success")
        await addHistory({
          url: source.url,
          title: source.title,
          format: "png",
          timestamp: Date.now(),
          content: source.title + " " + source.url
        })
      } else if (result.error.category !== "cancelled") {
        showToast(`导出失败: ${result.error.message}`, "error")
      }
    } catch (err) {
      showToast(
        `渲染失败: ${err instanceof Error ? err.message : String(err)}`,
        "error"
      )
    }
  }, [source, showToast, addHistory])

  const handleCopyPng = useCallback(async () => {
    if (!source) return

    try {
      const fonts = await loadFonts()
      const pngBytes = await renderToPng(
        source.markdown || source.plainText || "",
        source,
        { width: 800, fonts }
      )

      const platform = getPlatform()
      const result = await platform.clipboard.writeImage(pngBytes, "image/png")

      if (result.ok) {
        showToast("PNG 已复制到剪贴板", "success")
      } else {
        showToast("剪贴板写入失败，请检查权限", "error")
      }
    } catch (err) {
      showToast(
        `渲染失败: ${err instanceof Error ? err.message : String(err)}`,
        "error"
      )
    }
  }, [source, showToast])

  // --- Batch mode handler ---

  const handleBatchExport = useCallback(
    async (urls: string[], format: ExportFormat) => {
      // Select output folder
      const folderPath = await open({ directory: true, title: "选择导出目录" })
      if (!folderPath) return

      const total = urls.length
      const results: BatchExportResult[] = []

      setBatchProgress({
        total,
        completed: 0,
        currentUrl: urls[0] || "",
        results: []
      })

      for (let i = 0; i < total; i++) {
        const currentUrl = urls[i]!
        setBatchProgress((prev) => prev ? {
          ...prev,
          currentUrl,
          completed: i
        } : null)

        try {
          const extractResult = await tauriContentExtractor.extractFromUrl(currentUrl)

          if (!extractResult.ok) {
            results.push({
              url: currentUrl,
              success: false,
              error: extractResult.error.message
            })
            continue
          }

          const extractedSource = extractResult.value as MarkdownExportSource
          const filenameBase = buildFilenameBase(extractedSource)
          let fileData: Uint8Array | string
          let filename: string

          if (format === "markdown") {
            fileData = buildMarkdownDocument(extractedSource)
            filename = buildDownloadFilename(filenameBase, "markdown")
          } else {
            const fonts = await loadFonts()
            if (format === "pdf") {
              fileData = await renderToPdf(
                extractedSource.markdown || extractedSource.plainText || "",
                extractedSource,
                { width: 794, pageSize: "A4", fonts }
              )
              filename = buildDownloadFilename(filenameBase, "pdf")
            } else {
              fileData = await renderToPng(
                extractedSource.markdown || extractedSource.plainText || "",
                extractedSource,
                { width: 800, fonts }
              )
              filename = buildDownloadFilename(filenameBase, "png")
            }
          }

          const filePath = `${folderPath}/${filename}`
          const bytes = typeof fileData === "string"
            ? new TextEncoder().encode(fileData)
            : fileData

          await writeFile(filePath, bytes)

          results.push({
            url: currentUrl,
            success: true,
            title: extractedSource.title
          })

          // Add to history
          await addHistory({
            url: currentUrl,
            title: extractedSource.title,
            format,
            timestamp: Date.now(),
            content: extractedSource.title + " " + currentUrl
          })
        } catch (err) {
          results.push({
            url: currentUrl,
            success: false,
            error: err instanceof Error ? err.message : String(err)
          })
        }
      }

      setBatchProgress({
        total,
        completed: total,
        currentUrl: "",
        results
      })

      const successCount = results.filter((r) => r.success).length
      const failCount = results.filter((r) => !r.success).length

      if (failCount === 0) {
        showToast(`导出完成：成功 ${successCount} 个`, "success")
      } else {
        showToast(`导出完成：成功 ${successCount} 个，失败 ${failCount} 个`, "error")
      }
    },
    [showToast, addHistory]
  )

  // --- History handlers ---

  const handleHistorySelect = useCallback((item: ExportHistoryItem) => {
    setUrl(item.url)
    setMode("single")
  }, [])

  const handleHistoryDelete = useCallback(
    async (index: number) => {
      await removeHistory(index)
    },
    [removeHistory]
  )

  // --- Render ---

  const leftPanel = (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-stone-800 dark:text-stone-100">
          Web Export
        </h2>
        <div className="mode-toggle">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={mode === "single" ? "mode-toggle-item-active" : "mode-toggle-item"}>
            单个模式
          </button>
          <button
            type="button"
            onClick={() => setMode("batch")}
            className={mode === "batch" ? "mode-toggle-item-active" : "mode-toggle-item"}>
            批量模式
          </button>
        </div>
      </div>

      {mode === "single" ? (
        <div className="flex flex-1 flex-col gap-4">
          {/* URL Input */}
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="输入要导出的网页 URL..."
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleExtract()
              }}
              className="input-field flex-1"
            />
            <button
              type="button"
              onClick={() => void handleExtract()}
              disabled={loading || !url.trim()}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? "提取中..." : "提取"}
            </button>
          </div>

          {/* Export buttons */}
          {source && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleExportMarkdown()}
                className="btn-secondary">
                导出 Markdown
              </button>
              <button
                type="button"
                onClick={() => void handleExportPdf()}
                className="btn-secondary">
                导出 PDF
              </button>
              <button
                type="button"
                onClick={() => void handleExportPng()}
                className="btn-secondary">
                导出 PNG
              </button>
              <button
                type="button"
                onClick={() => void handleCopyPng()}
                className="btn-ghost">
                复制 PNG 到剪贴板
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Batch Mode */
        <BatchUrlPanel
          onBatchExport={handleBatchExport}
          progress={batchProgress}
        />
      )}
    </div>
  )

  const rightPanel = (
    <MarkdownPreview
      source={source}
      mode={previewMode}
      onModeChange={setPreviewMode}
    />
  )

  return (
    <div className="flex h-full">
      {/* Main content area with split pane */}
      <div className="flex-1">
        <ResizableSplitPane
          left={leftPanel}
          right={rightPanel}
          defaultRatio={0.4}
          minRatio={0.25}
          maxRatio={0.7}
        />
      </div>

      {/* History sidebar */}
      <HistoryPanel<ExportHistoryItem>
        items={filteredHistory}
        searchQuery={historySearchQuery}
        onSearchChange={setHistorySearchQuery}
        onSelect={handleHistorySelect}
        onDelete={handleHistoryDelete}
        title="导出历史"
        renderItem={(item) => (
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium">
              {item.title || item.url}
            </span>
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-700">
                {item.format === "markdown"
                  ? "MD"
                  : item.format.toUpperCase()}
              </span>
              <span>
                {new Date(item.timestamp).toLocaleString("zh-CN", {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
            </div>
          </div>
        )}
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}
    </div>
  )
}
