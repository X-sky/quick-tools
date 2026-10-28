import type { QrErrorLevel, QrSize } from "@quick-tools/qr-code-gen"
import {
  calculateQrCapacity,
  QR_ERROR_LEVELS,
  QR_SIZES
} from "@quick-tools/qr-code-gen"
import { useState, type RefObject } from "react"

import { CopyIcon, DownloadIcon, ImageIcon } from "~icons"

import { copyQrImage, saveQrPng, saveQrSvg } from "../qr-image"

interface QrExportBarProps {
  /** Container that holds the rendered QR <svg> */
  svgContainerRef: RefObject<HTMLDivElement>
  content: string
  size: QrSize
  onSizeChange: (size: QrSize) => void
  level: QrErrorLevel
  onLevelChange: (level: QrErrorLevel) => void
  disabled?: boolean
  filePrefix?: string
}

const selectClass =
  "plasmo-rounded-md plasmo-border plasmo-border-stone-200 plasmo-bg-stone-50 plasmo-px-1 plasmo-py-0.5 plasmo-text-[11px] plasmo-text-stone-600 plasmo-outline-none focus:plasmo-border-rose-300"

const buttonClass =
  "plasmo-flex plasmo-items-center plasmo-justify-center plasmo-gap-1 plasmo-rounded-md plasmo-border plasmo-border-stone-200 plasmo-bg-white plasmo-px-1.5 plasmo-py-1 plasmo-text-[11px] plasmo-font-medium plasmo-text-stone-600 hover:plasmo-border-rose-300 hover:plasmo-text-rose-500 disabled:plasmo-cursor-not-allowed disabled:plasmo-opacity-40 plasmo-transition-colors"

/** Size / error-level options, capacity meter and PNG / SVG / clipboard export. */
export function QrExportBar({
  svgContainerRef,
  content,
  size,
  onSizeChange,
  level,
  onLevelChange,
  disabled,
  filePrefix = "qr"
}: QrExportBarProps) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const capacity = calculateQrCapacity(content, level)
  const blocked = disabled || !content || capacity.isOverCapacity

  const run = async (
    action: (svg: SVGSVGElement) => Promise<string | null>
  ) => {
    const svg = svgContainerRef.current?.querySelector("svg")
    if (!svg) return
    const message = await action(svg)
    if (!message) return
    setFeedback(message)
    setTimeout(() => setFeedback(null), 2000)
  }

  return (
    <div className="plasmo-flex plasmo-w-full plasmo-flex-col plasmo-items-center plasmo-gap-1.5">
      <div
        className={`plasmo-text-[11px] ${
          capacity.isOverCapacity
            ? "plasmo-font-medium plasmo-text-red-600"
            : "plasmo-text-stone-400"
        }`}>
        {capacity.charCount} / {capacity.maxCapacity} 字节 ·{" "}
        {capacity.percentage.toFixed(1)}%
      </div>
      <div className="plasmo-flex plasmo-items-center plasmo-gap-1.5">
        <select
          aria-label="尺寸"
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value) as QrSize)}
          className={selectClass}>
          {QR_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}px
            </option>
          ))}
        </select>
        <select
          aria-label="纠错等级"
          value={level}
          onChange={(e) => onLevelChange(e.target.value as QrErrorLevel)}
          className={selectClass}>
          {QR_ERROR_LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <div className="plasmo-grid plasmo-w-full plasmo-grid-cols-3 plasmo-gap-1">
        <button
          type="button"
          disabled={blocked}
          title="保存为 PNG"
          onClick={() =>
            void run((svg) => saveQrPng(svg, size, content, filePrefix))
          }
          className={buttonClass}>
          <ImageIcon className="plasmo-h-3 plasmo-w-3" />
          PNG
        </button>
        <button
          type="button"
          disabled={blocked}
          title="保存为 SVG"
          onClick={() =>
            void run((svg) => saveQrSvg(svg, size, content, filePrefix))
          }
          className={buttonClass}>
          <DownloadIcon className="plasmo-h-3 plasmo-w-3" />
          SVG
        </button>
        <button
          type="button"
          disabled={blocked}
          title="复制图片到剪贴板"
          onClick={() => void run((svg) => copyQrImage(svg, size))}
          className={buttonClass}>
          <CopyIcon className="plasmo-h-3 plasmo-w-3" />
          复制
        </button>
      </div>
      {feedback && (
        <div className="plasmo-text-[11px] plasmo-font-medium plasmo-text-emerald-600">
          {feedback}
        </div>
      )}
    </div>
  )
}
