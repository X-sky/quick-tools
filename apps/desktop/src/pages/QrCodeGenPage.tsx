import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { getPlatform } from "@quick-tools/platform"
import type { HistoryItem, QrErrorLevel, QrSize } from "@quick-tools/qr-code-gen"
import {
  filterHistoryItems,
  historyExportFilename,
  QR_ERROR_LEVELS,
  QR_SIZES,
  qrImageFilename
} from "@quick-tools/qr-code-gen"
import { QrCode, DownloadSimple, Image as ImageIcon, Copy } from "@phosphor-icons/react"

import { QrHistoryPanel } from "~/components/QrHistoryPanel"
import { QrRenderer } from "~/components/QrRenderer"
import { Toast } from "~/components/Toast"
import { TemplateMode } from "~/components/template"
import type { CommandAction } from "~/components/shell/CommandBar"
import { useJsonFilePicker } from "~/hooks/useJsonFilePicker"
import { useQrHistory } from "~/hooks/useQrHistory"
import { useToast } from "~/hooks/useToast"
import { calculateQrCapacity } from "~/lib/qr-capacity"
import type { PageShellProps } from "~/types/page-shell"

export default function QrCodeGenPage({
  onActionsChange,
  onStatusChange,
  onToast
}: PageShellProps = {}) {
  // Mode: free input or template (defaults to Free_Mode on page load)
  const [mode, setMode] = useState<"free" | "template">("free")

  // Free mode state (preserved across mode switches)
  const [content, setContent] = useState("")
  const [size, setSize] = useState<QrSize>(256)
  const [level, setLevel] = useState<QrErrorLevel>("M")

  // History
  const history = useQrHistory()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  // Item picked from history; its tags carry over when the edited text is
  // generated again.
  const [editingItem, setEditingItem] = useState<HistoryItem | null>(null)
  const restoredRef = useRef(false)

  // Toast
  const { toast, showToast, hideToast } = useToast()

  // Ref for SVG container (used for export)
  const svgContainerRef = useRef<HTMLDivElement>(null)

  // Unified notify: prefer shell toast, fall back to local toast.
  const notify = useCallback(
    (message: string, type: "success" | "error" | "warning" | "info") => {
      if (onToast) {
        onToast({ type, title: message })
      } else {
        showToast(message, type === "warning" ? "info" : type)
      }
    },
    [onToast, showToast]
  )

  const filteredHistory = useMemo(
    () =>
      filterHistoryItems(history.items, {
        query: searchQuery,
        tag: selectedTag
      }),
    [history.items, searchQuery, selectedTag]
  )

  // Restore the most recent entry when the page opens.
  useEffect(() => {
    if (restoredRef.current || !history.loaded) return
    restoredRef.current = true
    const latest = history.items[0]
    if (latest) {
      setContent(latest.content)
      setEditingItem(latest)
    }
  }, [history.loaded, history.items])

  const handleGenerate = useCallback(async () => {
    if (!content.trim()) return
    const capacityInfo = calculateQrCapacity(content, level)
    if (capacityInfo.isOverCapacity) {
      notify(
        `内容过长，超出二维码容量限制（当前 ${capacityInfo.charCount} 字节，最大 ${capacityInfo.maxCapacity} 字节）`,
        "error"
      )
      return
    }
    await history.upsert(content, editingItem?.tags)
    setEditingItem(null)
    notify("二维码已生成", "success")
  }, [content, level, history, editingItem, notify])

  const handleExportPng = useCallback(async () => {
    const svgEl = svgContainerRef.current?.querySelector("svg")
    if (!svgEl) return

    try {
      const svgData = new XMLSerializer().serializeToString(svgEl)
      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const img = new Image()
      const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
      const url = URL.createObjectURL(blob)

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, size, size)
          URL.revokeObjectURL(url)
          resolve()
        }
        img.onerror = reject
        img.src = url
      })

      const pngBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      )
      if (!pngBlob) return

      const arrayBuffer = await pngBlob.arrayBuffer()
      const pngData = new Uint8Array(arrayBuffer)

      const platform = getPlatform()
      const result = await platform.fileDownloader.downloadWithDialog(
        pngData,
        qrImageFilename(content, "png"),
        "image/png"
      )
      if (result.ok) {
        notify("PNG 已保存", "success")
      } else if (result.error.category !== "cancelled") {
        notify(result.error.message, "error")
      }
    } catch {
      notify("导出 PNG 失败", "error")
    }
  }, [content, size, notify])

  const handleExportSvg = useCallback(async () => {
    const svgEl = svgContainerRef.current?.querySelector("svg")
    if (!svgEl) return

    try {
      const svgData = new XMLSerializer().serializeToString(svgEl)
      const platform = getPlatform()
      const result = await platform.fileDownloader.downloadWithDialog(
        svgData,
        qrImageFilename(content, "svg"),
        "image/svg+xml"
      )
      if (result.ok) {
        notify("SVG 已保存", "success")
      } else if (result.error.category !== "cancelled") {
        notify(result.error.message, "error")
      }
    } catch {
      notify("导出 SVG 失败", "error")
    }
  }, [content, notify])

  const handleCopyToClipboard = useCallback(async () => {
    const svgEl = svgContainerRef.current?.querySelector("svg")
    if (!svgEl) return

    try {
      const svgData = new XMLSerializer().serializeToString(svgEl)
      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const img = new Image()
      const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
      const url = URL.createObjectURL(blob)

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, size, size)
          URL.revokeObjectURL(url)
          resolve()
        }
        img.onerror = reject
        img.src = url
      })

      const pngBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      )
      if (!pngBlob) return

      const arrayBuffer = await pngBlob.arrayBuffer()
      const pngData = new Uint8Array(arrayBuffer)

      const platform = getPlatform()
      const result = await platform.clipboard.writeImage(pngData, "image/png")
      if (result.ok) {
        notify("已复制到剪贴板", "success")
      } else {
        notify(`剪贴板写入失败：${result.error.message}`, "error")
      }
    } catch {
      notify("复制到剪贴板失败", "error")
    }
  }, [size, notify])

  const handleHistorySelect = useCallback((item: HistoryItem) => {
    setContent(item.content)
    setEditingItem(item)
    setMode("free")
  }, [])

  const handleHistoryDelete = useCallback(
    async (deleted: string) => {
      await history.remove(deleted)
      if (content.trim() === deleted || editingItem?.content === deleted) {
        const next = history.items.find((item) => item.content !== deleted)
        setContent(next?.content ?? "")
        setEditingItem(next ?? null)
      }
    },
    [history, content, editingItem]
  )

  const handleSelectTag = useCallback(
    (tag: string | null) => {
      setSelectedTag(tag)
      const first = filterHistoryItems(history.items, {
        query: searchQuery,
        tag
      })[0]
      if (first) handleHistorySelect(first)
    },
    [history.items, searchQuery, handleHistorySelect]
  )

  const handleCopyText = useCallback(
    async (text: string) => {
      const result = await getPlatform().clipboard.writeText(text)
      if (!result.ok) notify("剪贴板写入失败", "error")
      return result.ok
    },
    [notify]
  )

  const handleExportHistory = useCallback(async () => {
    if (history.items.length === 0) return
    const result = await getPlatform().fileDownloader.downloadWithDialog(
      history.exportJson(),
      historyExportFilename(),
      "application/json"
    )
    if (result.ok) {
      notify("历史已导出", "success")
    } else if (result.error.category !== "cancelled") {
      notify(result.error.message, "error")
    }
  }, [history, notify])

  const historyImporter = useJsonFilePicker({
    onText: async (text) => {
      const result = await history.importJson(text)
      if (result.error) {
        notify(result.error, "error")
        return
      }
      const parts: string[] = []
      if (result.added > 0) parts.push(`新增 ${result.added} 条`)
      if (result.merged > 0) parts.push(`合并 ${result.merged} 条`)
      notify(parts.join("，") || "没有新记录", "success")
    },
    onError: (message) => notify(message, "error")
  })

  // Adapter for TemplateMode: prefer shell toast, fall back to local toast
  // (preserving the optional duration used by local toasts).
  const notifyTemplate = useCallback(
    (
      message: string,
      type: "success" | "error" | "info",
      duration?: number
    ) => {
      if (onToast) {
        onToast({ type, title: message })
      } else {
        showToast(message, type, duration)
      }
    },
    [onToast, showToast]
  )

  // ─── Expose CommandBar actions to the shell ───────────────────────────────

  const hasContent = content.trim().length > 0

  const commandActions: CommandAction[] = useMemo(
    () => [
      {
        id: "qr-generate",
        icon: QrCode,
        label: "生成二维码",
        group: "primary",
        disabled: !hasContent,
        onExecute: () => {
          void handleGenerate()
        }
      },
      {
        id: "qr-export-png",
        icon: ImageIcon,
        label: "导出 PNG",
        group: "file",
        disabled: !hasContent,
        onExecute: () => {
          void handleExportPng()
        }
      },
      {
        id: "qr-export-svg",
        icon: DownloadSimple,
        label: "导出 SVG",
        group: "file",
        disabled: !hasContent,
        onExecute: () => {
          void handleExportSvg()
        }
      },
      {
        id: "qr-copy",
        icon: Copy,
        label: "复制到剪贴板",
        group: "auxiliary",
        disabled: !hasContent,
        onExecute: () => {
          void handleCopyToClipboard()
        }
      }
    ],
    [
      hasContent,
      handleGenerate,
      handleExportPng,
      handleExportSvg,
      handleCopyToClipboard
    ]
  )

  useEffect(() => {
    onActionsChange?.(commandActions)
  }, [commandActions, onActionsChange])

  // ─── Expose StatusStrip data to the shell ─────────────────────────────────

  useEffect(() => {
    onStatusChange?.({
      diagnostics: { errors: 0, warnings: 0 },
      stats: {
        chars: content.length,
        lines: content ? content.split("\n").length : 0,
        encoding: "UTF-8"
      }
    })
  }, [content, onStatusChange])

  return (
    <div className="flex h-full">
      {/* Left Panel - Input Area */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        {/* Header with mode toggle */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-800 dark:text-stone-100">
            二维码生成器
          </h2>
          <div className="mode-toggle">
            <button
              onClick={() => setMode("free")}
              className={mode === "free" ? "mode-toggle-item-active" : "mode-toggle-item"}>
              自由
            </button>
            <button
              onClick={() => setMode("template")}
              className={mode === "template" ? "mode-toggle-item-active" : "mode-toggle-item"}>
              模板
            </button>
          </div>
        </div>

        {/* Settings Row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400">尺寸</label>
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value) as QrSize)}
              className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
              {QR_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}px
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400">纠错</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as QrErrorLevel)}
              className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
              {QR_ERROR_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className="flex flex-1 flex-col gap-4"
          style={{ display: mode === "free" ? "flex" : "none" }}>
          <div className="flex flex-1 flex-col gap-4">
            {/* Content Input */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入要生成二维码的内容..."
              rows={4}
              className="input-field resize-none"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault()
                  void handleGenerate()
                }
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-400 dark:text-stone-500">
                {content.length} 字符 · ⌘/Ctrl + Enter 生成并记入历史
              </span>
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={!content.trim()}
                className="rounded-lg bg-rose-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40">
                生成
              </button>
            </div>

            {/* QR Code Display */}
            <div ref={svgContainerRef} className="flex flex-1 items-center justify-center">
              {content.trim() && (
                <QrRenderer
                  content={content}
                  size={size}
                  level={level}
                  onExportPng={handleExportPng}
                  onExportSvg={handleExportSvg}
                  onCopyToClipboard={handleCopyToClipboard}
                />
              )}
            </div>
          </div>
        </div>

        <div
          className="flex flex-1 flex-col min-h-0"
          style={{ display: mode === "template" ? "flex" : "none" }}>
          <TemplateMode showToast={notifyTemplate} size={size} level={level} />
        </div>
      </div>

      {/* Right Panel - History Sidebar */}
      {historyImporter.inputElement}
      <QrHistoryPanel
        items={filteredHistory}
        totalCount={history.items.length}
        allTags={history.allTags}
        selectedTag={selectedTag}
        onSelectTag={handleSelectTag}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeContent={content.trim() || null}
        onSelect={handleHistorySelect}
        onDelete={(c) => void handleHistoryDelete(c)}
        onCopy={handleCopyText}
        onAddTag={(c, t) => void history.addTag(c, t)}
        onRemoveTag={(c, t) => void history.removeTag(c, t)}
        onImport={() => void historyImporter.open()}
        onExport={() => void handleExportHistory()}
      />

      {/* Local Toast — only used when not wired to shell toast */}
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
