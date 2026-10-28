import { calculateQrCapacity } from "@quick-tools/qr-code-gen"
import { QRCodeSVG } from "qrcode.react"
import { useRef } from "react"

import { QrExportBar } from "../../components/QrExportBar"
import { useQrCode } from "../../context"
import { parse } from "../parser"
import { render } from "../renderer"
import { useTemplate } from "../context"

export const TemplateQrDisplay = () => {
  const { store, activeTemplateId, selections } = useTemplate()
  const { size, setSize, level, setLevel } = useQrCode()
  const svgContainerRef = useRef<HTMLDivElement>(null)

  const activeTemplate = store.templates.find(
    (t) => t.id === activeTemplateId
  )

  if (!activeTemplate) {
    return (
      <div className="plasmo-w-[200px] plasmo-bg-white plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-p-4 plasmo-relative plasmo-overflow-hidden">
        <div className="plasmo-w-[140px] plasmo-h-[140px] plasmo-rounded-2xl plasmo-bg-stone-100 plasmo-border-2 plasmo-border-dashed plasmo-border-stone-200 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-text-stone-300">
          <div className="plasmo-text-xs plasmo-font-medium plasmo-text-center plasmo-px-4">
            请选择模板
          </div>
        </div>
      </div>
    )
  }

  const parseResult = parse(activeTemplate.templateString)
  const { placeholderNames } = parseResult

  // Check if any placeholder has zero candidates
  const emptyPlaceholder = placeholderNames.find((name) => {
    const entry = store.placeholderValues.find(
      (pv) =>
        pv.templateId === activeTemplateId && pv.placeholderName === name
    )
    return !entry || entry.values.length === 0
  })

  if (emptyPlaceholder) {
    return (
      <div className="plasmo-w-[200px] plasmo-bg-white plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-p-4 plasmo-relative plasmo-overflow-hidden">
        <div className="plasmo-w-[140px] plasmo-h-[140px] plasmo-rounded-2xl plasmo-bg-stone-100 plasmo-border-2 plasmo-border-dashed plasmo-border-stone-200 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-text-stone-300">
          <div className="plasmo-text-xs plasmo-font-medium plasmo-text-center plasmo-px-4">
            请先为占位符 {emptyPlaceholder} 添加候选值
          </div>
        </div>
      </div>
    )
  }

  // Check if all placeholders have selections
  const allFilled = placeholderNames.every((name) => !!selections[name])

  if (!allFilled) {
    return (
      <div className="plasmo-w-[200px] plasmo-bg-white plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-p-4 plasmo-relative plasmo-overflow-hidden">
        <div className="plasmo-w-[140px] plasmo-h-[140px] plasmo-rounded-2xl plasmo-bg-stone-100 plasmo-border-2 plasmo-border-dashed plasmo-border-stone-200 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-text-stone-300">
          <div className="plasmo-text-xs plasmo-font-medium plasmo-text-center plasmo-px-4">
            请为所有占位符选择候选值
          </div>
        </div>
      </div>
    )
  }

  const finalString = render(activeTemplate.templateString, selections)
  const capacity = calculateQrCapacity(finalString, level)

  return (
    <div className="plasmo-w-[200px] plasmo-bg-white plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-gap-3 plasmo-p-3 plasmo-relative plasmo-overflow-hidden">
      {/* Background decoration */}
      <div className="plasmo-absolute plasmo-inset-0 plasmo-opacity-[0.03] plasmo-pointer-events-none">
        <div className="plasmo-absolute -plasmo-top-10 -plasmo-right-10 plasmo-w-40 plasmo-h-40 plasmo-bg-rose-500 plasmo-rounded-full plasmo-blur-3xl"></div>
        <div className="plasmo-absolute -plasmo-bottom-10 -plasmo-left-10 plasmo-w-40 plasmo-h-40 plasmo-bg-orange-500 plasmo-rounded-full plasmo-blur-3xl"></div>
      </div>

      <div className="plasmo-relative plasmo-transition-all plasmo-duration-500 plasmo-transform plasmo-opacity-100 plasmo-scale-100 plasmo-blur-0">
        {capacity.isOverCapacity ? (
          <div className="plasmo-w-[140px] plasmo-h-[140px] plasmo-rounded-2xl plasmo-border-2 plasmo-border-red-200 plasmo-bg-red-50 plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-text-center plasmo-text-xs plasmo-text-red-600 plasmo-px-3">
            <div className="plasmo-font-medium">容量超限</div>
            <div>请缩短内容或降低纠错等级</div>
          </div>
        ) : (
          <div
            ref={svgContainerRef}
            className="plasmo-p-3 plasmo-bg-white plasmo-rounded-2xl plasmo-shadow-lg plasmo-border plasmo-border-stone-100">
            <QRCodeSVG
              value={finalString}
              size={140}
              level={level}
              includeMargin={false}
              className="plasmo-rounded-lg"
              fgColor="#1c1917"
            />
          </div>
        )}
      </div>

      <div className="plasmo-relative plasmo-w-full">
        <QrExportBar
          svgContainerRef={svgContainerRef}
          content={finalString}
          size={size}
          onSizeChange={setSize}
          level={level}
          onLevelChange={setLevel}
          filePrefix="qr-template"
        />
      </div>
    </div>
  )
}
