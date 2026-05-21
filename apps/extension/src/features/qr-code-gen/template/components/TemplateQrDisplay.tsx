import { QRCodeSVG } from "qrcode.react"

import { parse } from "../parser"
import { render } from "../renderer"
import { useTemplate } from "../context"

export const TemplateQrDisplay = () => {
  const { store, activeTemplateId, selections } = useTemplate()

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
  const isOverLength = finalString.length > 2953

  return (
    <div className="plasmo-w-[200px] plasmo-bg-white plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-p-4 plasmo-relative plasmo-overflow-hidden">
      {/* Background decoration */}
      <div className="plasmo-absolute plasmo-inset-0 plasmo-opacity-[0.03] plasmo-pointer-events-none">
        <div className="plasmo-absolute -plasmo-top-10 -plasmo-right-10 plasmo-w-40 plasmo-h-40 plasmo-bg-rose-500 plasmo-rounded-full plasmo-blur-3xl"></div>
        <div className="plasmo-absolute -plasmo-bottom-10 -plasmo-left-10 plasmo-w-40 plasmo-h-40 plasmo-bg-orange-500 plasmo-rounded-full plasmo-blur-3xl"></div>
      </div>

      <div className="plasmo-relative plasmo-transition-all plasmo-duration-500 plasmo-transform plasmo-opacity-100 plasmo-scale-100 plasmo-blur-0">
        <div className="plasmo-p-3 plasmo-bg-white plasmo-rounded-2xl plasmo-shadow-lg plasmo-border plasmo-border-stone-100">
          <QRCodeSVG
            value={finalString}
            size={140}
            level="M"
            includeMargin={false}
            className="plasmo-rounded-lg"
            fgColor="#1c1917"
          />
        </div>
      </div>

      {isOverLength && (
        <div className="plasmo-mt-3 plasmo-text-xs plasmo-text-amber-600 plasmo-bg-amber-50 plasmo-px-3 plasmo-py-1 plasmo-rounded-full plasmo-text-center">
          内容过长，二维码可能无法被识别
        </div>
      )}
    </div>
  )
}
