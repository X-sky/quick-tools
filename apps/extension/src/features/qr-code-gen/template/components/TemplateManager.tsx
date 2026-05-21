import { useState, useMemo, useRef } from "react"

import { useTemplate } from "../context"
import { parse } from "../parser"

export const TemplateManager = () => {
  const {
    store,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    activeTemplateId,
    setActiveTemplateId,
    addPlaceholderValue,
    setDefaultValue,
    exportAll,
    importFromFile
  } = useTemplate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importMessage, setImportMessage] = useState("")

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [name, setName] = useState("")
  const [templateString, setTemplateString] = useState("")
  const [formError, setFormError] = useState("")
  // Placeholder values being edited during creation
  const [draftValues, setDraftValues] = useState<Record<string, string[]>>({})
  const [draftDefaults, setDraftDefaults] = useState<Record<string, string>>({})
  const [draftInput, setDraftInput] = useState<Record<string, string>>({})

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editTemplateString, setEditTemplateString] = useState("")
  const [editError, setEditError] = useState("")
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Live parser feedback for create form
  const createParseResult = useMemo(() => {
    if (!templateString.trim()) return null
    return parse(templateString)
  }, [templateString])

  const createParseErrors = createParseResult?.errors ?? []
  const createPlaceholders = createParseResult?.placeholderNames ?? []

  // Live parser feedback for edit form
  const editParseErrors = useMemo(() => {
    if (!editTemplateString.trim()) return []
    return parse(editTemplateString).errors
  }, [editTemplateString])

  // Templates sorted by updatedAt descending
  const sortedTemplates = useMemo(
    () => [...store.templates].sort((a, b) => b.updatedAt - a.updatedAt),
    [store.templates]
  )

  // Quick split: convert ?k=v&k2=v2 into ?{k}&{k2} and populate draft values
  const handleQuickSplit = () => {
    const qIdx = templateString.indexOf("?")
    if (qIdx === -1) return

    const base = templateString.slice(0, qIdx + 1)
    const query = templateString.slice(qIdx + 1)
    const pairs = query.split("&").filter(Boolean)

    const newParts: string[] = []
    const newDraftValues: Record<string, string[]> = { ...draftValues }
    const newDraftDefaults: Record<string, string> = { ...draftDefaults }

    for (const pair of pairs) {
      const eqIdx = pair.indexOf("=")
      if (eqIdx === -1) {
        newParts.push(pair)
        continue
      }
      const key = pair.slice(0, eqIdx)
      const value = pair.slice(eqIdx + 1)
      // Use key as placeholder name (sanitize for valid chars)
      const safeName = key.replace(/[^A-Za-z0-9_-]/g, "_")
      newParts.push(`${safeName}={${safeName}}`)
      if (value) {
        const existing = newDraftValues[safeName] ?? []
        if (!existing.includes(value)) {
          newDraftValues[safeName] = [...existing, value]
        }
        if (!newDraftDefaults[safeName]) {
          newDraftDefaults[safeName] = value
        }
      }
    }

    setTemplateString(base + newParts.join("&"))
    setDraftValues(newDraftValues)
    setDraftDefaults(newDraftDefaults)
  }

  // Fix placeholder back to static text (revert split)
  const handleFixAsText = (placeholder: string) => {
    const fixValue = draftDefaults[placeholder] || (draftValues[placeholder] ?? [])[0] || ""
    if (!fixValue) return
    // Replace {placeholder} with the fixed value in template string
    const newTemplateString = templateString.replace(
      new RegExp(`\\{${placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\}`, "g"),
      fixValue
    )
    setTemplateString(newTemplateString)
    // Clean up draft state for this placeholder
    const newDraftValues = { ...draftValues }
    delete newDraftValues[placeholder]
    setDraftValues(newDraftValues)
    const newDraftDefaults = { ...draftDefaults }
    delete newDraftDefaults[placeholder]
    setDraftDefaults(newDraftDefaults)
  }

  const handleAddDraftValue = (placeholder: string) => {
    const input = (draftInput[placeholder] ?? "").trim()
    if (!input) return
    const existing = draftValues[placeholder] ?? []
    if (existing.includes(input)) return
    setDraftValues({ ...draftValues, [placeholder]: [...existing, input] })
    setDraftInput({ ...draftInput, [placeholder]: "" })
  }

  const handleRemoveDraftValue = (placeholder: string, value: string) => {
    const existing = draftValues[placeholder] ?? []
    setDraftValues({
      ...draftValues,
      [placeholder]: existing.filter((v) => v !== value)
    })
    if (draftDefaults[placeholder] === value) {
      const remaining = existing.filter((v) => v !== value)
      setDraftDefaults({
        ...draftDefaults,
        [placeholder]: remaining[0] ?? ""
      })
    }
  }

  const handleSetDraftDefault = (placeholder: string, value: string) => {
    setDraftDefaults({ ...draftDefaults, [placeholder]: value })
  }

  const handleCreate = () => {
    setFormError("")
    const result = createTemplate(name.trim(), templateString)
    if (result.ok === true) {
      const templateId = result.value.id
      // Persist draft placeholder values and defaults
      for (const [ph, values] of Object.entries(draftValues)) {
        for (const v of values) {
          addPlaceholderValue(templateId, ph, v)
        }
      }
      for (const [ph, def] of Object.entries(draftDefaults)) {
        if (def) {
          setDefaultValue(templateId, ph, def)
        }
      }
      // Reset form
      setName("")
      setTemplateString("")
      setDraftValues({})
      setDraftDefaults({})
      setDraftInput({})
      setShowCreateForm(false)
      setActiveTemplateId(templateId)
    } else {
      setFormError(result.error)
    }
  }

  const handleStartEdit = (id: string) => {
    const template = store.templates.find((t) => t.id === id)
    if (!template) return
    setEditingId(id)
    setEditName(template.name)
    setEditTemplateString(template.templateString)
    setEditError("")
  }

  const handleSaveEdit = () => {
    if (!editingId) return
    setEditError("")
    const result = updateTemplate(editingId, {
      name: editName.trim(),
      templateString: editTemplateString
    })
    if (result.ok === true) {
      setEditingId(null)
    } else {
      setEditError(result.error)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditError("")
  }

  const handleDelete = (id: string) => {
    deleteTemplate(id)
    setDeleteConfirmId(null)
    if (activeTemplateId === id) {
      setActiveTemplateId(null)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await importFromFile(file)
    if (result.success) {
      setImportMessage(
        `导入成功：新增 ${result.added.templates} 个模板、${result.added.values} 个候选值、${result.added.tags} 个组合标签`
      )
    } else {
      setImportMessage(result.error ?? "导入失败")
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    setTimeout(() => setImportMessage(""), 4000)
  }

  return (
    <div className="plasmo-flex plasmo-flex-col plasmo-gap-2">
      {/* Header: action buttons */}
      <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
        {!showCreateForm && (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-font-medium plasmo-bg-rose-500 plasmo-text-white plasmo-rounded hover:plasmo-bg-rose-600 plasmo-transition-colors">
            + 新增模板
          </button>
        )}
        <button
          type="button"
          onClick={exportAll}
          className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-font-medium plasmo-text-stone-600 plasmo-border plasmo-border-stone-200 plasmo-rounded hover:plasmo-bg-stone-100 plasmo-transition-colors">
          导出
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-font-medium plasmo-text-stone-600 plasmo-border plasmo-border-stone-200 plasmo-rounded hover:plasmo-bg-stone-100 plasmo-transition-colors">
          导入
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          title="选择导入文件"
          onChange={handleImport}
          className="plasmo-hidden"
        />
        {importMessage && (
          <span className="plasmo-text-xs plasmo-text-emerald-600">
            {importMessage}
          </span>
        )}
      </div>

      {/* Collapsible create form */}
      {showCreateForm && (
        <div className="plasmo-flex plasmo-flex-col plasmo-gap-2 plasmo-p-3 plasmo-bg-stone-50 plasmo-rounded-lg plasmo-border plasmo-border-stone-200">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="模板名称"
            className="plasmo-w-full plasmo-px-2 plasmo-py-1.5 plasmo-text-sm plasmo-rounded plasmo-border plasmo-border-stone-200 plasmo-outline-none focus:plasmo-border-rose-400 plasmo-bg-white"
          />
          <div className="plasmo-flex plasmo-gap-1.5">
            <textarea
              value={templateString}
              onChange={(e) => {
                setTemplateString(e.target.value)
                setFormError("")
              }}
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

          {createParseErrors.length > 0 && (
            <div className="plasmo-text-xs plasmo-text-amber-600">
              {createParseErrors.map((e, i) => (
                <div key={i}>
                  位置 {e.offset}: {e.message}
                </div>
              ))}
            </div>
          )}

          {/* Placeholder value editor during creation */}
          {createPlaceholders.length > 0 && (
            <div className="plasmo-flex plasmo-flex-col plasmo-gap-2 plasmo-mt-1 plasmo-max-h-[200px] plasmo-overflow-y-auto">
              <div className="plasmo-text-xs plasmo-font-medium plasmo-text-stone-500">
                占位符候选值（可选）
              </div>
              {createPlaceholders.map((ph) => {
                const values = draftValues[ph] ?? []
                const inputVal = draftInput[ph] ?? ""
                const defaultVal = draftDefaults[ph] ?? ""
                return (
                  <div
                    key={ph}
                    className="plasmo-flex plasmo-flex-col plasmo-gap-1 plasmo-p-2 plasmo-bg-white plasmo-rounded plasmo-border plasmo-border-stone-100">
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
                    {/* Existing values */}
                    {values.length > 0 && (
                      <div className="plasmo-flex plasmo-flex-wrap plasmo-gap-1 plasmo-max-h-[80px] plasmo-overflow-y-auto">
                        {values.map((v) => (
                          <span
                            key={v}
                            className={`plasmo-inline-flex plasmo-items-center plasmo-gap-0.5 plasmo-px-2 plasmo-py-0.5 plasmo-text-xs plasmo-rounded-full plasmo-border plasmo-cursor-pointer plasmo-transition-colors
                              ${
                                defaultVal === v
                                  ? "plasmo-bg-rose-50 plasmo-border-rose-300 plasmo-text-rose-700"
                                  : "plasmo-bg-stone-50 plasmo-border-stone-200 plasmo-text-stone-600"
                              }`}
                            onClick={() => handleSetDraftDefault(ph, v)}
                            title="点击设为默认值">
                            {v}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveDraftValue(ph, v)
                              }}
                              className="plasmo-text-stone-400 hover:plasmo-text-red-500 plasmo-leading-none">
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Add value input */}
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
              onClick={() => {
                setShowCreateForm(false)
                setName("")
                setTemplateString("")
                setDraftValues({})
                setDraftDefaults({})
                setDraftInput({})
                setFormError("")
              }}
              className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-text-stone-500 plasmo-border plasmo-border-stone-200 plasmo-rounded hover:plasmo-bg-stone-100 plasmo-transition-colors">
              取消
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-font-medium plasmo-bg-rose-500 plasmo-text-white plasmo-rounded hover:plasmo-bg-rose-600 plasmo-transition-colors">
              创建模板
            </button>
          </div>
        </div>
      )}

      {/* Template list */}
      {sortedTemplates.length === 0 && !showCreateForm ? (
        <div className="plasmo-text-sm plasmo-text-stone-400 plasmo-text-center plasmo-py-4">
          暂无模板，请创建
        </div>
      ) : (
        <div className="plasmo-flex plasmo-flex-col plasmo-gap-1.5">
          {sortedTemplates.map((template) => (
            <div key={template.id}>
              {editingId === template.id ? (
                /* Edit form */
                <div className="plasmo-flex plasmo-flex-col plasmo-gap-2 plasmo-p-2 plasmo-bg-white plasmo-rounded-lg plasmo-border plasmo-border-rose-200">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="模板名称"
                    className="plasmo-w-full plasmo-px-2 plasmo-py-1 plasmo-text-sm plasmo-rounded plasmo-border plasmo-border-stone-200 plasmo-outline-none focus:plasmo-border-rose-400"
                  />
                  <textarea
                    value={editTemplateString}
                    onChange={(e) => {
                      setEditTemplateString(e.target.value)
                      setEditError("")
                    }}
                    rows={2}
                    placeholder="模板内容"
                    className="plasmo-w-full plasmo-px-2 plasmo-py-1 plasmo-text-sm plasmo-rounded plasmo-border plasmo-border-stone-200 plasmo-outline-none focus:plasmo-border-rose-400 plasmo-resize-none"
                  />
                  {editParseErrors.length > 0 && (
                    <div className="plasmo-text-xs plasmo-text-amber-600">
                      {editParseErrors.map((e, i) => (
                        <div key={i}>
                          位置 {e.offset}: {e.message}
                        </div>
                      ))}
                    </div>
                  )}
                  {editError && (
                    <div className="plasmo-text-xs plasmo-text-red-500">
                      {editError}
                    </div>
                  )}
                  <div className="plasmo-flex plasmo-gap-2 plasmo-justify-end">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="plasmo-px-2 plasmo-py-0.5 plasmo-text-xs plasmo-text-stone-500 plasmo-border plasmo-border-stone-200 plasmo-rounded hover:plasmo-bg-stone-100 plasmo-transition-colors">
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="plasmo-px-2 plasmo-py-0.5 plasmo-text-xs plasmo-text-white plasmo-bg-rose-500 plasmo-rounded hover:plasmo-bg-rose-600 plasmo-transition-colors">
                      保存
                    </button>
                  </div>
                </div>
              ) : deleteConfirmId === template.id ? (
                /* Delete confirmation */
                <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-p-2 plasmo-bg-red-50 plasmo-rounded-lg plasmo-border plasmo-border-red-200">
                  <span className="plasmo-text-xs plasmo-text-red-600">
                    确认删除「{template.name}」？
                  </span>
                  <div className="plasmo-flex plasmo-gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(null)}
                      className="plasmo-px-2 plasmo-py-0.5 plasmo-text-xs plasmo-text-stone-500 plasmo-border plasmo-border-stone-200 plasmo-rounded hover:plasmo-bg-stone-100 plasmo-transition-colors">
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(template.id)}
                      className="plasmo-px-2 plasmo-py-0.5 plasmo-text-xs plasmo-text-white plasmo-bg-red-500 plasmo-rounded hover:plasmo-bg-red-600 plasmo-transition-colors">
                      删除
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal template item */
                <div
                  onClick={() => setActiveTemplateId(template.id)}
                  className={`plasmo-flex plasmo-items-center plasmo-justify-between plasmo-p-2 plasmo-rounded-lg plasmo-cursor-pointer plasmo-transition-colors plasmo-border
                    ${
                      activeTemplateId === template.id
                        ? "plasmo-bg-rose-50 plasmo-border-rose-200"
                        : "plasmo-bg-white plasmo-border-stone-100 hover:plasmo-bg-stone-50"
                    }`}>
                  <div className="plasmo-flex plasmo-flex-col plasmo-min-w-0 plasmo-flex-1">
                    <span className="plasmo-text-sm plasmo-font-medium plasmo-text-stone-700 plasmo-truncate">
                      {template.name}
                    </span>
                    <span className="plasmo-text-xs plasmo-text-stone-400 plasmo-truncate plasmo-font-mono">
                      {template.templateString}
                    </span>
                  </div>
                  <div className="plasmo-flex plasmo-gap-1 plasmo-ml-2 plasmo-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartEdit(template.id)
                      }}
                      className="plasmo-px-1.5 plasmo-py-0.5 plasmo-text-xs plasmo-text-stone-400 hover:plasmo-text-rose-500 plasmo-transition-colors">
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteConfirmId(template.id)
                      }}
                      className="plasmo-px-1.5 plasmo-py-0.5 plasmo-text-xs plasmo-text-stone-400 hover:plasmo-text-red-500 plasmo-transition-colors">
                      删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
