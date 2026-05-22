import { useCallback, useRef } from "react"

import { getPlatform } from "@quick-tools/platform"

import { QrRenderer } from "~/components/QrRenderer"
import { useToast } from "~/hooks/useToast"
import { calculateQrCapacity } from "~/lib/qr-capacity"

import { Toast } from "../Toast"

interface FinalStringDisplayProps {
  finalString: string | null
  placeholderNames: string[]
  selections: Record<string, string>
  size?: 128 | 256 | 512
  level?: "L" | "M" | "Q" | "H"
}

export function FinalStringDisplay({
  finalString,
  placeholderNames,
  selections,
  size = 256,
  level = "M"
}: FinalStringDisplayProps) {
  const svgContainerRef = useRef<HTMLDivElement>(null)
  const { toast, showToast, hideToast } = useToast()

  const allSelected =
    placeholderNames.length === 0 ||
    placeholderNames.every((name) => !!selections[name])

  const capacityInfo = finalString
    ? calculateQrCapacity(finalString, level)
    : null

  const isOverCapacity = capacityInfo?.isOverCapacity ?? false

  const handleExportPng = useCallback(async () => {
    const svgEl = svgContainerRef.current?.querySelector("svg")
    if (!svgEl || !finalString) return

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
        `qr-template-${finalString.slice(0, 20).replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "_")}.png`,
        "image/png"
      )
      if (result.ok) {
        showToast("PNG 已保存", "success")
      } else if (result.error.category !== "cancelled") {
        showToast(result.error.message, "error")
      }
    } catch {
      showToast("导出 PNG 失败", "error")
    }
  }, [finalString, size, showToast])

  const handleExportSvg = useCallback(async () => {
    const svgEl = svgContainerRef.current?.querySelector("svg")
    if (!svgEl || !finalString) return

    try {
      const svgData = new XMLSerializer().serializeToString(svgEl)
      const platform = getPlatform()
      const result = await platform.fileDownloader.downloadWithDialog(
        svgData,
        `qr-template-${finalString.slice(0, 20).replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "_")}.svg`,
        "image/svg+xml"
      )
      if (result.ok) {
        showToast("SVG 已保存", "success")
      } else if (result.error.category !== "cancelled") {
        showToast(result.error.message, "error")
      }
    } catch {
      showToast("导出 SVG 失败", "error")
    }
  }, [finalString, showToast])

  const handleCopyToClipboard = useCallback(async () => {
    const svgEl = svgContainerRef.current?.querySelector("svg")
    if (!svgEl || !finalString) return

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
        showToast("已复制到剪贴板", "success")
      } else {
        showToast("剪贴板写入失败，请检查权限", "error")
      }
    } catch {
      showToast("复制到剪贴板失败", "error")
    }
  }, [finalString, size, showToast])

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
      <h3 className="mb-3 text-xs font-medium text-stone-500 dark:text-stone-400">
        二维码预览
      </h3>

      {/* Final String Display */}
      <div className="mb-3">
        <label className="mb-1 block text-xs text-stone-400 dark:text-stone-500">
          最终内容
        </label>
        {finalString ? (
          <p className="break-all rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700 dark:bg-stone-900 dark:text-stone-300">
            {finalString}
          </p>
        ) : (
          <p className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-400 italic dark:bg-stone-900 dark:text-stone-500">
            {!allSelected
              ? "请为所有占位符选择候选值"
              : "暂无内容"}
          </p>
        )}
      </div>

      {/* Capacity Warning */}
      {isOverCapacity && capacityInfo && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          内容过长，超出二维码容量限制（当前 {capacityInfo.charCount} 字节，最大{" "}
          {capacityInfo.maxCapacity} 字节）
        </div>
      )}

      {/* QR Preview */}
      <div ref={svgContainerRef}>
        {finalString && !isOverCapacity ? (
          <QrRenderer
            content={finalString}
            size={size}
            level={level}
            onExportPng={handleExportPng}
            onExportSvg={handleExportSvg}
            onCopyToClipboard={handleCopyToClipboard}
          />
        ) : (
          <div className="flex flex-col items-center gap-3">
            {/* Empty/disabled QR preview area */}
            <div
              className="flex items-center justify-center rounded-lg border border-dashed border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-900/50"
              style={{ width: size, height: size }}>
              {isOverCapacity ? (
                <div className="text-center text-sm text-red-500 dark:text-red-400">
                  <p className="mb-1 font-medium">容量超限</p>
                  <p className="text-xs">请缩短内容或降低纠错等级</p>
                </div>
              ) : (
                <div className="text-center text-sm text-stone-400 dark:text-stone-500">
                  <span className="mb-1 block text-2xl">📱</span>
                  <p>等待生成</p>
                </div>
              )}
            </div>

            {/* Disabled export buttons */}
            <div className="flex items-center gap-2">
              <button
                disabled
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50">
                保存为 PNG
              </button>
              <button
                disabled
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                保存为 SVG
              </button>
              <button
                disabled
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                复制到剪贴板
              </button>
            </div>
          </div>
        )}
      </div>

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
