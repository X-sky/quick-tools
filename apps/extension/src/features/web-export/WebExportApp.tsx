import { getPlatform } from "@quick-tools/platform"
import type {
  ExportFormat,
  ExportHistoryItem,
  MarkdownExportSource,
  PngPreflight
} from "@quick-tools/web-export"
import {
  addExportHistoryItem,
  filterExportHistory,
  parseBatchUrls,
  removeExportHistoryItem
} from "@quick-tools/web-export"
import type { OversizedPngChoice } from "@quick-tools/web-export-dom"
import {
  describeExportResult,
  ExportCancelledError,
  exportArticle,
  renderArticlePng
} from "@quick-tools/web-export-dom"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { SearchIcon, TrashIcon, XIcon } from "~icons"

import { extractFromTab, extractFromUrl, saveFiles } from "./extension-io"
import { MarkdownPreview } from "./MarkdownPreview"

export const EXPORT_HISTORY_STORAGE_KEY = "web-export-history"

const FORMAT_LABEL: Record<ExportFormat, string> = {
  markdown: "Markdown",
  pdf: "PDF",
  png: "PNG"
}

interface BatchResult {
  url: string
  success: boolean
  title?: string
  error?: string
}

interface Notice {
  type: "success" | "error" | "warning" | "info"
  text: string
}

function readParams() {
  const params = new URLSearchParams(window.location.search)
  const tabId = Number(params.get("tabId"))
  const format = params.get("format")
  return {
    initialUrl: params.get("url") ?? "",
    sourceTabId: Number.isInteger(tabId) && tabId > 0 ? tabId : null,
    autoFormat:
      params.get("auto") === "1" &&
      (format === "markdown" || format === "pdf" || format === "png")
        ? (format as ExportFormat)
        : null
  }
}

const buttonClass =
  "plasmo-rounded-lg plasmo-border plasmo-border-stone-200 plasmo-bg-white plasmo-px-3 plasmo-py-1.5 plasmo-text-sm plasmo-text-stone-700 hover:plasmo-border-rose-300 hover:plasmo-text-rose-600 disabled:plasmo-cursor-not-allowed disabled:plasmo-opacity-40 plasmo-transition-colors"

