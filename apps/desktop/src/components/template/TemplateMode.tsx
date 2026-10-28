import { useCallback, useMemo, useState } from "react"

import type { QrErrorLevel, QrSize, TemplateDraft } from "@quick-tools/qr-code-gen"
import {
  draftFromStoredValues,
  parse,
  render,
  templateExportFilename
} from "@quick-tools/qr-code-gen"

import { useTemplateStore } from "../../hooks/useTemplateStore"
import { isTauriRuntime } from "../../platform"
import { CombinationTagPanel } from "./CombinationTagPanel"
import { CreateTemplateForm } from "./CreateTemplateForm"
import { FinalStringDisplay } from "./FinalStringDisplay"
import { PlaceholderEditor } from "./PlaceholderEditor"
import { TemplateList } from "./TemplateList"

export interface TemplateModeProps {
  showToast?: (message: string, type: "success" | "error" | "info", duration?: number) => void
  size?: QrSize
  level?: QrErrorLevel
}

const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024

async function readImportFileFromBrowser(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json,application/json"

    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }

      if (file.size > MAX_IMPORT_FILE_SIZE) {
        reject(new Error("文件大小超过 10 MB 限制"))
        return
      }

      try {
        resolve(await file.text())
      } catch (err) {
        reject(err)
      }
    }

    input.click()
  })
}

