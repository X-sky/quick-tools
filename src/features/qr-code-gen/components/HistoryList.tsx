import { History, Trash } from "~icons"

import { useQrCode } from "../context"
import { formatDate } from "../utils"

export function HistoryList() {
  const { history, isConfirmed, text, selectHistory, deleteHistory } =
    useQrCode()

  return (
    <div className="plasmo-w-[400px] plasmo-flex plasmo-flex-col plasmo-bg-stone-50 plasmo-border-r plasmo-border-stone-100">
      <div className="plasmo-px-5 plasmo-py-3 plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-text-stone-400 plasmo-text-xs plasmo-font-bold plasmo-uppercase plasmo-tracking-wider">
        <History className="plasmo-w-3.5 plasmo-h-3.5" />
        History
      </div>

      <div className="plasmo-flex-1 plasmo-overflow-y-auto plasmo-p-3 plasmo-pt-0 plasmo-gap-2 plasmo-flex plasmo-flex-col plasmo-scrollbar-thin">
        {history.length === 0 ? (
          <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-h-full plasmo-text-stone-300 plasmo-gap-2">
            <History className="plasmo-w-8 plasmo-h-8 plasmo-opacity-20" />
            <span className="plasmo-text-sm">No history yet</span>
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              onClick={() => selectHistory(item)}
              className={`plasmo-group plasmo-p-3 plasmo-rounded-xl plasmo-cursor-pointer plasmo-border plasmo-transition-all plasmo-duration-200 plasmo-flex plasmo-items-center plasmo-justify-between plasmo-gap-3
                ${
                  isConfirmed && text === item.content
                    ? "plasmo-bg-white plasmo-border-rose-200 plasmo-shadow-sm plasmo-ring-1 plasmo-ring-rose-100"
                    : "plasmo-bg-white/50 plasmo-border-transparent hover:plasmo-bg-white hover:plasmo-shadow-sm hover:plasmo-border-stone-200"
                }`}>
              <div className="plasmo-flex-1 plasmo-min-w-0 plasmo-flex plasmo-flex-col plasmo-gap-0.5">
                <div
                  className={`plasmo-text-sm plasmo-truncate plasmo-font-medium ${
                    isConfirmed && text === item.content
                      ? "plasmo-text-rose-600"
                      : "plasmo-text-stone-700"
                  }`}>
                  {item.content}
                </div>
                <div className="plasmo-text-[10px] plasmo-text-stone-400">
                  {formatDate(item.timestamp)}
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteHistory(item.id)
                }}
                className="plasmo-opacity-0 group-hover:plasmo-opacity-100 plasmo-p-1.5 plasmo-text-stone-400 hover:plasmo-text-rose-500 hover:plasmo-bg-rose-50 plasmo-rounded-lg plasmo-transition-all">
                <Trash className="plasmo-w-3.5 plasmo-h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
