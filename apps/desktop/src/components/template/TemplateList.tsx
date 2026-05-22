import { useState } from "react"

import type { Template } from "@quick-tools/qr-code-gen"

export interface TemplateListProps {
  templates: Template[]
  activeTemplateId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onImport: () => void
  onExport: () => void
}

export const TemplateList = ({
  templates,
  activeTemplateId,
  onSelect,
  onCreate,
  onDelete,
  onImport,
  onExport
}: TemplateListProps) => {
  const [showConfirmId, setShowConfirmId] = useState<string | null>(null)

  const sortedTemplates = [...templates].sort(
    (a, b) => b.updatedAt - a.updatedAt
  )

  const handleDelete = (id: string) => {
    if (showConfirmId === id) {
      onDelete(id)
      setShowConfirmId(null)
    } else {
      setShowConfirmId(id)
    }
  }

  return (
    <div className="flex flex-col rounded-lg border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2.5 dark:border-stone-800">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          模板列表
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onImport}
            className="rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
            aria-label="导入模板"
            title="导入">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-3.5 w-3.5">
              <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h2.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H12.5A1.5 1.5 0 0 1 14 5.5v1.401a2.986 2.986 0 0 0-1.5-.401h-9A2.986 2.986 0 0 0 2 6.901V3.5Z" />
              <path d="M2 9.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.5H2v-.5Z" />
              <path
                fillRule="evenodd"
                d="M8 10a.75.75 0 0 1 .75.75v1.69l.72-.72a.75.75 0 1 1 1.06 1.06l-2 2a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 1 1 1.06-1.06l.72.72v-1.69A.75.75 0 0 1 8 10Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={onExport}
            className="rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
            aria-label="导出模板"
            title="导出">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-3.5 w-3.5">
              <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h2.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H12.5A1.5 1.5 0 0 1 14 5.5v1.401a2.986 2.986 0 0 0-1.5-.401h-9A2.986 2.986 0 0 0 2 6.901V3.5Z" />
              <path d="M2 9.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.5H2v-.5Z" />
              <path
                fillRule="evenodd"
                d="M8 14a.75.75 0 0 0 .75-.75v-1.69l.72.72a.75.75 0 1 0 1.06-1.06l-2-2a.75.75 0 0 0-1.06 0l-2 2a.75.75 0 1 0 1.06 1.06l.72-.72v1.69c0 .414.336.75.75.75Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="max-h-48 flex-1 overflow-y-auto">
        {sortedTemplates.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-stone-400 dark:text-stone-600">
            暂无模板，点击新建模板开始
          </div>
        ) : (
          <ul className="space-y-0.5 px-2 py-1">
            {sortedTemplates.map((template) => (
              <li
                key={template.id}
                className={`group flex items-center gap-1 rounded-lg transition-colors ${
                  activeTemplateId === template.id
                    ? "bg-blue-50 dark:bg-blue-950/30"
                    : "hover:bg-stone-50 dark:hover:bg-stone-800"
                }`}>
                <button
                  type="button"
                  onClick={() => onSelect(template.id)}
                  className={`flex-1 overflow-hidden px-2.5 py-2 text-left text-sm ${
                    activeTemplateId === template.id
                      ? "font-medium text-blue-700 dark:text-blue-300"
                      : "text-stone-700 dark:text-stone-300"
                  }`}>
                  <span className="block truncate">{template.name}</span>
                </button>
                {showConfirmId === template.id ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(template.id)}
                    className="mr-1.5 shrink-0 rounded-md px-2 py-1 text-xs font-medium text-rose-600 transition-all hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                    aria-label="确认删除">
                    确认
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDelete(template.id)}
                    className="mr-1.5 shrink-0 rounded-md p-1 text-stone-400 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                    aria-label="删除模板">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="h-3.5 w-3.5">
                      <path
                        fillRule="evenodd"
                        d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-stone-100 px-3 py-2 dark:border-stone-800">
        <button
          type="button"
          onClick={onCreate}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-3.5 w-3.5">
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          新建模板
        </button>
      </div>
    </div>
  )
}
