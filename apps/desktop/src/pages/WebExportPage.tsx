import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { getPlatform } from "@quick-tools/platform"
import type {
  ExportFormat,
  ExportHistoryItem,
  MarkdownExportSource,
  PngPreflight
} from "@quick-tools/web-export"
import { filterExportHistory } from "@quick-tools/web-export"
import type { OversizedPngChoice } from "@quick-tools/web-export-dom"
import {
  describeExportResult,
  ExportCancelledError,
  exportArticle,
  renderArticlePng
} from "@quick-tools/web-export-dom"
import {
  Globe,
  FileText,
  FilePdf,
  Image,
  Copy
} from "@phosphor-icons/react"

import { BatchUrlPanel } from "~/components/BatchUrlPanel"
import type { BatchExportProgress, BatchExportResult } from "~/components/BatchUrlPanel"
import { HistoryPanel } from "~/components/HistoryPanel"
import { MarkdownPreview } from "~/components/MarkdownPreview"
import { ResizableSplitPane } from "~/components/ResizableSplitPane"
import { Toast } from "~/components/Toast"
import type { CommandAction } from "~/components/shell/CommandBar"
import { useExportHistory } from "~/hooks/useExportHistory"
import { useToast } from "~/hooks/useToast"
import { getImageFetcher, saveExportFiles, writeFilesToFolder } from "~/lib/web-export-io"
import { isTauriRuntime } from "~/platform"
import type { PageShellProps } from "~/types/page-shell"

interface OversizedPrompt {
  preflight: PngPreflight
  resolve: (choice: OversizedPngChoice) => void
}

