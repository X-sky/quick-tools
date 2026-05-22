import { type ReactNode } from "react"

interface HistoryPanelProps<T> {
  items: T[]
  searchQuery: string
  onSearchChange: (query: string) => void
  onSelect: (item: T) => void
  onDelete: (index: number) => void
  renderItem: (item: T) => ReactNode
  title: string
}

export const HistoryPanel = <T,>({
  items,
  searchQuery,
  onSearchChange,
  onSelect,
  onDelete,
  renderItem,
  title
}: HistoryPanelProps<T>) => {
  return (
    <div className="flex h-full w-60 flex-col border-l border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="border-b border-stone-100 px-4 py-3 dark:border-stone-800">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          {title}
        </h2>
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

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-stone-400 dark:text-stone-600">
            {searchQuery ? "没有匹配的记录" : "暂无历史记录"}
          </div>
        ) : (
          <ul className="space-y-0.5 px-2 py-1">
            {items.map((item, index) => (
              <li
                key={index}
                className="group flex items-center gap-1 rounded-lg transition-colors hover:bg-stone-50 dark:hover:bg-stone-800">
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="flex-1 overflow-hidden px-2.5 py-2 text-left text-sm text-stone-700 dark:text-stone-300">
                  {renderItem(item)}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(index)}
                  className="mr-1.5 shrink-0 rounded-md p-1 text-stone-400 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                  aria-label="删除记录">
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
