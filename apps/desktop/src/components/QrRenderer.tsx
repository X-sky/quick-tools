import { useRef } from "react"
import { QRCodeSVG } from "qrcode.react"

import { calculateQrCapacity } from "~/lib/qr-capacity"

interface QrRendererProps {
  content: string
  size: 128 | 256 | 512
  level: "L" | "M" | "Q" | "H"
  onExportPng: () => void
  onExportSvg: () => void
  onCopyToClipboard: () => void
}

export const QrRenderer = ({
  content,
  size,
  level,
  onExportPng,
  onExportSvg,
  onCopyToClipboard
}: QrRendererProps) => {
  const svgContainerRef = useRef<HTMLDivElement>(null)
  const capacityInfo = calculateQrCapacity(content, level)

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Code SVG */}
      <div
        ref={svgContainerRef}
        className={`flex items-center justify-center rounded-lg border bg-white p-4 ${
          capacityInfo.isOverCapacity
            ? "border-red-300 dark:border-red-700"
            : "border-gray-200 dark:border-gray-700"
        }`}>
        {capacityInfo.isOverCapacity ? (
          <div
            className="flex items-center justify-center text-center text-sm text-red-600 dark:text-red-400"
            style={{ width: size, height: size }}>
            <div>
              <p className="mb-1 font-medium">内容过长</p>
              <p>
                当前 {capacityInfo.charCount} 字节，最大 {capacityInfo.maxCapacity} 字节
              </p>
            </div>
          </div>
        ) : (
          <QRCodeSVG
            value={content || " "}
            size={size}
            level={level}
          />
        )}
      </div>

      {/* Capacity Info */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        <span>
          {capacityInfo.charCount} / {capacityInfo.maxCapacity} 字节
        </span>
        <span className="mx-2">·</span>
        <span
          className={
            capacityInfo.isOverCapacity
              ? "font-medium text-red-600 dark:text-red-400"
              : ""
          }>
          {capacityInfo.percentage.toFixed(1)}%
        </span>
      </div>

      {/* Export Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onExportPng}
          disabled={capacityInfo.isOverCapacity || !content}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600">
          保存为 PNG
        </button>
        <button
          onClick={onExportSvg}
          disabled={capacityInfo.isOverCapacity || !content}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
          保存为 SVG
        </button>
        <button
          onClick={onCopyToClipboard}
          disabled={capacityInfo.isOverCapacity || !content}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
          复制到剪贴板
        </button>
      </div>
    </div>
  )
}
