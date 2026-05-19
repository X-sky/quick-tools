import { useState } from "react"

import { useTemplate } from "../context"
import { parse } from "../parser"
import { render } from "../renderer"

export const PlaceholderEditor = () => {
  const {
    store,
    activeTemplateId,
    selections,
    setSelection,
    addPlaceholderValue,
    deletePlaceholderValue,
    setDefaultValue
  } = useTemplate()

  const [customValues, setCustomValues] = useState<Record<string, string>>({})

  const template = store.templates.find((t) => t.id === activeTemplateId)

  if (!template) {
    return null
  }

  const parseResult = parse(template.templateString)
  const placeholderNames = parseResult.placeholderNames

  // Get candidate values for a placeholder
  const getEntry = (name: string) => {
    return store.placeholderValues.find(
      (pv) =>
        pv.templateId === activeTemplateId && pv.placeholderName === name
    )
  }

  const getCandidates = (name: string): string[] => {
    return getEntry(name)?.values ?? []
  }

  const getDefault = (name: string): string | undefined => {
    return getEntry(name)?.defaultValue
  }

  // Check if all placeholders have selections
  const allSelected = placeholderNames.every((name) => !!selections[name])

  // Compute Final_String when all placeholders are filled
  const finalString = allSelected
    ? render(template.templateString, selections)
    : null

  // Render template preview with highlighted placeholders
  const renderPreview = () => {
    return parseResult.segments.map((segment, idx) => {
      if (segment.type === "placeholder") {
        return (
          <span
            key={idx}
            className="plasmo-inline-block plasmo-px-1.5 plasmo-py-0.5 plasmo-bg-rose-100 plasmo-text-rose-600 plasmo-rounded plasmo-font-mono plasmo-text-sm plasmo-font-medium">
            {"{" + segment.value + "}"}
          </span>
        )
      }
      return (
        <span key={idx} className="plasmo-text-stone-700">
          {segment.value}
        </span>
      )
    })
  }

  const handleCustomValueChange = (name: string, value: string) => {
    setCustomValues((prev) => ({ ...prev, [name]: value }))
    if (value.trim()) {
      setSelection(name, value)
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setSelection(name, value)
    setCustomValues((prev) => ({ ...prev, [name]: "" }))
  }

  const handleSaveAsCandidate = (name: string) => {
    const value = customValues[name]
    if (value && value.trim()) {
      addPlaceholderValue(template.id, name, value.trim())
      setCustomValues((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleSetDefault = (phName: string, value: string) => {
    const current = getDefault(phName)
    // Toggle: if already default, clear it
    setDefaultValue(
      template.id,
      phName,
      current === value ? undefined : value
    )
  }

  const handleDeleteValue = (phName: string, value: string) => {
    deletePlaceholderValue(template.id, phName, value)
    // Clear default if deleted value was the default
    if (getDefault(phName) === value) {
      setDefaultValue(template.id, phName, undefined)
    }
  }

  return (
    <div className="plasmo-flex plasmo-flex-col plasmo-gap-3">
      {/* Template preview */}
      <div className="plasmo-p-2.5 plasmo-bg-stone-50 plasmo-rounded-lg plasmo-border plasmo-border-stone-200">
        <div className="plasmo-text-xs plasmo-text-stone-400 plasmo-mb-1 plasmo-font-medium">
          模板预览
        </div>
        <div className="plasmo-text-sm plasmo-leading-relaxed plasmo-break-all">
          {renderPreview()}
        </div>
      </div>

      {/* Placeholder selectors */}
      {placeholderNames.map((name) => {
        const candidates = getCandidates(name)
        const customValue = customValues[name] ?? ""
        const defaultVal = getDefault(name)

        return (
          <div
            key={name}
            className="plasmo-flex plasmo-flex-col plasmo-gap-1.5 plasmo-p-2.5 plasmo-bg-white plasmo-rounded-lg plasmo-border plasmo-border-stone-200">
            <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
              <label className="plasmo-text-sm plasmo-font-medium plasmo-text-stone-700">
                {name}
              </label>
              {defaultVal && (
                <span className="plasmo-text-xs plasmo-text-stone-400">
                  默认: {defaultVal}
                </span>
              )}
            </div>

            {/* Candidate value chips */}
            {candidates.length > 0 && (
              <div className="plasmo-flex plasmo-flex-wrap plasmo-gap-1">
                {candidates.map((val) => (
                  <span
                    key={val}
                    className={`plasmo-inline-flex plasmo-items-center plasmo-gap-0.5 plasmo-px-2 plasmo-py-0.5 plasmo-text-xs plasmo-rounded-full plasmo-border plasmo-cursor-pointer plasmo-transition-colors
                      ${
                        selections[name] === val
                          ? "plasmo-bg-rose-100 plasmo-border-rose-300 plasmo-text-rose-700"
                          : defaultVal === val
                            ? "plasmo-bg-indigo-50 plasmo-border-indigo-200 plasmo-text-indigo-600"
                            : "plasmo-bg-stone-50 plasmo-border-stone-200 plasmo-text-stone-600 hover:plasmo-border-rose-200"
                      }`}
                    onClick={() => handleSelectChange(name, val)}
                    title={
                      defaultVal === val
                        ? "默认值 (点击选择)"
                        : "点击选择"
                    }>
                    {defaultVal === val && (
                      <span className="plasmo-text-indigo-400">★</span>
                    )}
                    {val}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSetDefault(name, val)
                      }}
                      className="plasmo-ml-0.5 plasmo-text-stone-300 hover:plasmo-text-indigo-500 plasmo-transition-colors plasmo-leading-none"
                      title="设为默认值">
                      ◆
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteValue(name, val)
                      }}
                      className="plasmo-text-stone-300 hover:plasmo-text-red-500 plasmo-transition-colors plasmo-leading-none"
                      title="删除候选值">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Custom value input */}
            <div className="plasmo-flex plasmo-items-center plasmo-gap-1.5">
              <input
                type="text"
                value={customValue}
                onChange={(e) =>
                  handleCustomValueChange(name, e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customValue.trim()) {
                    handleSaveAsCandidate(name)
                  }
                }}
                placeholder="输入值..."
                className="plasmo-flex-1 plasmo-px-2 plasmo-py-1.5 plasmo-rounded plasmo-border plasmo-border-stone-200 plasmo-bg-white plasmo-text-sm plasmo-text-stone-700 plasmo-outline-none focus:plasmo-border-rose-400 plasmo-transition-colors"
              />
              {customValue.trim() && (
                <button
                  type="button"
                  onClick={() => handleSaveAsCandidate(name)}
                  className="plasmo-px-2 plasmo-py-1.5 plasmo-text-xs plasmo-font-medium plasmo-text-rose-600 plasmo-bg-rose-50 plasmo-border plasmo-border-rose-200 plasmo-rounded hover:plasmo-bg-rose-100 plasmo-transition-colors plasmo-whitespace-nowrap">
                  保存
                </button>
              )}
            </div>

            {candidates.length === 0 && !customValue.trim() && (
              <div className="plasmo-text-xs plasmo-text-stone-400">
                请添加候选值
              </div>
            )}
          </div>
        )
      })}

      {/* Messages */}
      {!allSelected && placeholderNames.length > 0 && (
        <div className="plasmo-text-xs plasmo-text-amber-600 plasmo-bg-amber-50 plasmo-px-2.5 plasmo-py-1.5 plasmo-rounded plasmo-border plasmo-border-amber-200">
          请为所有占位符选择候选值
        </div>
      )}

      {/* Final_String display */}
      {finalString !== null && (
        <div className="plasmo-p-2.5 plasmo-bg-emerald-50 plasmo-rounded-lg plasmo-border plasmo-border-emerald-200">
          <div className="plasmo-text-xs plasmo-text-emerald-600 plasmo-mb-1 plasmo-font-medium">
            生成内容
          </div>
          <div className="plasmo-text-sm plasmo-text-stone-800 plasmo-break-all plasmo-font-mono">
            {finalString}
          </div>
        </div>
      )}
    </div>
  )
}
