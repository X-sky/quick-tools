import { useRef, useState } from "react"

import { useTemplate } from "../context"
import { parse } from "../parser"
import { CreateTemplateForm } from "./CreateTemplateForm"

interface TemplateCardBodyProps {
  templateId: string
}

export const TemplateCardBody = ({ templateId }: TemplateCardBodyProps) => {
  const {
    store,
    selections,
    setSelection,
    clearSelections,
    addPlaceholderValue,
    deletePlaceholderValue,
    reorderPlaceholderValues,
    setDefaultValue,
    saveCombinationTag,
    deleteCombinationTag,
    recallCombinationTag
  } = useTemplate()

  const template = store.templates.find((t) => t.id === templateId)
  const [showEditForm, setShowEditForm] = useState(false)
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [valueErrors, setValueErrors] = useState<Record<string, string>>({})
  const [tagName, setTagName] = useState("")
  const [tagMessage, setTagMessage] = useState<{
    type: "error" | "warning"
    text: string
  } | null>(null)
  const [pendingOverwrite, setPendingOverwrite] = useState<string | null>(null)
  const dragRef = useRef<{ name: string; index: number } | null>(null)
  const [dragOver, setDragOver] = useState<{ name: string; index: number } | null>(
    null
  )

  if (!template) return null

  const parseResult = parse(template.templateString)
  const placeholderNames = parseResult.placeholderNames

  const getEntry = (name: string) =>
    store.placeholderValues.find(
      (pv) => pv.templateId === templateId && pv.placeholderName === name
    )

  const getCandidates = (name: string): string[] =>
    getEntry(name)?.values ?? []

  const getDefault = (name: string): string | undefined =>
    getEntry(name)?.defaultValue

  const tags = store.combinationTags
    .filter((ct) => ct.templateId === templateId)
    .sort((a, b) => b.createdAt - a.createdAt)

  const handleStartEdit = () => {
    setShowEditForm(true)
  }

  const flashTagMessage = (type: "error" | "warning", text: string) => {
    setTagMessage({ type, text })
    setTimeout(() => setTagMessage(null), type === "error" ? 3000 : 5000)
  }

  const handleDrop = (name: string, toIndex: number) => {
    const from = dragRef.current
    dragRef.current = null
    setDragOver(null)
    if (!from || from.name !== name || from.index === toIndex) return
    const values = [...getCandidates(name)]
    const [moved] = values.splice(from.index, 1)
    values.splice(toIndex, 0, moved)
    reorderPlaceholderValues(templateId, name, values)
  }

  const handleCustomValueChange = (name: string, value: string) => {
    setCustomValues((prev) => ({ ...prev, [name]: value }))
    if (value.trim()) {
      setSelection(name, value)
    }
  }

  const handleSaveAsCandidate = (name: string) => {
    const value = customValues[name]
    if (value && value.trim()) {
      const result = addPlaceholderValue(templateId, name, value.trim())
      if (result.ok === false) {
        setValueErrors((prev) => ({ ...prev, [name]: result.error }))
        return
      }
      setValueErrors((prev) => ({ ...prev, [name]: "" }))
      setCustomValues((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setSelection(name, value)
    setCustomValues((prev) => ({ ...prev, [name]: "" }))
  }

  const handleSetDefault = (phName: string, value: string) => {
    const current = getDefault(phName)
    setDefaultValue(templateId, phName, current === value ? undefined : value)
  }

  const handleDeleteValue = (phName: string, value: string) => {
    deletePlaceholderValue(templateId, phName, value)
    if (getDefault(phName) === value) {
      setDefaultValue(templateId, phName, undefined)
    }
  }

  const doSaveTag = (name: string) => {
    const result = saveCombinationTag(templateId, name)
    setPendingOverwrite(null)
    if (result.ok === false) {
      flashTagMessage("error", result.error)
      return
    }
    setTagName("")
  }

  const handleSaveTag = () => {
    const trimmed = tagName.trim()
    if (!trimmed) return
    if (tags.some((ct) => ct.name === trimmed)) {
      setPendingOverwrite(trimmed)
      return
    }
    doSaveTag(trimmed)
  }

  const handleRecallTag = (name: string) => {
    const result = recallCombinationTag(templateId, name)
    if (result.warnings.length > 0) {
      flashTagMessage("warning", result.warnings.join("；"))
    }
  }

  const selectedCount = placeholderNames.filter((n) => !!selections[n]).length

  // ============ Edit form mode ============
  if (showEditForm) {
    return (
      <CreateTemplateForm
        editingTemplate={template}
        onClose={() => setShowEditForm(false)}
      />
    )
  }

  // ============ Normal expanded view ============
  return (
    <div className="plasmo-flex plasmo-flex-col plasmo-gap-3">
      {/* Edit button */}
      <div className="plasmo-flex plasmo-justify-end plasmo-gap-3">
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={clearSelections}
            className="plasmo-text-xs plasmo-text-stone-400 hover:plasmo-text-rose-500 plasmo-transition-colors">
            清空选择
          </button>
        )}
        <button
          type="button"
          onClick={handleStartEdit}
          className="plasmo-text-xs plasmo-text-stone-400 hover:plasmo-text-rose-500 plasmo-transition-colors">
          编辑模板
        </button>
      </div>

      {/* Highlighted template preview */}
      {placeholderNames.length > 0 && (
        <div className="plasmo-rounded-lg plasmo-bg-stone-50 plasmo-border plasmo-border-stone-100 plasmo-px-2 plasmo-py-1.5 plasmo-text-xs plasmo-font-mono plasmo-break-all plasmo-text-stone-600">
          {parseResult.segments.map((seg, i) =>
            seg.type === "literal" ? (
              <span key={i}>{seg.value}</span>
            ) : selections[seg.value] ? (
              <span
                key={i}
                className="plasmo-rounded plasmo-bg-emerald-50 plasmo-px-0.5 plasmo-text-emerald-700">
                {selections[seg.value]}
              </span>
            ) : (
              <span
                key={i}
                className="plasmo-rounded plasmo-bg-rose-50 plasmo-px-0.5 plasmo-text-rose-500">
                {"{" + seg.value + "}"}
              </span>
            )
          )}
          <div className="plasmo-mt-1 plasmo-font-sans plasmo-text-[11px] plasmo-text-stone-400">
            当前选择 {selectedCount}/{placeholderNames.length}
          </div>
        </div>
      )}

      {/* Placeholder editors */}
      {placeholderNames.length === 0 ? (
        <div className="plasmo-text-xs plasmo-text-stone-400 plasmo-text-center plasmo-py-2">
          此模板无占位符
        </div>
      ) : (
        placeholderNames.map((name) => {
          const candidates = getCandidates(name)
          const customValue = customValues[name] ?? ""
          const defaultVal = getDefault(name)

          return (
            <div
              key={name}
              className="plasmo-flex plasmo-flex-col plasmo-gap-1.5 plasmo-p-2 plasmo-bg-stone-50 plasmo-rounded-lg plasmo-border plasmo-border-stone-100">
              <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
                <label className="plasmo-text-xs plasmo-font-medium plasmo-text-stone-700 plasmo-font-mono">
                  {"{" + name + "}"}
                </label>
                {defaultVal && (
                  <span className="plasmo-text-xs plasmo-text-stone-400">
                    默认: {defaultVal}
                  </span>
                )}
              </div>

              {candidates.length > 0 && (
                <div className="plasmo-flex plasmo-flex-wrap plasmo-gap-1 plasmo-max-h-[80px] plasmo-overflow-y-auto">
                  {candidates.map((val, index) => (
                    <span
                      key={val}
                      draggable
                      onDragStart={(e) => {
                        dragRef.current = { name, index }
                        e.dataTransfer.effectAllowed = "move"
                      }}
                      onDragOver={(e) => {
                        if (dragRef.current?.name !== name) return
                        e.preventDefault()
                        setDragOver({ name, index })
                      }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => {
                        e.preventDefault()
                        handleDrop(name, index)
                      }}
                      onDragEnd={() => {
                        dragRef.current = null
                        setDragOver(null)
                      }}
                      className={`${
                        dragOver?.name === name && dragOver.index === index
                          ? "plasmo-ring-2 plasmo-ring-rose-300 "
                          : ""
                      }plasmo-inline-flex plasmo-items-center plasmo-gap-0.5 plasmo-px-2 plasmo-py-0.5 plasmo-text-xs plasmo-rounded-full plasmo-border plasmo-cursor-pointer plasmo-transition-colors
                        ${
                          selections[name] === val
                            ? "plasmo-bg-rose-100 plasmo-border-rose-300 plasmo-text-rose-700"
                            : defaultVal === val
                              ? "plasmo-bg-indigo-50 plasmo-border-indigo-200 plasmo-text-indigo-600"
                              : "plasmo-bg-white plasmo-border-stone-200 plasmo-text-stone-600 hover:plasmo-border-rose-200"
                        }`}
                      onClick={() => handleSelectChange(name, val)}
                      title={defaultVal === val ? "默认值 (点击选择)" : "点击选择"}>
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

              <div className="plasmo-flex plasmo-items-center plasmo-gap-1.5">
                <input
                  type="text"
                  value={customValue}
                  onChange={(e) => handleCustomValueChange(name, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customValue.trim()) {
                      handleSaveAsCandidate(name)
                    }
                  }}
                  placeholder="输入值..."
                  className="plasmo-flex-1 plasmo-px-2 plasmo-py-1 plasmo-rounded plasmo-border plasmo-border-stone-200 plasmo-bg-white plasmo-text-xs plasmo-text-stone-700 plasmo-outline-none focus:plasmo-border-rose-400 plasmo-transition-colors"
                />
                {customValue.trim() && (
                  <button
                    type="button"
                    onClick={() => handleSaveAsCandidate(name)}
                    className="plasmo-px-2 plasmo-py-1 plasmo-text-xs plasmo-font-medium plasmo-text-rose-600 plasmo-bg-rose-50 plasmo-border plasmo-border-rose-200 plasmo-rounded hover:plasmo-bg-rose-100 plasmo-transition-colors plasmo-whitespace-nowrap">
                    保存
                  </button>
                )}
              </div>

              {valueErrors[name] && (
                <div className="plasmo-text-xs plasmo-text-red-500">
                  {valueErrors[name]}
                </div>
              )}

              {candidates.length === 0 && !customValue.trim() && (
                <div className="plasmo-text-xs plasmo-text-stone-400">
                  请添加候选值
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Combination tags */}
      {placeholderNames.length > 0 && (
        <div className="plasmo-flex plasmo-flex-col plasmo-gap-2 plasmo-pt-2 plasmo-border-t plasmo-border-stone-100">
          <div className="plasmo-text-xs plasmo-font-medium plasmo-text-stone-500">
            组合标签
          </div>
          <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
            <input
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTag()
              }}
              placeholder="标签名称"
              className="plasmo-flex-1 plasmo-px-2 plasmo-py-1 plasmo-text-xs plasmo-rounded plasmo-border plasmo-border-stone-200 plasmo-outline-none focus:plasmo-border-rose-400 plasmo-bg-white"
            />
            <button
              type="button"
              onClick={handleSaveTag}
              disabled={!tagName.trim() || pendingOverwrite !== null}
              className="plasmo-px-2 plasmo-py-1 plasmo-text-xs plasmo-font-medium plasmo-rounded plasmo-bg-rose-500 plasmo-text-white hover:plasmo-bg-rose-600 disabled:plasmo-bg-stone-200 disabled:plasmo-text-stone-400 disabled:plasmo-cursor-not-allowed plasmo-transition-all">
              保存组合
            </button>
          </div>
          {pendingOverwrite && (
            <div className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-text-xs plasmo-text-amber-700 plasmo-bg-amber-50 plasmo-border plasmo-border-amber-200 plasmo-rounded plasmo-px-2 plasmo-py-1">
              <span className="plasmo-flex-1">
                组合标签「{pendingOverwrite}」已存在，是否覆盖？
              </span>
              <button
                type="button"
                onClick={() => doSaveTag(pendingOverwrite)}
                className="plasmo-font-medium plasmo-text-rose-600 hover:plasmo-text-rose-700">
                覆盖
              </button>
              <button
                type="button"
                onClick={() => setPendingOverwrite(null)}
                className="plasmo-text-stone-500 hover:plasmo-text-stone-700">
                取消
              </button>
            </div>
          )}
          {tagMessage && (
            <div
              className={`plasmo-text-xs ${
                tagMessage.type === "error"
                  ? "plasmo-text-red-500"
                  : "plasmo-text-amber-600"
              }`}>
              {tagMessage.text}
            </div>
          )}
          {tags.length > 0 ? (
            <div className="plasmo-flex plasmo-flex-wrap plasmo-gap-1">
              {tags.map((tag) => (
                <div
                  key={tag.name}
                  className="plasmo-flex plasmo-items-center plasmo-gap-1 plasmo-px-2 plasmo-py-0.5 plasmo-rounded-full plasmo-bg-white plasmo-border plasmo-border-stone-200 plasmo-text-xs hover:plasmo-border-rose-300 hover:plasmo-bg-rose-50 plasmo-transition-all">
                  <button
                    type="button"
                    onClick={() => handleRecallTag(tag.name)}
                    className="plasmo-text-stone-700 hover:plasmo-text-rose-600 plasmo-transition-colors"
                    title={`恢复组合: ${tag.name}`}>
                    {tag.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCombinationTag(templateId, tag.name)}
                    className="plasmo-text-stone-400 hover:plasmo-text-red-500 plasmo-transition-colors plasmo-leading-none"
                    title={`删除: ${tag.name}`}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="plasmo-text-xs plasmo-text-stone-400">
              暂无保存的组合
            </div>
          )}
        </div>
      )}
    </div>
  )
}
