import { Check, Edit } from "~icons"

import { useQrCode } from "../context"

export function InputSection() {
  const { text, setText, isConfirmed, confirmInput, editInput, inputRef } =
    useQrCode()

  return (
    <div className="plasmo-bg-white plasmo-p-6 plasmo-shadow-sm plasmo-z-10 plasmo-flex plasmo-flex-col plasmo-gap-4 plasmo-transition-all plasmo-duration-300">
      <div className="plasmo-flex plasmo-items-start plasmo-gap-3">
        <div className="plasmo-flex-1 plasmo-relative plasmo-group">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isConfirmed}
            placeholder="Enter text to generate QR code..."
            className={`plasmo-w-full plasmo-h-20 plasmo-p-3 plasmo-rounded-xl plasmo-bg-stone-100 plasmo-border-2 plasmo-resize-none plasmo-outline-none plasmo-transition-all plasmo-duration-200 plasmo-font-medium
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

        <button
          onClick={isConfirmed ? editInput : confirmInput}
          disabled={!text.trim() && !isConfirmed}
          className={`plasmo-h-20 plasmo-w-20 plasmo-rounded-xl plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-gap-1 plasmo-transition-all plasmo-duration-200 plasmo-shadow-sm active:plasmo-scale-95
            ${
              !text.trim() && !isConfirmed
                ? "plasmo-bg-stone-200 plasmo-text-stone-400 plasmo-cursor-not-allowed"
                : isConfirmed
                  ? "plasmo-bg-white plasmo-border-2 plasmo-border-rose-100 plasmo-text-rose-500 hover:plasmo-border-rose-200 hover:plasmo-bg-rose-50"
                  : "plasmo-bg-rose-500 plasmo-text-white hover:plasmo-bg-rose-600 hover:plasmo-shadow-md"
            }`}>
          {isConfirmed ? (
            <>
              <Edit className="plasmo-w-6 plasmo-h-6" />
              <span className="plasmo-text-xs plasmo-font-bold">Edit</span>
            </>
          ) : (
            <>
              <Check className="plasmo-w-6 plasmo-h-6" />
              <span className="plasmo-text-xs plasmo-font-bold">Generate</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
