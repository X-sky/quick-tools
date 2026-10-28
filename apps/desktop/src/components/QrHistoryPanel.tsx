import { useEffect, useRef, useState } from "react"

import type { HistoryItem } from "@quick-tools/qr-code-gen"
import {
  Check,
  Copy,
  DownloadSimple,
  Plus,
  Tag,
  Trash,
  UploadSimple,
  X
} from "@phosphor-icons/react"

interface QrHistoryPanelProps {
  items: HistoryItem[]
  totalCount: number
  allTags: string[]
  selectedTag: string | null
  onSelectTag: (tag: string | null) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  activeContent: string | null
  onSelect: (item: HistoryItem) => void
  onDelete: (content: string) => void
  onCopy: (content: string) => Promise<boolean>
  onAddTag: (content: string, tag: string) => void
  onRemoveTag: (content: string, tag: string) => void
  onImport: () => void
  onExport: () => void
}

export function QrHistoryPanel({
  items,
  totalCount,
  allTags,
  selectedTag,
  onSelectTag,
  searchQuery,
  onSearchChange,
  activeContent,
  onSelect,
  onDelete,
  onCopy,
  onAddTag,
  onRemoveTag,
  onImport,
  onExport
}: QrHistoryPanelProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [taggingContent, setTaggingContent] = useState<string | null>(null)
  const [newTag, setNewTag] = useState("")
  const tagInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (taggingContent) tagInputRef.current?.focus()
  }, [taggingContent])

  const submitTag = (content: string) => {
    if (newTag.trim()) onAddTag(content, newTag.trim())
    setNewTag("")
    setTaggingContent(null)
  }

  return (
    <div className="flex h-full w-72 flex-col border-l border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3 dark:border-stone-800">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          生成历史
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onImport}
            title="导入历史"
            aria-label="导入历史"
            className="rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200">
            <UploadSimple size={14} weight="light" />
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={totalCount === 0}
            title="导出历史"
            aria-label="导出历史"
            className="rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-stone-800 dark:hover:text-stone-200">
            <DownloadSimple size={14} weight="light" />
          </button>
        </div>
      </div>

      <div className="px-3 py-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜索..."
          className="input-field !py-1.5 !text-xs"
        />
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-nowrap gap-1.5 overflow-x-auto px-3 pb-2">
          <button
            type="button"
            onClick={() => onSelectTag(null)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              !selectedTag
                ? "bg-rose-500 text-white"
                : "border border-stone-200 text-stone-500 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
            }`}>
            全部
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onSelectTag(tag)}
              className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedTag === tag
                  ? "bg-rose-500 text-white"
                  : "border border-stone-200 text-stone-500 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
              }`}>
              <Tag size={12} weight="light" />
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-stone-400 dark:text-stone-600">
            {searchQuery || selectedTag ? "没有匹配的记录" : "暂无历史记录"}
          </div>
        ) : (
          <ul className="space-y-1 px-2 py-1">
            {items.map((item) => {
              const active = activeContent === item.content
              return (
                <li
                  key={item.content}
                  className={`group relative rounded-lg border transition-colors ${
                    active
                      ? "border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/20"
                      : "border-transparent hover:bg-stone-50 dark:hover:bg-stone-800"
                  }`}>
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    title={item.content}
                    className="block w-full overflow-hidden px-2.5 pb-1 pt-2 pr-16 text-left">
                    <span
                      className={`block truncate text-sm ${
                        active
                          ? "font-medium text-rose-600 dark:text-rose-400"
                          : "text-stone-700 dark:text-stone-300"
                      }`}>
                      {item.content}
                    </span>
                    <span className="text-[11px] text-stone-400 dark:text-stone-600">
                      {new Date(item.timestamp).toLocaleString("zh-CN", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </button>

                  {deleting === item.content ? (
                    <div className="absolute right-2 top-1.5 flex items-center gap-1 rounded-lg border border-rose-200 bg-white p-1.5 shadow-md dark:border-rose-900 dark:bg-stone-900">
                      <span className="whitespace-nowrap px-1 text-xs text-stone-600 dark:text-stone-300">
                        删除？
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onDelete(item.content)
                          setDeleting(null)
                        }}
                        className="rounded bg-rose-500 px-2 py-0.5 text-xs text-white hover:bg-rose-600">
                        是
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(null)}
                        className="rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300">
                        否
                      </button>
                    </div>
                  ) : (
                    <div className="absolute right-2 top-1.5 flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => {
                          void onCopy(item.content).then((ok) => {
                            if (!ok) return
                            setCopied(item.content)
                            setTimeout(() => setCopied(null), 1500)
                          })
                        }}
                        title="复制文本"
                        aria-label="复制文本"
                        className={`rounded-md p-1 hover:bg-stone-100 dark:hover:bg-stone-800 ${
                          copied === item.content
                            ? "text-emerald-500"
                            : "text-stone-400 hover:text-stone-700"
                        }`}>
                        {copied === item.content ? (
                          <Check size={14} weight="light" />
                        ) : (
                          <Copy size={14} weight="light" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(item.content)}
                        title="删除"
                        aria-label="删除记录"
                        className="rounded-md p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30">
                        <Trash size={14} weight="light" />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1 px-2.5 pb-2">
                    {(item.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                        {tag}
                        <button
                          type="button"
                          onClick={() => onRemoveTag(item.content, tag)}
                          aria-label={`移除标签 ${tag}`}
                          className="text-stone-400 hover:text-rose-500">
                          <X size={10} weight="light" />
                        </button>
                      </span>
                    ))}
                    {taggingContent === item.content ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          submitTag(item.content)
                        }}>
                        <input
                          ref={tagInputRef}
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onBlur={() => {
                            if (!newTag.trim()) setTaggingContent(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              setNewTag("")
                              setTaggingContent(null)
                            }
                          }}
                          placeholder="标签名"
                          className="w-20 rounded-full border border-stone-200 bg-transparent px-2 py-0.5 text-xs outline-none focus:border-rose-300 dark:border-stone-700"
                        />
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setTaggingContent(item.content)
                          setNewTag("")
                        }}
                        title="添加标签"
                        aria-label="添加标签"
                        className="rounded-full p-0.5 text-stone-300 hover:bg-stone-100 hover:text-rose-500 dark:text-stone-600 dark:hover:bg-stone-800">
                        <Plus size={12} weight="light" />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
