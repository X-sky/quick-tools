import { useState } from "react"

import { CheckIcon, CopyIcon } from "~icons"

import { useTemplate } from "../context"
import { parse } from "../parser"
import { render } from "../renderer"

export const TemplateInputSection = () => {
  const { store, activeTemplateId, selections } = useTemplate()
  const [copied, setCopied] = useState(false)

  const template = store.templates.find((t) => t.id === activeTemplateId)
  const parseResult = template ? parse(template.templateString) : null
  const placeholderNames = parseResult?.placeholderNames ?? []
  const allSelected =
    template && placeholderNames.every((name) => !!selections[name])
  const finalString =
    template && allSelected
      ? render(template.templateString, selections)
      : ""

  const handleCopy = () => {
    if (!finalString) return
    navigator.clipboard.writeText(finalString)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="plasmo-bg-white plasmo-px-5 plasmo-py-3 plasmo-shadow-sm plasmo-z-10 plasmo-flex plasmo-items-center plasmo-gap-3">
      <div className="plasmo-flex-1 plasmo-min-w-0">
        <div
          className={`plasmo-w-full plasmo-px-3 plasmo-py-2 plasmo-rounded-lg plasmo-border plasmo-text-sm plasmo-font-mono plasmo-truncate plasmo-select-all plasmo-cursor-default
            ${
              finalString
                ? "plasmo-bg-stone-50 plasmo-border-stone-200 plasmo-text-stone-700"
                : "plasmo-bg-stone-100 plasmo-border-stone-200 plasmo-text-stone-400"
            }`}
          title={finalString || "请选择模板并填写占位符"}>
          {finalString || (
            template
              ? "请为所有占位符选择候选值"
              : "请在下方选择或新建模板"
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        disabled={!finalString}
        title="复制最终链接"
        className={`plasmo-shrink-0 plasmo-px-4 plasmo-py-2 plasmo-rounded-lg plasmo-flex plasmo-items-center plasmo-gap-1.5 plasmo-text-sm plasmo-font-medium plasmo-transition-all plasmo-duration-200 active:plasmo-scale-[0.97]
          ${
            !finalString
              ? "plasmo-bg-stone-100 plasmo-text-stone-400 plasmo-cursor-not-allowed"
              : copied
                ? "plasmo-bg-emerald-500 plasmo-text-white"
                : "plasmo-bg-gradient-to-br plasmo-from-rose-500 plasmo-to-rose-600 plasmo-text-white hover:plasmo-from-rose-600 hover:plasmo-to-rose-700 plasmo-shadow-md hover:plasmo-shadow-lg"
          }`}>
        {copied ? (
          <>
            <CheckIcon className="plasmo-w-4 plasmo-h-4" />
            已复制
          </>
        ) : (
          <>
            <CopyIcon className="plasmo-w-4 plasmo-h-4" />
            复制
          </>
        )}
      </button>
    </div>
  )
}