export function WebExportApp() {
  const { initialUrl, sourceTabId, autoFormat } = useMemo(readParams, [])
  const [mode, setMode] = useState<"single" | "batch">("single")
  const [url, setUrl] = useState(initialUrl)
  const [loading, setLoading] = useState(false)
  const [busyMessage, setBusyMessage] = useState<string | null>(null)
  const [source, setSource] = useState<MarkdownExportSource | null>(null)
  const [previewMode, setPreviewMode] = useState<"rendered" | "source">("rendered")
  const [notice, setNotice] = useState<Notice | null>(null)
  const [oversized, setOversized] = useState<{
    preflight: PngPreflight
    resolve: (choice: OversizedPngChoice) => void
  } | null>(null)

  const [history, setHistory] = useState<ExportHistoryItem[]>([])
  const historyRef = useRef<ExportHistoryItem[]>([])
  const [historyQuery, setHistoryQuery] = useState("")
  const [confirmKey, setConfirmKey] = useState<string | null>(null)

  const [batchText, setBatchText] = useState("")
  const [batchFormat, setBatchFormat] = useState<ExportFormat>("markdown")
  const [batchProgress, setBatchProgress] = useState<{
    total: number
    completed: number
    currentUrl: string
    results: BatchResult[]
  } | null>(null)

  const busyRef = useRef(false)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const notify = useCallback((type: Notice["type"], text: string) => {
    setNotice({ type, text })
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), 4000)
  }, [])

  // ─── History ────────────────────────────────────────────────────────────
  useEffect(() => {
    void getPlatform()
      .storage.get<ExportHistoryItem[]>(EXPORT_HISTORY_STORAGE_KEY)
      .then((result) => {
        if (!result.ok || !Array.isArray(result.value)) return
        const sorted = [...result.value].sort((a, b) => b.timestamp - a.timestamp)
        historyRef.current = sorted
        setHistory(sorted)
      })
  }, [])

  const commitHistory = useCallback(async (next: ExportHistoryItem[]) => {
    historyRef.current = next
    setHistory(next)
    await getPlatform().storage.set(EXPORT_HISTORY_STORAGE_KEY, next)
  }, [])

  const recordHistory = useCallback(
    (article: MarkdownExportSource, format: ExportFormat) =>
      commitHistory(
        addExportHistoryItem(historyRef.current, {
          url: article.url,
          title: article.title,
          format,
          timestamp: Date.now(),
          content: `${article.title} ${article.url}`
        })
      ),
    [commitHistory]
  )

  const filteredHistory = useMemo(
    () => filterExportHistory(history, historyQuery),
    [history, historyQuery]
  )

  // ─── Extraction ─────────────────────────────────────────────────────────
  const runExtraction = useCallback(
    async (load: () => Promise<MarkdownExportSource>) => {
      setLoading(true)
      setSource(null)
      try {
        const article = await load()
        setSource(article)
        setUrl(article.url)
        notify("success", "内容提取成功")
        return article
      } catch (error) {
        notify(
          "error",
          `页面内容提取失败: ${error instanceof Error ? error.message : String(error)}`
        )
        return null
      } finally {
        setLoading(false)
      }
    },
    [notify]
  )

  const handleExtractUrl = useCallback(
    (target: string = url) => {
      const trimmed = target.trim()
      if (!trimmed) return Promise.resolve(null)
      return runExtraction(() => extractFromUrl(trimmed))
    },
    [url, runExtraction]
  )

  const handleExtractCurrentTab = useCallback(() => {
    if (!sourceTabId) return Promise.resolve(null)
    return runExtraction(() => extractFromTab(sourceTabId))
  }, [sourceTabId, runExtraction])

  // ─── Export ─────────────────────────────────────────────────────────────
  const askOversized = useCallback(
    (preflight: PngPreflight) =>
      new Promise<OversizedPngChoice>((resolve) => {
        // A context-menu job runs in a background tab; bring it forward so
        // the user can answer.
        void chrome.tabs.getCurrent().then((tab) => {
          if (tab?.id) void chrome.tabs.update(tab.id, { active: true })
        })
        setOversized({ preflight, resolve })
      }),
    []
  )

  const handleExport = useCallback(
    async (
      format: ExportFormat,
      article: MarkdownExportSource | null = source,
      saveAs = true
    ) => {
      if (!article || busyRef.current) return false
      busyRef.current = true
      try {
        const result = await exportArticle(article, format, {
          onProgress: setBusyMessage,
          onOversizedPng: askOversized
        })
        setBusyMessage(null)
        const saved = await saveFiles(result.files, { saveAs })
        if (saved.status === "saved") {
          notify(
            result.imageFailures > 0 ? "warning" : "success",
            describeExportResult(result)
          )
          await recordHistory(article, result.format)
          return true
        }
        if (saved.status === "error") notify("error", `导出失败: ${saved.message}`)
        return false
      } catch (error) {
        if (!(error instanceof ExportCancelledError)) {
          notify(
            "error",
            `渲染失败: ${error instanceof Error ? error.message : String(error)}`
          )
        }
        return false
      } finally {
        busyRef.current = false
        setBusyMessage(null)
      }
    },
    [source, askOversized, notify, recordHistory]
  )

  const handleCopyPng = useCallback(async () => {
    if (!source || busyRef.current) return
    busyRef.current = true
    try {
      const { bytes, imageFailures } = await renderArticlePng(source, {
        onProgress: setBusyMessage
      })
      const result = await getPlatform().clipboard.writeImage(bytes, "image/png")
      if (result.ok) {
        notify(
          imageFailures > 0 ? "warning" : "success",
          imageFailures > 0
            ? "PNG 已复制到剪贴板，部分图片未成功嵌入"
            : "PNG 已复制到剪贴板"
        )
      } else {
        notify("error", "剪贴板写入失败，请检查权限")
      }
    } catch (error) {
      notify(
        "error",
        `渲染失败: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      busyRef.current = false
      setBusyMessage(null)
    }
  }, [source, notify])

  // Right-click menu job: extract the source tab, export, then close.
  const autoStarted = useRef(false)
  useEffect(() => {
    if (!autoFormat || !sourceTabId || autoStarted.current) return
    autoStarted.current = true
    void (async () => {
      const article = await handleExtractCurrentTab()
      const ok = article ? await handleExport(autoFormat, article, false) : false
      const tab = await chrome.tabs.getCurrent()
      if (!tab?.id) return
      if (ok) {
        setTimeout(() => void chrome.tabs.remove(tab.id!), 800)
      } else {
        void chrome.tabs.update(tab.id, { active: true })
      }
    })()
  }, [autoFormat, sourceTabId, handleExtractCurrentTab, handleExport])

  // ─── Batch ──────────────────────────────────────────────────────────────
  const batchLines = useMemo(
    () => (batchText.trim() ? parseBatchUrls(batchText) : []),
    [batchText]
  )
  const batchValid = batchLines.filter((l) => l.valid).map((l) => l.content)
  const batchRunning =
    batchProgress !== null && batchProgress.completed < batchProgress.total

  const handleBatchExport = useCallback(async () => {
    if (batchValid.length === 0 || busyRef.current) return
    busyRef.current = true
    const total = batchValid.length
    const results: BatchResult[] = []
    setBatchProgress({ total, completed: 0, currentUrl: batchValid[0]!, results })
    for (let i = 0; i < total; i++) {
      const current = batchValid[i]!
      setBatchProgress((prev) => (prev ? { ...prev, completed: i, currentUrl: current } : prev))
      try {
        const article = await extractFromUrl(current)
        // Batch runs unattended: oversized PNGs are written as paged files.
        const exported = await exportArticle(article, batchFormat)
        const saved = await saveFiles(exported.files, { saveAs: false })
        if (saved.status === "error") throw new Error(saved.message)
        results.push({ url: current, success: true, title: article.title })
        await recordHistory(article, exported.format)
      } catch (error) {
        results.push({
          url: current,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }
    setBatchProgress({ total, completed: total, currentUrl: "", results: [...results] })
    busyRef.current = false
    const failed = results.filter((r) => !r.success).length
    notify(
      failed === 0 ? "success" : "error",
      failed === 0
        ? `导出完成：成功 ${total} 个`
        : `导出完成：成功 ${total - failed} 个，失败 ${failed} 个`
    )
  }, [batchValid, batchFormat, notify, recordHistory])

  // ─── Render ─────────────────────────────────────────────────────────────
  const busy = busyMessage !== null
  const historyKey = (item: ExportHistoryItem) =>
    `${item.url}|${item.format}|${item.timestamp}`

  return (
    <div className="plasmo-flex plasmo-h-screen plasmo-bg-stone-50 plasmo-font-sans plasmo-text-stone-800">
      {/* Left: input + actions */}
      <div className="plasmo-flex plasmo-w-[380px] plasmo-shrink-0 plasmo-flex-col plasmo-gap-4 plasmo-overflow-y-auto plasmo-border-r plasmo-border-stone-200 plasmo-bg-white plasmo-p-5">
        <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
          <h1 className="plasmo-text-base plasmo-font-semibold">Web Export</h1>
          <div className="plasmo-flex plasmo-overflow-hidden plasmo-rounded-lg plasmo-border plasmo-border-stone-200">
            {(["single", "batch"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-font-medium ${
                  mode === m
                    ? "plasmo-bg-stone-700 plasmo-text-white"
                    : "plasmo-text-stone-500 hover:plasmo-bg-stone-100"
                }`}>
                {m === "single" ? "单个模式" : "批量模式"}
              </button>
            ))}
          </div>
        </div>

        {mode === "single" ? (
          <>
            <div className="plasmo-flex plasmo-gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleExtractUrl()
                }}
                placeholder="输入要导出的网页 URL..."
                className="plasmo-flex-1 plasmo-rounded-lg plasmo-border plasmo-border-stone-200 plasmo-px-3 plasmo-py-1.5 plasmo-text-sm plasmo-outline-none focus:plasmo-border-rose-400"
              />
              <button
                type="button"
                onClick={() => void handleExtractUrl()}
                disabled={loading || !url.trim()}
                className="plasmo-rounded-lg plasmo-bg-rose-500 plasmo-px-4 plasmo-py-1.5 plasmo-text-sm plasmo-font-medium plasmo-text-white hover:plasmo-bg-rose-600 disabled:plasmo-cursor-not-allowed disabled:plasmo-opacity-40">
                {loading ? "提取中…" : "提取"}
              </button>
            </div>
            {sourceTabId && (
              <button
                type="button"
                onClick={() => void handleExtractCurrentTab()}
                disabled={loading}
                className={buttonClass}>
                提取当前标签页
              </button>
            )}

            {source && (
              <div className="plasmo-flex plasmo-flex-wrap plasmo-gap-2">
                {(["markdown", "pdf", "png"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    disabled={busy}
                    onClick={() => void handleExport(f)}
                    className={buttonClass}>
                    导出 {FORMAT_LABEL[f]}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleCopyPng()}
                  className={buttonClass}>
                  复制 PNG
                </button>
              </div>
            )}

            {busyMessage && (
              <p className="plasmo-text-xs plasmo-text-stone-500">{busyMessage}</p>
            )}

            {oversized && (
              <div className="plasmo-rounded-xl plasmo-border plasmo-border-amber-200 plasmo-bg-amber-50 plasmo-p-4 plasmo-text-sm plasmo-text-amber-900">
                <p>
                  单张 PNG 约 {oversized.preflight.mergedWidth} ×{" "}
                  {oversized.preflight.mergedHeight} 像素，可能无法稳定导出。
                </p>
                <div className="plasmo-mt-3 plasmo-flex plasmo-gap-2">
                  {(
                    [
                      ["paged", "分页导出 PNG"],
                      ["pdf", "改为导出 PDF"],
                      ["cancel", "取消"]
                    ] as const
                  ).map(([choice, label]) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => {
                        oversized.resolve(choice)
                        setOversized(null)
                      }}
                      className={
                        choice === "paged"
                          ? "plasmo-rounded-md plasmo-bg-stone-900 plasmo-px-3 plasmo-py-1.5 plasmo-text-xs plasmo-font-medium plasmo-text-white"
                          : "plasmo-rounded-md plasmo-bg-white plasmo-px-3 plasmo-py-1.5 plasmo-text-xs plasmo-text-stone-900 plasmo-ring-1 plasmo-ring-stone-300"
                      }>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="plasmo-flex plasmo-flex-col plasmo-gap-3">
            <label className="plasmo-text-sm plasmo-font-medium">批量 URL 输入（每行一个）</label>
            <textarea
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              disabled={batchRunning}
              rows={8}
              placeholder={"https://example.com/page1\nhttps://example.com/page2"}
              className="plasmo-w-full plasmo-resize-y plasmo-rounded-md plasmo-border plasmo-border-stone-200 plasmo-px-3 plasmo-py-2 plasmo-font-mono plasmo-text-sm plasmo-outline-none focus:plasmo-border-rose-400"
            />
            {batchLines.length > 0 && (
              <div className="plasmo-flex plasmo-gap-3 plasmo-text-xs plasmo-text-stone-500">
                <span>共 {batchLines.length} 个 URL</span>
                <span className="plasmo-text-emerald-600">有效 {batchValid.length}</span>
                {batchLines.length > batchValid.length && (
                  <span className="plasmo-text-red-500">
                    无效 {batchLines.length - batchValid.length}
                  </span>
                )}
              </div>
            )}
            <div className="plasmo-flex plasmo-gap-4 plasmo-text-sm">
              {(["markdown", "pdf", "png"] as const).map((f) => (
                <label key={f} className="plasmo-flex plasmo-items-center plasmo-gap-1.5">
                  <input
                    type="radio"
                    name="batch-format"
                    checked={batchFormat === f}
                    onChange={() => setBatchFormat(f)}
                    disabled={batchRunning}
                  />
                  {FORMAT_LABEL[f]}
                </label>
              ))}
            </div>
            <p className="plasmo-text-xs plasmo-text-stone-400">文件将保存到浏览器默认下载目录。</p>
            <button
              type="button"
              onClick={() => void handleBatchExport()}
              disabled={batchRunning || batchValid.length === 0}
              className="plasmo-rounded-md plasmo-bg-rose-500 plasmo-px-4 plasmo-py-2 plasmo-text-sm plasmo-font-medium plasmo-text-white hover:plasmo-bg-rose-600 disabled:plasmo-cursor-not-allowed disabled:plasmo-opacity-40">
              {batchRunning ? "导出中..." : "批量导出"}
            </button>
            {batchProgress && batchRunning && (
              <div className="plasmo-rounded-md plasmo-border plasmo-border-rose-100 plasmo-bg-rose-50 plasmo-px-3 plasmo-py-2 plasmo-text-xs plasmo-text-rose-700">
                {batchProgress.completed} / {batchProgress.total} · 正在处理: {batchProgress.currentUrl}
              </div>
            )}
            {batchProgress && !batchRunning && batchProgress.results.length > 0 && (
              <div className="plasmo-flex plasmo-flex-col plasmo-gap-1 plasmo-rounded-md plasmo-border plasmo-border-stone-200 plasmo-bg-stone-50 plasmo-px-3 plasmo-py-2 plasmo-text-xs">
                <div className="plasmo-font-medium">
                  导出完成：成功 {batchProgress.results.filter((r) => r.success).length} 个
                  {batchProgress.results.some((r) => !r.success) &&
                    `，失败 ${batchProgress.results.filter((r) => !r.success).length} 个`}
                </div>
                {batchProgress.results
                  .filter((r) => !r.success)
                  .map((r) => (
                    <div key={r.url} className="plasmo-rounded plasmo-bg-red-50 plasmo-px-2 plasmo-py-1">
                      <div className="plasmo-truncate">{r.url}</div>
                      <div className="plasmo-text-red-500">{r.error}</div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {notice && (
          <div
            className={`plasmo-rounded-lg plasmo-px-3 plasmo-py-2 plasmo-text-xs ${
              notice.type === "error"
                ? "plasmo-bg-red-50 plasmo-text-red-700"
                : notice.type === "warning"
                  ? "plasmo-bg-amber-50 plasmo-text-amber-700"
                  : "plasmo-bg-emerald-50 plasmo-text-emerald-700"
            }`}>
            {notice.text}
          </div>
        )}
      </div>

      {/* Middle: preview */}
      <div className="plasmo-min-w-0 plasmo-flex-1 plasmo-bg-white">
        <MarkdownPreview source={source} mode={previewMode} onModeChange={setPreviewMode} />
      </div>

      {/* Right: history */}
      <div className="plasmo-flex plasmo-w-64 plasmo-shrink-0 plasmo-flex-col plasmo-border-l plasmo-border-stone-200 plasmo-bg-white">
        <div className="plasmo-border-b plasmo-border-stone-100 plasmo-px-4 plasmo-py-3 plasmo-text-xs plasmo-font-semibold plasmo-uppercase plasmo-tracking-wider plasmo-text-stone-500">
          导出历史
        </div>
        <div className="plasmo-px-3 plasmo-py-2">
          <div className="plasmo-flex plasmo-items-center plasmo-gap-1.5 plasmo-rounded-lg plasmo-border plasmo-border-stone-200 plasmo-px-2 plasmo-py-1">
            <SearchIcon className="plasmo-h-3 plasmo-w-3 plasmo-text-stone-400" />
            <input
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
              placeholder="搜索..."
              className="plasmo-w-full plasmo-text-xs plasmo-outline-none"
            />
            {historyQuery && (
              <button type="button" onClick={() => setHistoryQuery("")} title="清除搜索">
                <XIcon className="plasmo-h-3 plasmo-w-3 plasmo-text-stone-400" />
              </button>
            )}
          </div>
        </div>
        <div className="plasmo-flex-1 plasmo-overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <div className="plasmo-px-4 plasmo-py-8 plasmo-text-center plasmo-text-xs plasmo-text-stone-400">
              {historyQuery ? "没有匹配的记录" : "暂无历史记录"}
            </div>
          ) : (
            <ul className="plasmo-space-y-0.5 plasmo-px-2 plasmo-py-1">
              {filteredHistory.map((item) => {
                const key = historyKey(item)
                return (
                  <li
                    key={key}
                    className="plasmo-group plasmo-flex plasmo-items-center plasmo-gap-1 plasmo-rounded-lg hover:plasmo-bg-stone-50">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("single")
                        setUrl(item.url)
                        void handleExtractUrl(item.url)
                      }}
                      title={item.url}
                      className="plasmo-flex-1 plasmo-overflow-hidden plasmo-px-2.5 plasmo-py-2 plasmo-text-left">
                      <span className="plasmo-block plasmo-truncate plasmo-text-sm plasmo-font-medium">
                        {item.title || item.url}
                      </span>
                      <span className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-text-xs plasmo-text-stone-400">
                        <span className="plasmo-rounded plasmo-bg-stone-100 plasmo-px-1.5 plasmo-py-0.5">
                          {item.format === "markdown" ? "MD" : item.format.toUpperCase()}
                        </span>
                        {new Date(item.timestamp).toLocaleString("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </button>
                    {confirmKey === key ? (
                      <div className="plasmo-mr-1.5 plasmo-flex plasmo-items-center plasmo-gap-1 plasmo-text-xs">
                        <span className="plasmo-text-stone-500">删除？</span>
                        <button
                          type="button"
                          onClick={() => {
                            void commitHistory(removeExportHistoryItem(historyRef.current, item))
                            setConfirmKey(null)
                          }}
                          className="plasmo-px-1 plasmo-font-medium plasmo-text-rose-600">
                          是
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmKey(null)}
                          className="plasmo-px-1 plasmo-text-stone-500">
                          否
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmKey(key)}
                        aria-label="删除记录"
                        className="plasmo-mr-1.5 plasmo-rounded-md plasmo-p-1 plasmo-text-stone-400 plasmo-opacity-0 hover:plasmo-text-rose-500 group-hover:plasmo-opacity-100">
                        <TrashIcon className="plasmo-h-3.5 plasmo-w-3.5" />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
