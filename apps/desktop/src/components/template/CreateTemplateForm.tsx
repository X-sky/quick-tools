import { useMemo, useState } from "react"

import type { TemplateDraft } from "@quick-tools/qr-code-gen"
import {
  addDraftValue,
  createEmptyDraft,
  fixPlaceholderAsText,
  MAX_TEMPLATE_CONTENT_LENGTH,
  MAX_TEMPLATE_NAME_LENGTH,
  parse,
  quickSplitQuery,
  removeDraftValue,
  setDraftDefault,
  validateTemplateInput
} from "@quick-tools/qr-code-gen"

interface CreateTemplateFormProps {
  onSubmit: (name: string, templateString: string, draft: TemplateDraft) => void
  onCancel: () => void
  initialValues?: {
    id: string
    name: string
    templateString: string
    draft?: TemplateDraft
  }
  existingTemplates?: { id: string; name: string }[]
}

export function CreateTemplateForm({
  onSubmit,
  onCancel,
  initialValues,
  existingTemplates = []
}: CreateTemplateFormProps) {
  const isEditMode = !!initialValues
  const [name, setName] = useState(initialValues?.name ?? "")
  const [templateString, setTemplateString] = useState(
    initialValues?.templateString ?? ""
  )
  const [draft, setDraft] = useState<TemplateDraft>(
    initialValues?.draft ?? createEmptyDraft()
  )
  const [draftInput, setDraftInput] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState("")

  const parseResult = useMemo(() => {
    if (!templateString.trim()) return null
    return parse(templateString)
  }, [templateString])

  const parseErrors = parseResult?.errors ?? []
  const placeholders = parseResult?.placeholderNames ?? []

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

  const handleFix = (placeholder: string) => {
    const result = fixPlaceholderAsText(templateString, placeholder, draft)
    if (!result) return
    setTemplateString(result.templateString)
    setDraft(result.draft)
  }

  const handleAddDraftValue = (placeholder: string) => {
    setDraft(addDraftValue(draft, placeholder, draftInput[placeholder] ?? ""))
    setDraftInput({ ...draftInput, [placeholder]: "" })
  }

  const validateAndSubmit = () => {
    if (parseErrors.length > 0) return
    const result = validateTemplateInput(
      name,
      templateString,
      existingTemplates,
      initialValues?.id
    )
    if (!result.ok) {
      setFormError(result.error)
      return
    }
    // Only keep draft entries for placeholders that still exist.
    const live = new Set(parse(result.templateString).placeholderNames)
    const kept: TemplateDraft = { values: {}, defaults: {} }
    for (const [ph, values] of Object.entries(draft.values)) {
      if (live.has(ph)) kept.values[ph] = values
    }
    for (const [ph, def] of Object.entries(draft.defaults)) {
      if (live.has(ph) && def) kept.defaults[ph] = def
    }
    onSubmit(result.name, result.templateString, kept)
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300">
        {isEditMode ? "编辑模板" : "新建模板"}
      </h3>

      <input
        type="text"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setFormError("")
        }}
        placeholder={`模板名称（最多${MAX_TEMPLATE_NAME_LENGTH}个字符）`}
        maxLength={MAX_TEMPLATE_NAME_LENGTH}
        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-500 dark:focus:border-blue-400"
      />

      <div className="flex gap-2">
        <textarea
          value={templateString}
          onChange={(e) => {
            setTemplateString(e.target.value)
            setFormError("")
          }}
          placeholder="模板内容，如：https://example.com/{path}?id={id}"
          rows={4}
          maxLength={MAX_TEMPLATE_CONTENT_LENGTH}
          className="w-full flex-1 resize-y rounded-lg border border-stone-200 bg-white px-3 py-2 font-mono text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-500 dark:focus:border-blue-400"
        />
        <button
          type="button"
          onClick={handleQuickSplit}
          title="将 ?k=v&k2=v2 拆分为占位符"
          className="self-start whitespace-nowrap rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300">
          快捷拆分
        </button>
      </div>

      {parseErrors.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {parseErrors.map((e, i) => (
            <p key={i} className="text-xs text-amber-600 dark:text-amber-400">
              位置 {e.offset}: {e.message}
            </p>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-stone-400 dark:text-stone-500">
        <span>
          {templateString.length > 0 &&
            `${templateString.length}/${MAX_TEMPLATE_CONTENT_LENGTH} 字符`}
        </span>
        {placeholders.length > 0 && (
          <span>占位符: {placeholders.map((n) => `{${n}}`).join(", ")}</span>
        )}
      </div>

      {placeholders.length > 0 && (
        <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
            占位符候选值（可选）
          </div>
          {placeholders.map((ph) => {
            const values = draft.values[ph] ?? []
            const defaultVal = draft.defaults[ph] ?? ""
            const inputVal = draftInput[ph] ?? ""
            return (
              <div
                key={ph}
                className="flex flex-col gap-1.5 rounded-lg border border-stone-100 bg-stone-50 p-2.5 dark:border-stone-700 dark:bg-stone-900/50">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium text-rose-600 dark:text-rose-400">
                    {"{" + ph + "}"}
                  </span>
                  {defaultVal && (
                    <span className="text-xs text-stone-400">默认: {defaultVal}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleFix(ph)}
                    disabled={!defaultVal && values.length === 0}
                    title="将占位符恢复为固定文本值"
                    className="ml-auto rounded border border-stone-200 px-1.5 py-0.5 text-xs text-stone-400 transition-colors hover:border-amber-300 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-30 dark:border-stone-600">
                    固定
                  </button>
                </div>
                {values.length > 0 && (
                  <div className="flex max-h-20 flex-wrap gap-1 overflow-y-auto">
                    {values.map((v) => (
                      <span
                        key={v}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                          defaultVal === v
                            ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300"
                            : "border-stone-200 bg-white text-stone-600 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300"
                        }`}>
                        <button
                          type="button"
                          onClick={() => setDraft(setDraftDefault(draft, ph, v))}
                          title="点击设为默认值">
                          {v}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraft(removeDraftValue(draft, ph, v))}
                          aria-label={`删除候选值 ${v}`}
                          className="leading-none text-stone-400 hover:text-red-500">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setDraftInput({ ...draftInput, [ph]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddDraftValue(ph)
                    }}
                    placeholder="添加候选值..."
                    className="flex-1 rounded border border-stone-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddDraftValue(ph)}
                    disabled={!inputVal.trim()}
                    className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700 disabled:text-stone-300 dark:text-blue-400">
                    添加
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {formError && (
        <p className="text-xs text-red-500 dark:text-red-400">{formError}</p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700">
          取消
        </button>
        <button
          type="button"
          onClick={validateAndSubmit}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
          {isEditMode ? "保存" : "创建"}
        </button>
      </div>
    </div>
  )
}
