import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { getPlatform } from "@quick-tools/platform"
import type { HistoryItem } from "@quick-tools/qr-code-gen"
import { QrCode, DownloadSimple, Image as ImageIcon, Copy } from "@phosphor-icons/react"

import { HistoryPanel } from "~/components/HistoryPanel"
import { QrRenderer } from "~/components/QrRenderer"
import { Toast } from "~/components/Toast"
import { TemplateMode } from "~/components/template"
import type { CommandAction } from "~/components/shell/CommandBar"
import { useHistory } from "~/hooks/useHistory"
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
  const [size, setSize] = useState<128 | 256 | 512>(256)
  const [level, setLevel] = useState<"L" | "M" | "Q" | "H">("M")

  // History
  const { items: historyItems, add: addHistory, remove: removeHistory, search: searchHistory } =
    useHistory<HistoryItem>({ storageKey: "qr-history" })
  const [searchQuery, setSearchQuery] = useState("")

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

  const filteredHistory = searchQuery
    ? searchHistory(searchQuery)
    : historyItems

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
    await addHistory({ content: content.trim(), timestamp: Date.now() })
    notify("二维码已生成", "success")
  }, [content, level, addHistory, notify])

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
        `qr-${content.slice(0, 20).replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "_")}.png`,
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
        `qr-${content.slice(0, 20).replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "_")}.svg`,
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
        notify("剪贴板写入失败，请检查权限", "error")
      }
    } catch {
      notify("复制到剪贴板失败", "error")
    }
  }, [size, notify])

  const handleHistorySelect = useCallback((item: HistoryItem) => {
    setContent(item.content)
    setMode("free")
  }, [])

  const handleHistoryDelete = useCallback(
    async (index: number) => {
      await removeHistory(index)
    },
    [removeHistory]
  )

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

        <div
          className="flex flex-1 flex-col gap-4"
          style={{ display: mode === "free" ? "flex" : "none" }}>
          {/* Settings Row */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-stone-500 dark:text-stone-400">尺寸</label>
              <select
                value={size}
                onChange={(e) => setSize(Number(e.target.value) as 128 | 256 | 512)}
                className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <option value={128}>128px</option>
                <option value={256}>256px</option>
                <option value={512}>512px</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-stone-500 dark:text-stone-400">纠错</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as "L" | "M" | "Q" | "H")}
                className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <option value="L">L (7%)</option>
                <option value="M">M (15%)</option>
                <option value="Q">Q (25%)</option>
                <option value="H">H (30%)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4">
            {/* Content Input */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入要生成二维码的内容..."
              rows={4}
              className="input-field resize-none"
            />

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
          <TemplateMode showToast={notifyTemplate} />
        </div>
      </div>

      {/* Right Panel - History Sidebar */}
      <HistoryPanel<HistoryItem>
        items={filteredHistory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelect={handleHistorySelect}
        onDelete={handleHistoryDelete}
        title="生成历史"
        renderItem={(item) => (
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-sm text-stone-700 dark:text-stone-300">
              {item.content.length > 30
                ? item.content.slice(0, 30) + "..."
                : item.content}
            </span>
            <span className="text-[11px] text-stone-400 dark:text-stone-600">
              {new Date(item.timestamp).toLocaleString("zh-CN", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </span>
          </div>
        )}
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
