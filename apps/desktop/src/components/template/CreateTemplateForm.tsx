import { useMemo, useState } from "react"

import { parse } from "@quick-tools/qr-code-gen"

interface CreateTemplateFormProps {
  onSubmit: (name: string, templateString: string) => void
  onCancel: () => void
  initialValues?: {
    name: string
    templateString: string
  }
  existingNames?: string[]
}

export function CreateTemplateForm({
  onSubmit,
  onCancel,
  initialValues,
  existingNames = []
}: CreateTemplateFormProps) {
  const isEditMode = !!initialValues
  const [name, setName] = useState(initialValues?.name ?? "")
  const [templateString, setTemplateString] = useState(
    initialValues?.templateString ?? ""
  )
  const [nameError, setNameError] = useState("")
  const [contentError, setContentError] = useState("")

  const parseResult = useMemo(() => {
    if (!templateString.trim()) return null
    return parse(templateString)
  }, [templateString])

  const parseErrors = parseResult?.errors ?? []

  const validateAndSubmit = () => {
    const trimmedName = name.trim()
    const trimmedContent = templateString.trim()

    // Reset errors
    setNameError("")
    setContentError("")

    let hasError = false

    // Name validation
    if (!trimmedName) {
      setNameError("模板名称不能为空")
      hasError = true
    } else if (trimmedName.length > 50) {
      setNameError("模板名称不能超过50个字符")
      hasError = true
    } else {
      const isDuplicate = existingNames.some(
        (n) => n === trimmedName && n !== initialValues?.name
      )
      if (isDuplicate) {
        setNameError("模板名称已存在")
        hasError = true
      }
    }

    // Content validation
    if (!trimmedContent) {
      setContentError("模板内容不能为空")
      hasError = true
    } else if (parseErrors.length > 0) {
      hasError = true
    }

    if (hasError) return

    onSubmit(trimmedName, trimmedContent)
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300">
        {isEditMode ? "编辑模板" : "新建模板"}
      </h3>

      {/* Name input */}
      <div className="flex flex-col gap-1">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setNameError("")
          }}
          placeholder="模板名称（最多50个字符）"
          maxLength={50}
          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-500 dark:focus:border-blue-400"
        />
        {nameError && (
          <p className="text-xs text-red-500 dark:text-red-400">
            {nameError}
          </p>
        )}
      </div>

      {/* Template string textarea */}
      <div className="flex flex-col gap-1">
        <textarea
          value={templateString}
          onChange={(e) => {
            setTemplateString(e.target.value)
            setContentError("")
          }}
          placeholder="模板内容，如：https://example.com/{path}?id={id}"
          rows={4}
          maxLength={10000}
          className="w-full resize-y rounded-lg border border-stone-200 bg-white px-3 py-2 font-mono text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-500 dark:focus:border-blue-400"
        />
        {contentError && (
          <p className="text-xs text-red-500 dark:text-red-400">
            {contentError}
          </p>
        )}
        {parseErrors.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {parseErrors.map((e, i) => (
              <p
                key={i}
                className="text-xs text-amber-600 dark:text-amber-400">
                位置 {e.offset}: {e.message}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Character count hint */}
      <div className="flex items-center justify-between text-xs text-stone-400 dark:text-stone-500">
        <span>
          {templateString.length > 0 && `${templateString.length}/10000 字符`}
        </span>
        {parseResult && parseResult.placeholderNames.length > 0 && (
          <span>
            占位符: {parseResult.placeholderNames.map((n) => `{${n}}`).join(", ")}
          </span>
        )}
      </div>

      {/* Action buttons */}
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
