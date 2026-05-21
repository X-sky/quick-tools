import { useMemo, useRef, useState } from "react"

import {
  DownloadIcon,
  HistoryIcon,
  PlusIcon,
  TrashIcon,
  UploadIcon
} from "~icons"

import { useTemplate } from "../context"
import { parse } from "../parser"
import { render } from "../renderer"
import { CreateTemplateForm } from "./CreateTemplateForm"
import { TemplateCardBody } from "./TemplateCardBody"

export const TemplateCardList = () => {
  const {
    store,
    deleteTemplate,
    activeTemplateId,
    setActiveTemplateId,
    selections,
    exportAll,
    importFromFile
  } = useTemplate()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importMessage, setImportMessage] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const sortedTemplates = useMemo(
    () => [...store.templates].sort((a, b) => b.updatedAt - a.updatedAt),
    [store.templates]
  )

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
    setTimeout(() => setImportMessage(""), 3000)
  }

  const handleToggleExpand = (id: string) => {
    setActiveTemplateId(activeTemplateId === id ? null : id)
  }

  const handleDelete = (id: string) => {
    deleteTemplate(id)
    setDeleteConfirmId(null)
    if (activeTemplateId === id) {
      setActiveTemplateId(null)
    }
  }

  // Compute preview string for a template (with current selections if it's active)
  const getPreview = (templateId: string, templateString: string): string => {
    if (templateId === activeTemplateId) {
      const parseResult = parse(templateString)
      const allSelected = parseResult.placeholderNames.every(
        (n) => !!selections[n]
      )
      if (allSelected) {
        return render(templateString, selections)
      }
    }
    return templateString
  }

  return (
    <div className="plasmo-w-[400px] plasmo-flex plasmo-flex-col plasmo-bg-stone-50 plasmo-border-r plasmo-border-stone-100">
      <div className="plasmo-px-5 plasmo-py-3 plasmo-flex plasmo-items-center plasmo-justify-between">
        <div className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-text-stone-400 plasmo-text-xs plasmo-font-bold plasmo-uppercase plasmo-tracking-wider">
          <HistoryIcon className="plasmo-w-3.5 plasmo-h-3.5" />
          Templates
        </div>
        <div className="plasmo-flex plasmo-items-center plasmo-gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            title="选择导入文件"
            onChange={handleImport}
            className="plasmo-hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="导入模板"
            className="plasmo-p-1.5 plasmo-text-stone-400 hover:plasmo-text-emerald-600 hover:plasmo-bg-emerald-50 plasmo-rounded-md plasmo-transition-all">
            <UploadIcon className="plasmo-w-3.5 plasmo-h-3.5" />
          </button>
          <button
            type="button"
            onClick={exportAll}
            title="导出模板"
            disabled={sortedTemplates.length === 0}
            className="plasmo-p-1.5 plasmo-text-stone-400 hover:plasmo-text-blue-600 hover:plasmo-bg-blue-50 plasmo-rounded-md plasmo-transition-all disabled:plasmo-opacity-30 disabled:plasmo-cursor-not-allowed">
            <DownloadIcon className="plasmo-w-3.5 plasmo-h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            title="新增模板"
            className="plasmo-p-1.5 plasmo-text-stone-400 hover:plasmo-text-rose-500 hover:plasmo-bg-rose-50 plasmo-rounded-md plasmo-transition-all">
            <PlusIcon className="plasmo-w-3.5 plasmo-h-3.5" />
          </button>
        </div>
      </div>

      {importMessage && (
        <div className="plasmo-mx-3 plasmo-mb-2 plasmo-px-3 plasmo-py-1.5 plasmo-text-xs plasmo-font-medium plasmo-text-emerald-700 plasmo-bg-emerald-50 plasmo-border plasmo-border-emerald-200 plasmo-rounded-lg">
          {importMessage}
        </div>
      )}

      <div className="plasmo-flex-1 plasmo-overflow-y-auto plasmo-p-3 plasmo-pt-0 plasmo-gap-2 plasmo-flex plasmo-flex-col plasmo-scrollbar-thin">
        {showCreateForm && (
          <CreateTemplateForm onClose={() => setShowCreateForm(false)} />
        )}

        {sortedTemplates.length === 0 && !showCreateForm ? (
          <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-h-full plasmo-text-stone-300 plasmo-gap-2">
            <HistoryIcon className="plasmo-w-8 plasmo-h-8 plasmo-opacity-20" />
            <span className="plasmo-text-sm">暂无模板，请创建</span>
          </div>
        ) : (
          sortedTemplates.map((template) => {
            const isExpanded = activeTemplateId === template.id
            const isDeleting = deleteConfirmId === template.id
            const preview = getPreview(template.id, template.templateString)

            return (
              <div
                key={template.id}
                className={`plasmo-rounded-xl plasmo-border plasmo-transition-all plasmo-duration-200
                  ${
                    isExpanded
                      ? "plasmo-bg-white plasmo-border-rose-200 plasmo-shadow-sm plasmo-ring-1 plasmo-ring-rose-100"
                      : "plasmo-bg-white/50 plasmo-border-transparent hover:plasmo-bg-white hover:plasmo-shadow-sm hover:plasmo-border-stone-200"
                  }`}>
                {/* Card header */}
                <div
                  onClick={() => handleToggleExpand(template.id)}
                  className="plasmo-group plasmo-relative plasmo-p-3 plasmo-cursor-pointer">
                  <div className="plasmo-flex plasmo-items-start plasmo-justify-between plasmo-gap-2">
                    <div className="plasmo-flex-1 plasmo-min-w-0">
                      <div
                        className={`plasmo-text-sm plasmo-font-medium plasmo-truncate ${
                          isExpanded
                            ? "plasmo-text-rose-600"
                            : "plasmo-text-stone-700"
                        }`}>
                        {template.name}
                      </div>
                      <div
                        title={preview}
                        className="plasmo-text-xs plasmo-text-stone-400 plasmo-truncate plasmo-font-mono plasmo-mt-0.5">
                        {preview}
                      </div>
                    </div>

                    {isDeleting ? (
                      <div className="plasmo-flex plasmo-items-center plasmo-gap-1.5 plasmo-bg-white plasmo-rounded-lg plasmo-shadow-lg plasmo-p-1 plasmo-border plasmo-border-rose-200">
                        <span className="plasmo-text-xs plasmo-text-stone-600 plasmo-font-medium plasmo-whitespace-nowrap plasmo-px-1">
                          确认删除？
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(template.id)
                          }}
                          className="plasmo-px-2 plasmo-py-0.5 plasmo-text-xs plasmo-font-medium plasmo-bg-rose-500 plasmo-text-white plasmo-rounded hover:plasmo-bg-rose-600 plasmo-transition-all">
                          是
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteConfirmId(null)
                          }}
                          className="plasmo-px-2 plasmo-py-0.5 plasmo-text-xs plasmo-font-medium plasmo-bg-stone-100 plasmo-text-stone-600 plasmo-rounded hover:plasmo-bg-stone-200 plasmo-transition-all">
                          否
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirmId(template.id)
                        }}
                        title="删除模板"
                        className="plasmo-p-1.5 plasmo-text-stone-400 hover:plasmo-text-rose-500 hover:plasmo-bg-rose-50 plasmo-rounded-md plasmo-transition-all plasmo-opacity-0 group-hover:plasmo-opacity-100 plasmo-shrink-0">
                        <TrashIcon className="plasmo-w-3.5 plasmo-h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded card body */}
                {isExpanded && (
                  <div className="plasmo-px-3 plasmo-pb-3 plasmo-border-t plasmo-border-stone-100 plasmo-pt-3">
                    <TemplateCardBody templateId={template.id} />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