export default function WebExportPage({
  onActionsChange,
  onStatusChange,
  onToast
}: PageShellProps = {}) {
  // Mode
  const [mode, setMode] = useState<"single" | "batch">("single")

  // Single mode state
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [busyMessage, setBusyMessage] = useState<string | null>(null)
  const [source, setSource] = useState<MarkdownExportSource | null>(null)
  const [previewMode, setPreviewMode] = useState<"rendered" | "source">("rendered")
  const [oversizedPrompt, setOversizedPrompt] = useState<OversizedPrompt | null>(null)

  // Batch mode state
  const [batchProgress, setBatchProgress] = useState<BatchExportProgress | null>(null)

  // History
  const history = useExportHistory()
  const [historySearchQuery, setHistorySearchQuery] = useState("")

  // Toast
  const { toast, showToast, hideToast } = useToast()

  // Unified notify: prefer shell toast, fall back to local toast.
  const notify = useCallback(
    (
      message: string,
      type: "success" | "error" | "warning" | "info"
    ) => {
      if (onToast) {
        onToast({ type, title: message })
      } else {
        showToast(message, type === "warning" ? "info" : type)
      }
    },
    [onToast, showToast]
  )

  const filteredHistory = useMemo(
    () => filterExportHistory(history.items, historySearchQuery),
    [history.items, historySearchQuery]
  )

  const askOversizedPng = useCallback(
    (preflight: PngPreflight) =>
      new Promise<OversizedPngChoice>((resolve) => {
        setOversizedPrompt({ preflight, resolve })
      }),
    []
  )

  const answerOversized = useCallback(
    (choice: OversizedPngChoice) => {
      oversizedPrompt?.resolve(choice)
      setOversizedPrompt(null)
    },
    [oversizedPrompt]
  )

  const recordHistory = useCallback(
    (article: MarkdownExportSource, format: ExportFormat) =>
      history.add({
        url: article.url,
        title: article.title,
        format,
        timestamp: Date.now(),
        content: `${article.title} ${article.url}`
      }),
    [history]
  )

  // --- Single mode handlers ---

  const extract = useCallback(
    async (targetUrl: string) => {
      if (!targetUrl.trim()) return
      setLoading(true)
      setSource(null)

      // Routed through the platform: Tauri uses plugin-http, the browser
      // fallback uses fetch and may hit CORS on some sites.
      const result = await getPlatform().contentExtractor.extractFromUrl(
        targetUrl.trim()
      )
      setLoading(false)

      if (!result.ok) {
        if (result.error.category === "timeout") {
          notify("请求超时，请检查网络连接后重试", "error")
        } else {
          notify(`页面内容提取失败: ${result.error.message}`, "error")
        }
        return
      }

      setSource(result.value as MarkdownExportSource)
      notify("内容提取成功", "success")
    },
    [notify]
  )

  const handleExtract = useCallback(() => extract(url), [extract, url])

  const busyRef = useRef(false)

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!source || busyRef.current) return
      busyRef.current = true
      try {
        const result = await exportArticle(source, format, {
          fetchImage: getImageFetcher(),
          onProgress: setBusyMessage,
          onOversizedPng: askOversizedPng
        })
        setBusyMessage(null)
        const saved = await saveExportFiles(result.files)
        if (saved.status === "saved") {
          notify(describeExportResult(result), result.imageFailures > 0 ? "warning" : "success")
          await recordHistory(source, result.format)
        } else if (saved.status === "error") {
          notify(`导出失败: ${saved.message}`, "error")
        }
      } catch (err) {
        if (!(err instanceof ExportCancelledError)) {
          notify(
            `渲染失败: ${err instanceof Error ? err.message : String(err)}`,
            "error"
          )
        }
      } finally {
        busyRef.current = false
        setBusyMessage(null)
      }
    },
    [source, askOversizedPng, notify, recordHistory]
  )

  const handleCopyPng = useCallback(async () => {
    if (!source || busyRef.current) return
    busyRef.current = true
    try {
      const { bytes, imageFailures } = await renderArticlePng(source, {
        fetchImage: getImageFetcher(),
        onProgress: setBusyMessage
      })
      const result = await getPlatform().clipboard.writeImage(bytes, "image/png")
      if (result.ok) {
        notify(
          imageFailures > 0
            ? "PNG 已复制到剪贴板，部分图片未成功嵌入"
            : "PNG 已复制到剪贴板",
          imageFailures > 0 ? "warning" : "success"
        )
      } else {
        notify("剪贴板写入失败，请检查权限", "error")
      }
    } catch (err) {
      notify(
        `渲染失败: ${err instanceof Error ? err.message : String(err)}`,
        "error"
      )
    } finally {
      busyRef.current = false
      setBusyMessage(null)
    }
  }, [source, notify])

  // --- Batch mode handler ---

  const handleBatchExport = useCallback(
    async (urls: string[], format: ExportFormat) => {
      const platform = getPlatform()
      const isTauri = isTauriRuntime()

      let folderPath: string | null = null
      if (isTauri) {
        const { open: openDialog } = await import("@tauri-apps/plugin-dialog")
        const picked = await openDialog({ directory: true, title: "选择导出目录" })
        if (!picked || Array.isArray(picked)) return
        folderPath = picked
      } else {
        notify("浏览器模式不支持选择目录，文件将下载到默认下载目录。", "info")
      }

      const total = urls.length
      const results: BatchExportResult[] = []
      setBatchProgress({ total, completed: 0, currentUrl: urls[0] || "", results: [] })

      for (let i = 0; i < total; i++) {
        const currentUrl = urls[i]!
        setBatchProgress((prev) =>
          prev ? { ...prev, currentUrl, completed: i } : null
        )

        try {
          const extracted = await platform.contentExtractor.extractFromUrl(currentUrl)
          if (!extracted.ok) {
            results.push({ url: currentUrl, success: false, error: extracted.error.message })
            continue
          }
          const article = extracted.value as MarkdownExportSource
          // Batch runs unattended: oversized PNGs are written as paged files.
          const exported = await exportArticle(article, format, {
            fetchImage: getImageFetcher()
          })

          if (folderPath) {
            const saved = await writeFilesToFolder(folderPath, exported.files)
            if (saved.status === "error") throw new Error(saved.message)
          } else {
            for (const file of exported.files) {
              const dl = await platform.fileDownloader.download(
                file.bytes,
                file.filename,
                file.mimeType
              )
              if (!dl.ok && dl.error.category !== "cancelled") {
                throw new Error(dl.error.message)
              }
            }
          }

          results.push({ url: currentUrl, success: true, title: article.title })
          await recordHistory(article, exported.format)
        } catch (err) {
          results.push({
            url: currentUrl,
            success: false,
            error: err instanceof Error ? err.message : String(err)
          })
        }
      }

      setBatchProgress({ total, completed: total, currentUrl: "", results })

      const successCount = results.filter((r) => r.success).length
      const failCount = results.length - successCount
      if (failCount === 0) {
        notify(`导出完成：成功 ${successCount} 个`, "success")
      } else {
        notify(`导出完成：成功 ${successCount} 个，失败 ${failCount} 个`, "error")
      }
    },
    [notify, recordHistory]
  )

  // --- History handlers ---

  const handleHistorySelect = useCallback(
    (item: ExportHistoryItem) => {
      setUrl(item.url)
      setMode("single")
      void extract(item.url)
    },
    [extract]
  )

  const handleHistoryDelete = useCallback(
    (item: ExportHistoryItem) => {
      void history.remove(item)
    },
    [history]
  )

  // ─── Expose CommandBar actions to the shell ───────────────────────────────

  const busy = busyMessage !== null
  const commandActions: CommandAction[] = useMemo(() => {
    const actions: CommandAction[] = [
      {
        id: "web-extract",
        icon: Globe,
        label: "提取",
        group: "primary",
        disabled: loading || !url.trim(),
        onExecute: () => {
          void handleExtract()
        }
      }
    ]

    if (mode === "single" && source) {
      actions.push(
        {
          id: "web-export-md",
          icon: FileText,
          label: "导出 Markdown",
          group: "file",
          disabled: busy,
          onExecute: () => {
            void handleExport("markdown")
          }
        },
        {
          id: "web-export-pdf",
          icon: FilePdf,
          label: "导出 PDF",
          group: "file",
          disabled: busy,
          onExecute: () => {
            void handleExport("pdf")
          }
        },
        {
          id: "web-export-png",
          icon: Image,
          label: "导出 PNG",
          group: "file",
          disabled: busy,
          onExecute: () => {
            void handleExport("png")
          }
        },
        {
          id: "web-copy-png",
          icon: Copy,
          label: "复制 PNG 到剪贴板",
          group: "auxiliary",
          disabled: busy,
          onExecute: () => {
            void handleCopyPng()
          }
        }
      )
    }

    return actions
  }, [mode, source, loading, url, busy, handleExtract, handleExport, handleCopyPng])

  useEffect(() => {
    onActionsChange?.(commandActions)
  }, [commandActions, onActionsChange])

  // ─── Expose StatusStrip data to the shell ─────────────────────────────────

  useEffect(() => {
    const content = source?.markdown || source?.plainText || ""
    onStatusChange?.({
      diagnostics: { errors: 0, warnings: 0 },
      stats: {
        chars: content.length,
        lines: content ? content.split("\n").length : 0,
        encoding: "UTF-8"
      }
    })
  }, [source, onStatusChange])

  // --- Render ---

  const exportButtonClass =
    "rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-700 transition-colors hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:text-stone-300"

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
              className="rounded-lg bg-rose-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40">
              {loading ? "提取中…" : "提取"}
            </button>
          </div>

          {source && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" disabled={busy} onClick={() => void handleExport("markdown")} className={exportButtonClass}>
                导出 Markdown
              </button>
              <button type="button" disabled={busy} onClick={() => void handleExport("pdf")} className={exportButtonClass}>
                导出 PDF
              </button>
              <button type="button" disabled={busy} onClick={() => void handleExport("png")} className={exportButtonClass}>
                导出 PNG
              </button>
              <button type="button" disabled={busy} onClick={() => void handleCopyPng()} className={exportButtonClass}>
                复制 PNG
              </button>
            </div>
          )}

          {busyMessage && (
            <p className="text-xs text-stone-500 dark:text-stone-400">{busyMessage}</p>
          )}

          {oversizedPrompt && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <p>
                单张 PNG 约 {oversizedPrompt.preflight.mergedWidth} ×{" "}
                {oversizedPrompt.preflight.mergedHeight} 像素，可能无法稳定导出。
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => answerOversized("paged")}
                  className="rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white">
                  分页导出 PNG
                </button>
                <button
                  type="button"
                  onClick={() => answerOversized("pdf")}
                  className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-stone-900 ring-1 ring-stone-300">
                  改为导出 PDF
                </button>
                <button
                  type="button"
                  onClick={() => answerOversized("cancel")}
                  className="rounded-md px-3 py-1.5 text-xs text-stone-600 hover:bg-amber-100 dark:text-stone-300">
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <BatchUrlPanel
          onBatchExport={(urls, format) => void handleBatchExport(urls, format)}
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
      <div className="flex-1">
        <ResizableSplitPane
          left={leftPanel}
          right={rightPanel}
          defaultRatio={0.4}
          minRatio={0.25}
          maxRatio={0.7}
        />
      </div>

      <HistoryPanel<ExportHistoryItem>
        items={filteredHistory}
        searchQuery={historySearchQuery}
        onSearchChange={setHistorySearchQuery}
        onSelect={handleHistorySelect}
        onDelete={handleHistoryDelete}
        getKey={(item) => `${item.url}|${item.format}|${item.timestamp}`}
        title="导出历史"
        renderItem={(item) => (
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium">
              {item.title || item.url}
            </span>
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-700">
                {item.format === "markdown" ? "MD" : item.format.toUpperCase()}
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

      {!onToast && toast && (
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
