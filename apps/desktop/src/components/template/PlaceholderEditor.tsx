import { useCallback, useRef, useState } from "react"

import type {
  ParseResult,
  PlaceholderValueEntry,
  Result,
  Template
} from "@quick-tools/qr-code-gen"

interface PlaceholderEditorProps {
  template: Template
  parseResult: ParseResult
  placeholderValues: PlaceholderValueEntry[]
  selections: Record<string, string>
  onSelectionChange: (placeholderName: string, value: string) => void
  onClearSelections: () => void
  onAddValue: (templateId: string, name: string, value: string) => Result<void>
  onDeleteValue: (templateId: string, name: string, value: string) => void
  onReorderValues: (templateId: string, name: string, values: string[]) => void
  onSetDefault: (
    templateId: string,
    placeholderName: string,
    defaultValue: string | undefined
  ) => void
}

export function PlaceholderEditor({
  template,
  parseResult,
  placeholderValues,
  selections,
  onSelectionChange,
  onClearSelections,
  onAddValue,
  onDeleteValue,
  onReorderValues,
  onSetDefault
}: PlaceholderEditorProps) {
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [dragState, setDragState] = useState<{
    placeholderName: string
    dragIndex: number
    overIndex: number | null
  } | null>(null)

  const dragItemRef = useRef<number | null>(null)

  const getEntry = useCallback(
    (name: string): PlaceholderValueEntry | undefined => {
      return placeholderValues.find(
        (pv) => pv.templateId === template.id && pv.placeholderName === name
      )
    },
    [placeholderValues, template.id]
  )

  const handleCustomInputChange = (name: string, value: string) => {
    setCustomInputs((prev) => ({ ...prev, [name]: value }))
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleSaveValue = (name: string) => {
    const raw = customInputs[name] ?? ""
    const trimmed = raw.trim()

    if (!trimmed) {
      setErrors((prev) => ({ ...prev, [name]: "候选值不能为空" }))
      return
    }

    const result = onAddValue(template.id, name, trimmed)
    if (!result.ok) {
      setErrors((prev) => ({ ...prev, [name]: result.error }))
      return
    }

    // Clear input on success
    setCustomInputs((prev) => ({ ...prev, [name]: "" }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const handleSelectValue = (name: string, value: string) => {
    onSelectionChange(name, value)
  }

  const handleUseCustomValue = (name: string) => {
    const raw = customInputs[name] ?? ""
    if (raw.trim()) {
      onSelectionChange(name, raw.trim())
    }
  }

  const handleToggleDefault = (name: string, value: string) => {
    const entry = getEntry(name)
    if (entry?.defaultValue === value) {
      onSetDefault(template.id, name, undefined)
    } else {
      onSetDefault(template.id, name, value)
    }
  }

  // Drag and drop handlers
  const handleDragStart = (name: string, index: number) => {
    dragItemRef.current = index
    setDragState({ placeholderName: name, dragIndex: index, overIndex: null })
  }

  const handleDragOver = (
    e: React.DragEvent,
    name: string,
    index: number
  ) => {
    e.preventDefault()
    if (dragState && dragState.placeholderName === name) {
      setDragState((prev) =>
        prev ? { ...prev, overIndex: index } : null
      )
    }
  }

  const handleDragEnd = (name: string) => {
    if (!dragState || dragState.placeholderName !== name) {
      setDragState(null)
      return
    }

    const { dragIndex, overIndex } = dragState
    if (overIndex === null || dragIndex === overIndex) {
      setDragState(null)
      return
    }

    const entry = getEntry(name)
    if (!entry) {
      setDragState(null)
      return
    }

    const newValues = [...entry.values]
    const [moved] = newValues.splice(dragIndex, 1)
    if (moved !== undefined) {
      newValues.splice(overIndex, 0, moved)
      onReorderValues(template.id, name, newValues)
    }

    setDragState(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Template Preview */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-medium text-stone-500 dark:text-stone-400">
            模板预览
          </h3>
          {parseResult.placeholderNames.length > 0 && (
            <button
              type="button"
              onClick={onClearSelections}
              className="rounded-md px-2 py-0.5 text-xs text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-700 dark:hover:text-stone-300"
              title="清除所有选择">
              清除选择
            </button>
          )}
        </div>
        <div className="break-all rounded-lg bg-stone-50 px-3 py-2 text-sm leading-relaxed dark:bg-stone-900/50">
          {parseResult.segments.map((seg, i) =>
            seg.type === "literal" ? (
              <span
                key={i}
                className="text-stone-600 dark:text-stone-400">
                {seg.value}
              </span>
            ) : (
              <span
                key={i}
                className="mx-0.5 inline-block rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {"{" + seg.value + "}"}
              </span>
            )
          )}
        </div>
      </div>

      {/* Placeholder Editors */}
      {parseResult.placeholderNames.map((name) => {
        const entry = getEntry(name)
        const values = entry?.values ?? []
        const defaultValue = entry?.defaultValue
        const selectedValue = selections[name]
        const customInput = customInputs[name] ?? ""
        const error = errors[name]

        return (
          <div
            key={name}
            className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
            <h4 className="mb-2 text-sm font-medium text-stone-700 dark:text-stone-300">
              <span className="font-mono text-blue-600 dark:text-blue-400">
                {"{" + name + "}"}
              </span>
            </h4>

            {/* Candidate values as chips */}
            {values.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {values.map((value, index) => {
                  const isSelected = selectedValue === value
                  const isDefault = defaultValue === value
                  const isDragging =
                    dragState?.placeholderName === name &&
                    dragState.dragIndex === index
                  const isDragOver =
                    dragState?.placeholderName === name &&
                    dragState.overIndex === index

                  return (
                    <div
                      key={value}
                      draggable
                      onDragStart={() => handleDragStart(name, index)}
                      onDragOver={(e) => handleDragOver(e, name, index)}
                      onDragEnd={() => handleDragEnd(name)}
                      className={`group relative flex cursor-grab items-center gap-1 rounded-lg border px-2 py-1 text-sm transition-all active:cursor-grabbing ${
                        isDragging
                          ? "opacity-50"
                          : isDragOver
                            ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30"
                            : isSelected
                              ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-950/30 dark:text-blue-300"
                              : "border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-300 dark:hover:border-stone-500 dark:hover:bg-stone-600"
                      }`}>
                      {/* Default star icon */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleDefault(name, value)
                        }}
                        className={`shrink-0 transition-colors ${
                          isDefault
                            ? "text-amber-500 dark:text-amber-400"
                            : "text-stone-300 opacity-0 group-hover:opacity-100 dark:text-stone-500"
                        }`}
                        title={isDefault ? "取消默认值" : "设为默认值"}
                        aria-label={
                          isDefault
                            ? `取消 ${value} 的默认值`
                            : `设 ${value} 为默认值`
                        }>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className="h-3 w-3">
                          <path
                            fillRule="evenodd"
                            d="M8 1.75a.75.75 0 0 1 .692.462l1.41 3.393 3.664.293a.75.75 0 0 1 .428 1.317l-2.791 2.39.853 3.575a.75.75 0 0 1-1.12.814L8 12.171l-3.136 1.823a.75.75 0 0 1-1.12-.814l.852-3.574-2.79-2.391a.75.75 0 0 1 .427-1.317l3.664-.293 1.41-3.393A.75.75 0 0 1 8 1.75Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>

                      {/* Value button */}
                      <button
                        type="button"
                        onClick={() => handleSelectValue(name, value)}
                        className="max-w-[200px] truncate">
                        {value}
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteValue(template.id, name, value)
                        }}
                        className="ml-0.5 shrink-0 text-stone-400 opacity-0 transition-colors hover:text-rose-500 group-hover:opacity-100 dark:text-stone-500 dark:hover:text-rose-400"
                        title={`删除: ${value}`}
                        aria-label={`删除候选值 ${value}`}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className="h-3 w-3">
                          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Custom input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) =>
                  handleCustomInputChange(name, e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUseCustomValue(name)
                  }
                }}
                placeholder="输入自定义值..."
                className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm outline-none transition-all focus:border-stone-400 focus:bg-white dark:border-stone-600 dark:bg-stone-700 dark:text-stone-200 dark:focus:border-stone-500 dark:focus:bg-stone-600"
              />
              <button
                type="button"
                onClick={() => handleUseCustomValue(name)}
                disabled={!customInput.trim()}
                className="shrink-0 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 transition-all hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
                title="使用此值（不保存到候选列表）">
                使用
              </button>
              <button
                type="button"
                onClick={() => handleSaveValue(name)}
                disabled={!customInput.trim()}
                className="shrink-0 rounded-lg bg-stone-700 px-2.5 py-1.5 text-xs font-medium text-white transition-all hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 dark:bg-stone-600 dark:hover:bg-stone-500 dark:disabled:bg-stone-700 dark:disabled:text-stone-500">
                保存为候选值
              </button>
            </div>

            {/* Error message */}
            {error && (
              <p className="mt-1.5 text-xs text-rose-500 dark:text-rose-400">
                {error}
              </p>
            )}

            {/* Selected value indicator */}
            {selectedValue && (
              <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
                当前选择：
                <span className="font-medium text-stone-600 dark:text-stone-300">
                  {selectedValue}
                </span>
              </p>
            )}
          </div>
        )
      })}

      {/* Empty state */}
      {parseResult.placeholderNames.length === 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
          <p className="text-center text-xs text-stone-400 dark:text-stone-500">
            此模板没有占位符，将直接使用模板内容生成二维码。
          </p>
        </div>
      )}
    </div>
  )
}