function downloadJsonFromBrowser(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function TemplateMode({
  showToast,
  size = 256,
  level = "M"
}: TemplateModeProps = {}) {
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const {
    store,
    initialized,
    createTemplate,
    updateTemplate,
    activeTemplateId,
    setActiveTemplateId,
    selections,
    setSelection,
    clearSelections,
    deleteTemplate,
    addPlaceholderValue,
    deletePlaceholderValue,
    reorderPlaceholderValues,
    setDefaultValue,
    saveCombinationTag,
    deleteCombinationTag,
    recallCombinationTag,
    exportToJson,
    importFromJsonString
  } = useTemplateStore()

  const activeTemplate = useMemo(
    () => store.templates.find((t) => t.id === activeTemplateId) ?? null,
    [store.templates, activeTemplateId]
  )

  const parseResult = useMemo(() => {
    if (!activeTemplate) return null
    return parse(activeTemplate.templateString)
  }, [activeTemplate])

  const finalString = useMemo(() => {
    if (!activeTemplate || !parseResult) return null
    const { placeholderNames } = parseResult
    const allSelected = placeholderNames.every((name) => !!selections[name])
    if (!allSelected && placeholderNames.length > 0) return null
    return render(activeTemplate.templateString, selections)
  }, [activeTemplate, parseResult, selections])

  const handleSelect = useCallback(
    (id: string) => {
      setActiveTemplateId(id)
    },
    [setActiveTemplateId]
  )

  const handleCreateNew = useCallback(() => {
    setEditingId(null)
    setIsCreating(true)
  }, [])

  const handleCreateCancel = useCallback(() => {
    setIsCreating(false)
    setEditingId(null)
  }, [])

  const applyDraft = useCallback(
    (templateId: string, draft: TemplateDraft) => {
      for (const [ph, values] of Object.entries(draft.values)) {
        for (const v of values) addPlaceholderValue(templateId, ph, v)
      }
      for (const [ph, def] of Object.entries(draft.defaults)) {
        if (def) setDefaultValue(templateId, ph, def)
      }
    },
    [addPlaceholderValue, setDefaultValue]
  )

  const handleCreateSubmit = useCallback(
    (name: string, templateString: string, draft: TemplateDraft) => {
      const result = editingId
        ? updateTemplate(editingId, { name, templateString })
        : createTemplate(name, templateString)
      if (!result.ok) {
        showToast?.(result.error, "error", 5000)
        return
      }

      applyDraft(result.value.id, draft)
      if (editingId) {
        // Re-activate so defaults for new placeholders are applied.
        setActiveTemplateId(null)
      }
      setActiveTemplateId(result.value.id)
      setIsCreating(false)
      setEditingId(null)
      showToast?.(editingId ? "模板已更新" : "模板已创建", "success")
    },
    [editingId, updateTemplate, createTemplate, applyDraft, setActiveTemplateId, showToast]
  )

  const handleEdit = useCallback((id: string) => {
    setIsCreating(false)
    setEditingId(id)
  }, [])

  const editingTemplate = useMemo(
    () => store.templates.find((t) => t.id === editingId) ?? null,
    [store.templates, editingId]
  )

  const formElement =
    isCreating || editingTemplate ? (
      <CreateTemplateForm
        key={editingTemplate?.id ?? "new"}
        onSubmit={handleCreateSubmit}
        onCancel={handleCreateCancel}
        existingTemplates={store.templates}
        initialValues={
          editingTemplate
            ? {
                id: editingTemplate.id,
                name: editingTemplate.name,
                templateString: editingTemplate.templateString,
                draft: draftFromStoredValues(
                  store.placeholderValues.filter(
                    (pv) => pv.templateId === editingTemplate.id
                  )
                )
              }
            : undefined
        }
      />
    ) : null

  const handleImport = useCallback(async () => {
    try {
      let fileContent: string | null = null

      if (isTauriRuntime()) {
        const { open } = await import("@tauri-apps/plugin-dialog")
        const { readTextFile, stat } = await import("@tauri-apps/plugin-fs")
        const filePath = await open({
          filters: [{ name: "JSON", extensions: ["json"] }],
          multiple: false
        })

        if (!filePath) return

        const fileInfo = await stat(filePath as string)
        if (fileInfo.size > MAX_IMPORT_FILE_SIZE) {
          showToast?.("文件大小超过 10 MB 限制", "error", 5000)
          return
        }

        fileContent = await readTextFile(filePath as string)
      } else {
        fileContent = await readImportFileFromBrowser()
        if (!fileContent) return
      }

      const result = importFromJsonString(fileContent)

      if (!result.success && result.error) {
        showToast?.(result.error, "error", 5000)
        return
      }

      const { templates, values, tags } = result.added
      if (templates > 0 || values > 0 || tags > 0) {
        showToast?.(
          `导入完成：新增 ${templates} 个模板，${values} 个候选值，${tags} 个组合标签`,
          "success",
          3000
        )
      }
    } catch (err) {
      showToast?.(
        `导入失败: ${err instanceof Error ? err.message : String(err)}`,
        "error",
        5000
      )
    }
  }, [importFromJsonString, showToast])

  const handleExport = useCallback(async () => {
    try {
      if (store.templates.length === 0) {
        showToast?.("暂无可导出的模板", "info")
        return
      }
      const defaultPath = templateExportFilename()

      const json = exportToJson()

      if (isTauriRuntime()) {
        const { save } = await import("@tauri-apps/plugin-dialog")
        const { writeTextFile } = await import("@tauri-apps/plugin-fs")
        const filePath = await save({
          defaultPath,
          filters: [{ name: "JSON", extensions: ["json"] }]
        })

        if (!filePath) return

        await writeTextFile(filePath, json)
      } else {
        downloadJsonFromBrowser(json, defaultPath)
      }

      showToast?.("模板数据已导出", "success")
    } catch (err) {
      showToast?.(
        `导出失败: ${err instanceof Error ? err.message : String(err)}`,
        "error",
        5000
      )
    }
  }, [exportToJson, showToast, store.templates.length])

  if (!initialized) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-stone-400 dark:text-stone-500">
          加载中...
        </p>
      </div>
    )
  }

  if (store.templates.length === 0 && !activeTemplateId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 p-8 dark:border-stone-700 dark:bg-stone-900/50">
        <span className="text-3xl">🧩</span>
        <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
          暂无模板
        </p>
        <p className="text-center text-xs text-stone-400 dark:text-stone-500">
          创建一个模板来开始使用模板模式生成二维码。
          <br />
          模板支持 {"{"} name {"}"} 占位符语法。
        </p>
        {formElement && <div className="w-full max-w-2xl">{formElement}</div>}
        <TemplateList
          templates={store.templates}
          activeTemplateId={activeTemplateId}
          onSelect={handleSelect}
          onCreate={handleCreateNew}
          onEdit={handleEdit}
          onDelete={deleteTemplate}
          onImport={handleImport}
          onExport={handleExport}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-1 gap-4 overflow-hidden">
      {/* Left Column */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {formElement}

        <TemplateList
          templates={store.templates}
          activeTemplateId={activeTemplateId}
          onSelect={handleSelect}
          onCreate={handleCreateNew}
          onEdit={handleEdit}
          onDelete={deleteTemplate}
          onImport={handleImport}
          onExport={handleExport}
        />

        {activeTemplate && parseResult && (
          <PlaceholderEditor
            template={activeTemplate}
            parseResult={parseResult}
            placeholderValues={store.placeholderValues}
            selections={selections}
            onSelectionChange={setSelection}
            onClearSelections={clearSelections}
            onAddValue={addPlaceholderValue}
            onDeleteValue={deletePlaceholderValue}
            onReorderValues={reorderPlaceholderValues}
            onSetDefault={setDefaultValue}
          />
        )}

        {activeTemplate && parseResult && (
          <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
            <h3 className="mb-2 text-xs font-medium text-stone-500 dark:text-stone-400">
              模板预览
            </h3>
            <p className="break-all text-sm text-stone-700 dark:text-stone-300">
              {activeTemplate.templateString}
            </p>
          </div>
        )}
      </div>

      {/* Right Column */}
      <div className="flex w-80 flex-col gap-4 overflow-y-auto">
        <FinalStringDisplay
          finalString={finalString}
          placeholderNames={parseResult?.placeholderNames ?? []}
          selections={selections}
          placeholderValues={
            activeTemplate
              ? store.placeholderValues.filter(
                  (pv) => pv.templateId === activeTemplate.id
                )
              : []
          }
          size={size}
          level={level}
        />

        {activeTemplate && (
          <CombinationTagPanel
            templateId={activeTemplate.id}
            combinationTags={store.combinationTags.filter(
              (ct) => ct.templateId === activeTemplate.id
            )}
            onSave={saveCombinationTag}
            onDelete={deleteCombinationTag}
            onRecall={recallCombinationTag}
          />
        )}
      </div>
    </div>
  )
}
