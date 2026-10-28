import type { Template, TemplateDraft } from "@quick-tools/qr-code-gen"
import {
  addDraftValue,
  createEmptyDraft,
  draftFromStoredValues,
  fixPlaceholderAsText,
  MAX_TEMPLATE_CONTENT_LENGTH,
  MAX_TEMPLATE_NAME_LENGTH,
  quickSplitQuery,
  removeDraftValue,
  setDraftDefault
} from "@quick-tools/qr-code-gen"
import { useMemo, useState } from "react"

import { useTemplate } from "../context"
import { parse } from "../parser"

interface CreateTemplateFormProps {
  onClose: () => void
  /** When set, the form edits this template instead of creating a new one. */
  editingTemplate?: Template
}

export const CreateTemplateForm = ({
  onClose,
  editingTemplate
}: CreateTemplateFormProps) => {
  const {
    store,
    createTemplate,
    updateTemplate,
    setActiveTemplateId,
    addPlaceholderValue,
    setDefaultValue
  } = useTemplate()

  const [name, setName] = useState(editingTemplate?.name ?? "")
  const [templateString, setTemplateString] = useState(
    editingTemplate?.templateString ?? ""
  )
  const [formError, setFormError] = useState("")
  const [draft, setDraft] = useState<TemplateDraft>(() =>
    editingTemplate
      ? draftFromStoredValues(
          store.placeholderValues.filter(
            (pv) => pv.templateId === editingTemplate.id
          )
        )
      : createEmptyDraft()
  )
  const [draftInput, setDraftInput] = useState<Record<string, string>>({})

  const createParseResult = useMemo(() => {
    if (!templateString.trim()) return null
    return parse(templateString)
  }, [templateString])

  const createParseErrors = createParseResult?.errors ?? []
  const createPlaceholders = createParseResult?.placeholderNames ?? []

  const handleQuickSplit = () => {
    const result = quickSplitQuery(templateString, draft)
    if (!result) {
      setFormError("模板内容中没有 ? 查询参数，无法拆分")
      return
    }
    setTemplateString(result.templateString)
    setDraft(result.draft)
    setFormError("")
  }

  const handleFixAsText = (placeholder: string) => {
    const result = fixPlaceholderAsText(templateString, placeholder, draft)
    if (!result) return
    setTemplateString(result.templateString)
    setDraft(result.draft)
  }

  const handleAddDraftValue = (placeholder: string) => {
    setDraft(addDraftValue(draft, placeholder, draftInput[placeholder] ?? ""))
    setDraftInput({ ...draftInput, [placeholder]: "" })
  }

  const handleSubmit = () => {
    setFormError("")
    if (createParseErrors.length > 0) return
    const result = editingTemplate
      ? updateTemplate(editingTemplate.id, { name, templateString })
      : createTemplate(name, templateString)
    if (result.ok === false) {
      setFormError(result.error)
      return
    }
    const templateId = result.value.id
    const live = new Set(parse(result.value.templateString).placeholderNames)
    for (const [ph, values] of Object.entries(draft.values)) {
      if (!live.has(ph)) continue
      for (const v of values) addPlaceholderValue(templateId, ph, v)
    }
    for (const [ph, def] of Object.entries(draft.defaults)) {
      if (live.has(ph) && def) setDefaultValue(templateId, ph, def)
    }
    setActiveTemplateId(templateId)
    onClose()
  }

  return (
    <div className="plasmo-flex plasmo-flex-col plasmo-gap-2 plasmo-p-3 plasmo-bg-white plasmo-rounded-xl plasmo-border plasmo-border-rose-200 plasmo-shadow-sm">
      <input
        type="text"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setFormError("")
        }}
        maxLength={MAX_TEMPLATE_NAME_LENGTH}
        placeholder={`模板名称（最多${MAX_TEMPLATE_NAME_LENGTH}个字符）`}
        className="plasmo-w-full plasmo-px-2 plasmo-py-1.5 plasmo-text-sm plasmo-rounded plasmo-border plasmo-border-stone-200 plasmo-outline-none focus:plasmo-border-rose-400 plasmo-bg-white"
      />
      <div className="plasmo-flex plasmo-gap-1.5">
        <textarea
          value={templateString}
          onChange={(e) => {
            setTemplateString(e.target.value)
            setFormError("")
          }}
          maxLength={MAX_TEMPLATE_CONTENT_LENGTH}
          placeholder="模板内容，如：https://example.com/{path}?id={id}"
          rows={2}
          className="plasmo-flex-1 plasmo-px-2 plasmo-py-1.5 plasmo-text-sm plasmo-rounded plasmo-border plasmo-border-stone-200 plasmo-outline-none focus:plasmo-border-rose-400 plasmo-bg-white plasmo-resize-none plasmo-font-mono"
        />
        <button
          type="button"
          onClick={handleQuickSplit}
          title="将 ?k=v&k2=v2 拆分为占位符"
          className="plasmo-self-start plasmo-px-2 plasmo-py-1.5 plasmo-text-xs plasmo-font-medium plasmo-text-indigo-600 plasmo-bg-indigo-50 plasmo-border plasmo-border-indigo-200 plasmo-rounded hover:plasmo-bg-indigo-100 plasmo-transition-colors plasmo-whitespace-nowrap">
          快捷拆分
        </button>
      </div>

      <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-text-[11px] plasmo-text-stone-400">
        <span>
          {templateString.length > 0 &&
            `${templateString.length}/${MAX_TEMPLATE_CONTENT_LENGTH} 字符`}
        </span>
        {createPlaceholders.length > 0 && (
          <span className="plasmo-truncate plasmo-max-w-[60%]">
            占位符: {createPlaceholders.map((n) => `{${n}}`).join(", ")}
          </span>
        )}
      </div>

      {createParseErrors.length > 0 && (
        <div className="plasmo-text-xs plasmo-text-amber-600">
          {createParseErrors.map((e, i) => (
            <div key={i}>
              位置 {e.offset}: {e.message}
            </div>
          ))}
        </div>
      )}

      {createPlaceholders.length > 0 && (
        <div className="plasmo-flex plasmo-flex-col plasmo-gap-2 plasmo-mt-1 plasmo-max-h-[200px] plasmo-overflow-y-auto">
          <div className="plasmo-text-xs plasmo-font-medium plasmo-text-stone-500">
            占位符候选值（可选）
          </div>
          {createPlaceholders.map((ph) => {
            const values = draft.values[ph] ?? []
            const inputVal = draftInput[ph] ?? ""
            const defaultVal = draft.defaults[ph] ?? ""
            return (
              <div
                key={ph}
                className="plasmo-flex plasmo-flex-col plasmo-gap-1 plasmo-p-2 plasmo-bg-stone-50 plasmo-rounded plasmo-border plasmo-border-stone-100">
                <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
                  <span className="plasmo-text-xs plasmo-font-mono plasmo-text-rose-600 plasmo-font-medium">
                    {"{" + ph + "}"}
                  </span>
                  {defaultVal && (
                    <span className="plasmo-text-xs plasmo-text-stone-400">
                      默认: {defaultVal}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleFixAsText(ph)}
                    disabled={!defaultVal && values.length === 0}
                    title="将占位符恢复为固定文本值"
                    className="plasmo-ml-auto plasmo-px-1.5 plasmo-py-0.5 plasmo-text-xs plasmo-text-stone-400 plasmo-border plasmo-border-stone-200 plasmo-rounded hover:plasmo-text-amber-600 hover:plasmo-border-amber-300 disabled:plasmo-opacity-30 disabled:plasmo-cursor-not-allowed plasmo-transition-colors">
                    固定
                  </button>
                </div>
                {values.length > 0 && (
                  <div className="plasmo-flex plasmo-flex-wrap plasmo-gap-1 plasmo-max-h-[80px] plasmo-overflow-y-auto">
                    {values.map((v) => (
                      <span
                        key={v}
                        className={`plasmo-inline-flex plasmo-items-center plasmo-gap-0.5 plasmo-px-2 plasmo-py-0.5 plasmo-text-xs plasmo-rounded-full plasmo-border plasmo-cursor-pointer plasmo-transition-colors
                          ${
                            defaultVal === v
                              ? "plasmo-bg-rose-50 plasmo-border-rose-300 plasmo-text-rose-700"
                              : "plasmo-bg-white plasmo-border-stone-200 plasmo-text-stone-600"
                          }`}
                        onClick={() => setDraft(setDraftDefault(draft, ph, v))}
                        title="点击设为默认值">
                        {v}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDraft(removeDraftValue(draft, ph, v))
                          }}
                          className="plasmo-text-stone-400 hover:plasmo-text-red-500 plasmo-leading-none">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="plasmo-flex plasmo-items-center plasmo-gap-1">
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) =>
                      setDraftInput({ ...draftInput, [ph]: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddDraftValue(ph)
                    }}
                    placeholder="添加候选值..."
                    className="plasmo-flex-1 plasmo-px-2 plasmo-py-1 plasmo-text-xs plasmo-rounded plasmo-border plasmo-border-stone-200 plasmo-outline-none focus:plasmo-border-rose-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddDraftValue(ph)}
                    disabled={!inputVal.trim()}
                    className="plasmo-px-2 plasmo-py-1 plasmo-text-xs plasmo-text-rose-600 hover:plasmo-text-rose-700 disabled:plasmo-text-stone-300 plasmo-transition-colors">
                    添加
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {formError && (
        <div className="plasmo-text-xs plasmo-text-red-500">{formError}</div>
      )}

      <div className="plasmo-flex plasmo-gap-2 plasmo-justify-end">
        <button
          type="button"
          onClick={onClose}
          className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-text-stone-500 plasmo-border plasmo-border-stone-200 plasmo-rounded hover:plasmo-bg-stone-100 plasmo-transition-colors">
          取消
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-font-medium plasmo-bg-rose-500 plasmo-text-white plasmo-rounded hover:plasmo-bg-rose-600 plasmo-transition-colors">
          {editingTemplate ? "保存" : "创建模板"}
        </button>
      </div>
    </div>
  )
}
