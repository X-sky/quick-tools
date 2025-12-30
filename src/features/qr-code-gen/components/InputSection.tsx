import { CheckIcon, EditIcon, LinkIcon } from "~icons"

import { useQrCode } from "../context"

export function InputSection() {
  const { text, setText, isConfirmed, confirmInput, editInput, inputRef } =
    useQrCode()
  const handleGetCurrentUrl = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })
      if (tab?.url) {
        // 进入编辑模式
        editInput()
        // 设置为当前url
        setText(tab.url)
      }
    } catch (error) {
      console.error("Failed to get current URL:", error)
    }
  }
  return (
    <div className="plasmo-bg-white plasmo-p-6 plasmo-shadow-sm plasmo-z-10 plasmo-flex plasmo-flex-col plasmo-gap-4 plasmo-transition-all plasmo-duration-300">
      <div className="plasmo-flex plasmo-items-stretch plasmo-gap-3">
        <div className="plasmo-flex-1 plasmo-relative plasmo-group plasmo-h-24">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isConfirmed}
            placeholder="Enter text to generate QR code..."
            className={`plasmo-w-full plasmo-h-full plasmo-p-3 plasmo-rounded-xl plasmo-bg-stone-100 plasmo-border-2 plasmo-resize-none plasmo-outline-none plasmo-transition-all plasmo-duration-200 plasmo-font-medium
              ${
                isConfirmed
                  ? "plasmo-border-transparent plasmo-text-stone-500 plasmo-bg-stone-50 plasmo-cursor-default"
                  : "plasmo-border-stone-200 focus:plasmo-border-rose-400 focus:plasmo-bg-white plasmo-text-stone-800"
              }`}
          />
          {/* Character Count or Status */}
          <div className="plasmo-absolute plasmo-bottom-2 plasmo-right-3 plasmo-text-xs plasmo-text-stone-400 plasmo-pointer-events-none">
            {text.length} chars
          </div>
        </div>

        <div className="plasmo-w-24 plasmo-h-24 plasmo-flex plasmo-flex-col plasmo-gap-1.5">
          <button
            onClick={isConfirmed ? editInput : confirmInput}
            disabled={!text.trim() && !isConfirmed}
            className={`plasmo-flex-1 plasmo-w-full plasmo-rounded-xl plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-gap-0.5 plasmo-transition-all plasmo-duration-200 plasmo-shadow-md active:plasmo-scale-[0.97] plasmo-font-semibold
            ${
              !text.trim() && !isConfirmed
                ? "plasmo-bg-stone-200 plasmo-text-stone-400 plasmo-cursor-not-allowed plasmo-shadow-none"
                : isConfirmed
                  ? "plasmo-bg-white plasmo-border-2 plasmo-border-rose-200 plasmo-text-rose-500 hover:plasmo-border-rose-300 hover:plasmo-bg-rose-50 hover:plasmo-shadow-lg"
                  : "plasmo-bg-gradient-to-br plasmo-from-rose-500 plasmo-to-rose-600 plasmo-text-white hover:plasmo-from-rose-600 hover:plasmo-to-rose-700 hover:plasmo-shadow-lg hover:plasmo-shadow-rose-200"
            }`}>
            {isConfirmed ? (
              <>
                <EditIcon className="plasmo-w-5 plasmo-h-5" />
                <span className="plasmo-text-xs">Edit</span>
              </>
            ) : (
              <>
                <CheckIcon className="plasmo-w-5 plasmo-h-5" />
                <span className="plasmo-text-xs">Generate</span>
              </>
            )}
          </button>
          <button
            onClick={handleGetCurrentUrl}
            title="Generate QR code from current page URL"
            className="plasmo-w-full plasmo-h-8 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-gap-1 plasmo-text-stone-500 hover:plasmo-text-rose-500 plasmo-bg-stone-50 hover:plasmo-bg-rose-50 plasmo-rounded-lg plasmo-transition-all plasmo-duration-200 plasmo-border plasmo-border-stone-200 hover:plasmo-border-rose-300 plasmo-shadow-sm hover:plasmo-shadow active:plasmo-scale-[0.97]">
            <LinkIcon className="plasmo-w-3 plasmo-h-3" />
            <span className="plasmo-text-[10px] plasmo-font-medium plasmo-uppercase plasmo-tracking-wide">
              URL
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
