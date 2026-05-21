import { useCallback, useEffect, useRef, useState } from "react"

import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  HistoryIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
  UploadIcon,
  XIcon
} from "~icons"

import { useQrCode } from "../context"

export function HistoryList() {
  const {
    isConfirmed,
    text,
    allTags,
    selectedTag,
    filteredHistory,
    selectHistory,
    deleteHistory,
    addTagToItem,
    removeTagFromItem,
    setSelectedTag,
    exportHistory,
    importHistory
  } = useQrCode()

  const [editingTagContent, setEditingTagContent] = useState<string | null>(
    null
  )
  const [newTag, setNewTag] = useState("")
  const [copiedContent, setCopiedContent] = useState<string | null>(null)
  const [deletingContent, setDeletingContent] = useState<string | null>(null)
  const [importFeedback, setImportFeedback] = useState<string | null>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 切换标签时聚焦首项
  useEffect(() => {
    if (filteredHistory.length > 0) {
      selectHistory(filteredHistory[0])
    }
  }, [selectedTag])

  useEffect(() => {
    if (editingTagContent && tagInputRef.current) {
      tagInputRef.current.focus()
    }
  }, [editingTagContent])

  const handleAddTag = (content: string) => {
    if (newTag.trim()) {
      addTagToItem(content, newTag.trim())
      setNewTag("")
      setEditingTagContent(null)
    }
  }

  const showImportFeedback = useCallback((msg: string) => {
    setImportFeedback(msg)
    setTimeout(() => setImportFeedback(null), 3000)
  }, [])

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const result = await importHistory(file)
      if (result.error) {
        showImportFeedback(result.error)
      } else {
        const parts: string[] = []
        if (result.added > 0) parts.push(`新增 ${result.added} 条`)
        if (result.merged > 0) parts.push(`合并 ${result.merged} 条`)
        showImportFeedback(parts.join("，") || "没有新记录")
      }
      // 重置 input 以便重复导入同一文件
      e.target.value = ""
    },
    [importHistory, showImportFeedback]
  )

  return (
    <div className="plasmo-w-[400px] plasmo-flex plasmo-flex-col plasmo-bg-stone-50 plasmo-border-r plasmo-border-stone-100">
      <div className="plasmo-px-5 plasmo-py-3 plasmo-flex plasmo-items-center plasmo-justify-between">
        <div className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-text-stone-400 plasmo-text-xs plasmo-font-bold plasmo-uppercase plasmo-tracking-wider">
          <HistoryIcon className="plasmo-w-3.5 plasmo-h-3.5" />
          History
        </div>
        <div className="plasmo-flex plasmo-items-center plasmo-gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="plasmo-hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="import list"
            className="plasmo-p-1.5 plasmo-text-stone-400 hover:plasmo-text-emerald-600 hover:plasmo-bg-emerald-50 plasmo-rounded-md plasmo-transition-all">
            <UploadIcon className="plasmo-w-3.5 plasmo-h-3.5" />
          </button>
          <button
            onClick={exportHistory}
            title="export list"
            disabled={filteredHistory.length === 0}
            className="plasmo-p-1.5 plasmo-text-stone-400 hover:plasmo-text-blue-600 hover:plasmo-bg-blue-50 plasmo-rounded-md plasmo-transition-all disabled:plasmo-opacity-30 disabled:plasmo-cursor-not-allowed">
            <DownloadIcon className="plasmo-w-3.5 plasmo-h-3.5" />
          </button>
        </div>
      </div>

      {/* 导入反馈 */}
      {importFeedback && (
        <div className="plasmo-mx-3 plasmo-mb-2 plasmo-px-3 plasmo-py-1.5 plasmo-text-xs plasmo-font-medium plasmo-text-emerald-700 plasmo-bg-emerald-50 plasmo-border plasmo-border-emerald-200 plasmo-rounded-lg">
          {importFeedback}
        </div>
      )}

      {/* 标签筛选区 */}
      {allTags.length > 0 && (
        <div className="plasmo-px-3 plasmo-pb-2 plasmo-flex plasmo-gap-1.5 plasmo-overflow-x-auto plasmo-scrollbar-thin plasmo-flex-nowrap">
          <button
            onClick={() => setSelectedTag(null)}
            className={`plasmo-px-2.5 plasmo-py-1 plasmo-text-xs plasmo-rounded-full plasmo-transition-all plasmo-duration-200 plasmo-font-medium plasmo-flex-shrink-0
              ${!selectedTag ? "plasmo-bg-rose-500 plasmo-text-white plasmo-shadow-sm" : "plasmo-bg-white plasmo-text-stone-500 hover:plasmo-bg-stone-100 plasmo-border plasmo-border-stone-200"}`}>
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`plasmo-px-2.5 plasmo-py-1 plasmo-text-xs plasmo-rounded-full plasmo-transition-all plasmo-duration-200 plasmo-font-medium plasmo-flex plasmo-items-center plasmo-gap-1 plasmo-whitespace-nowrap plasmo-flex-shrink-0
                ${selectedTag === tag ? "plasmo-bg-rose-500 plasmo-text-white plasmo-shadow-sm" : "plasmo-bg-white plasmo-text-stone-500 hover:plasmo-bg-stone-100 plasmo-border plasmo-border-stone-200"}`}>
              <TagIcon className="plasmo-w-3 plasmo-h-3" />
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="plasmo-flex-1 plasmo-overflow-y-auto plasmo-p-3 plasmo-pt-0 plasmo-gap-2 plasmo-flex plasmo-flex-col plasmo-scrollbar-thin">
        {filteredHistory.length === 0 ? (
          <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-h-full plasmo-text-stone-300 plasmo-gap-2">
            <HistoryIcon className="plasmo-w-8 plasmo-h-8 plasmo-opacity-20" />
            <span className="plasmo-text-sm">
              {selectedTag ? "No items with this tag" : "No history yet"}
            </span>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div
              key={item.content}
              onClick={() => selectHistory(item)}
              className={`plasmo-group plasmo-relative plasmo-p-3 plasmo-rounded-xl plasmo-cursor-pointer plasmo-border plasmo-transition-all plasmo-duration-200
                ${
                  isConfirmed && text === item.content
                    ? "plasmo-bg-white plasmo-border-rose-200 plasmo-shadow-sm plasmo-ring-1 plasmo-ring-rose-100"
                    : "plasmo-bg-white/50 plasmo-border-transparent hover:plasmo-bg-white hover:plasmo-shadow-sm hover:plasmo-border-stone-200"
                }`}>
              <div className="plasmo-flex-1 plasmo-min-w-0">
                <div
                  title={item.content}
                  className={`plasmo-text-sm plasmo-truncate plasmo-font-medium ${
                    isConfirmed && text === item.content
                      ? "plasmo-text-rose-600"
                      : "plasmo-text-stone-700"
                  }`}>
                  {item.content}
                </div>
              </div>

              {deletingContent === item.content ? (
                <div className="plasmo-absolute plasmo-right-3 plasmo-top-2 plasmo-flex plasmo-items-center plasmo-gap-1.5 plasmo-bg-white plasmo-rounded-lg plasmo-shadow-lg plasmo-p-2 plasmo-border plasmo-border-rose-200">
                  <span className="plasmo-text-xs plasmo-text-stone-600 plasmo-font-medium plasmo-whitespace-nowrap">
                    Delete?
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteHistory(item.content)
                      setDeletingContent(null)
                    }}
                    className="plasmo-px-2 plasmo-py-1 plasmo-text-xs plasmo-font-medium plasmo-bg-rose-500 plasmo-text-white plasmo-rounded plasmo-transition-all hover:plasmo-bg-rose-600">
                    Yes
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeletingContent(null)
                    }}
                    className="plasmo-px-2 plasmo-py-1 plasmo-text-xs plasmo-font-medium plasmo-bg-stone-100 plasmo-text-stone-600 plasmo-rounded plasmo-transition-all hover:plasmo-bg-stone-200">
                    No
                  </button>
                </div>
              ) : (
                <div className="plasmo-absolute plasmo-right-3 plasmo-top-2 plasmo-flex plasmo-flex-col plasmo-gap-1 plasmo-opacity-0 group-hover:plasmo-opacity-100 plasmo-transition-all">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeletingContent(item.content)
                    }}
                    title="Delete"
                    className="plasmo-p-1.5 plasmo-text-stone-400 hover:plasmo-text-rose-500 plasmo-bg-white/60 plasmo-backdrop-blur-md plasmo-rounded-lg plasmo-transition-all plasmo-shadow-sm">
                    <TrashIcon className="plasmo-w-3.5 plasmo-h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigator.clipboard.writeText(item.content)
                      setCopiedContent(item.content)
                      setTimeout(() => setCopiedContent(null), 1500)
                    }}
                    title="Copy"
                    className={`plasmo-p-1.5 plasmo-bg-white/60 plasmo-backdrop-blur-md plasmo-rounded-lg plasmo-transition-all plasmo-shadow-sm ${
                      copiedContent === item.content
                        ? "plasmo-text-emerald-500"
                        : "plasmo-text-stone-400 hover:plasmo-text-blue-500"
                    }`}>
                    {copiedContent === item.content ? (
                      <CheckIcon className="plasmo-w-3.5 plasmo-h-3.5" />
                    ) : (
                      <CopyIcon className="plasmo-w-3.5 plasmo-h-3.5" />
                    )}
                  </button>
                </div>
              )}

              {/* 标签展示与添加区 */}
              <div className="plasmo-mt-2 plasmo-flex plasmo-flex-wrap plasmo-items-center plasmo-gap-1.5">
                {item.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="plasmo-inline-flex plasmo-items-center plasmo-gap-1 plasmo-px-2 plasmo-py-0.5 plasmo-text-xs plasmo-bg-stone-100 plasmo-text-stone-600 plasmo-rounded-full">
                    {tag}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeTagFromItem(item.content, tag)
                      }}
                      className="plasmo-text-stone-400 hover:plasmo-text-rose-500 plasmo-transition-colors">
                      <XIcon className="plasmo-w-3 plasmo-h-3" />
                    </button>
                  </span>
                ))}

                {editingTagContent === item.content ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleAddTag(item.content)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="plasmo-flex plasmo-items-center plasmo-gap-1">
                    <input
                      ref={tagInputRef}
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onBlur={() => {
                        if (!newTag.trim()) setEditingTagContent(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setNewTag("")
                          setEditingTagContent(null)
                        }
                      }}
                      placeholder="Tag name"
                      className="plasmo-w-20 plasmo-px-2 plasmo-py-0.5 plasmo-text-xs plasmo-border plasmo-border-stone-200 plasmo-rounded-full plasmo-outline-none focus:plasmo-border-rose-300 focus:plasmo-ring-1 focus:plasmo-ring-rose-100"
                    />
                  </form>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingTagContent(item.content)
                      setNewTag("")
                    }}
                    className="plasmo-p-1 plasmo-text-stone-300 hover:plasmo-text-rose-500 plasmo-transition-colors plasmo-rounded-full hover:plasmo-bg-stone-100"
                    title="Add tag">
                    <PlusIcon className="plasmo-w-3.5 plasmo-h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
