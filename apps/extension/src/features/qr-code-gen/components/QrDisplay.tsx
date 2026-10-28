import { calculateQrCapacity } from "@quick-tools/qr-code-gen"
import { QRCodeSVG } from "qrcode.react"
import { useRef } from "react"

import { useQrCode } from "../context"
import { QrExportBar } from "./QrExportBar"

export function QrDisplay() {
  const { text, isConfirmed, size, setSize, level, setLevel } = useQrCode()
  const svgContainerRef = useRef<HTMLDivElement>(null)
  const capacity = calculateQrCapacity(text, level)

  return (
    <div className="plasmo-w-[200px] plasmo-bg-white plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-gap-3 plasmo-p-3 plasmo-relative plasmo-overflow-hidden">
      {/* Background decoration */}
      <div className="plasmo-absolute plasmo-inset-0 plasmo-opacity-[0.03] plasmo-pointer-events-none">
        <div className="plasmo-absolute -plasmo-top-10 -plasmo-right-10 plasmo-w-40 plasmo-h-40 plasmo-bg-rose-500 plasmo-rounded-full plasmo-blur-3xl"></div>
        <div className="plasmo-absolute -plasmo-bottom-10 -plasmo-left-10 plasmo-w-40 plasmo-h-40 plasmo-bg-orange-500 plasmo-rounded-full plasmo-blur-3xl"></div>
      </div>

      <div
        className={`plasmo-relative plasmo-transition-all plasmo-duration-500 plasmo-transform
          ${
            isConfirmed
              ? "plasmo-opacity-100 plasmo-scale-100 plasmo-blur-0"
              : "plasmo-opacity-20 plasmo-scale-95 plasmo-blur-sm plasmo-grayscale"
          }`}>
        {text && capacity.isOverCapacity ? (
          <div className="plasmo-w-[140px] plasmo-h-[140px] plasmo-rounded-2xl plasmo-border-2 plasmo-border-red-200 plasmo-bg-red-50 plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-text-center plasmo-text-xs plasmo-text-red-600 plasmo-px-3">
            <div className="plasmo-font-medium">内容过长</div>
            <div>
              {capacity.charCount} / {capacity.maxCapacity} 字节
            </div>
          </div>
        ) : text ? (
          <div
            ref={svgContainerRef}
            className="plasmo-p-3 plasmo-bg-white plasmo-rounded-2xl plasmo-shadow-lg plasmo-border plasmo-border-stone-100">
            <QRCodeSVG
              value={text}
              size={140}
              level={level}
              includeMargin={false}
              className="plasmo-rounded-lg"
              fgColor="#1c1917" // stone-900
            />
          </div>
        ) : (
          <div className="plasmo-w-[140px] plasmo-h-[140px] plasmo-rounded-2xl plasmo-bg-stone-100 plasmo-border-2 plasmo-border-dashed plasmo-border-stone-200 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-text-stone-300">
            <div className="plasmo-text-xs plasmo-font-medium plasmo-text-center plasmo-px-4">
              Enter text to
              <br />
              generate QR
            </div>
          </div>
        )}
      </div>

      <div className="plasmo-relative plasmo-w-full">
        <QrExportBar
          svgContainerRef={svgContainerRef}
          content={text}
          size={size}
          onSizeChange={setSize}
          level={level}
          onLevelChange={setLevel}
          disabled={!isConfirmed}
        />
      </div>
    </div>
  )
}
