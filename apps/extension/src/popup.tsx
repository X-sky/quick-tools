import QrCodeGen from "~features/qr-code-gen"

import "~style.css"

function IndexPopup() {
  return (
    <div className="plasmo-flex plasmo-flex-col plasmo-w-[600px]">
      <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-px-4 plasmo-py-2 plasmo-bg-stone-50 plasmo-border-b plasmo-border-stone-200">
        <span className="plasmo-font-semibold plasmo-text-stone-600">
          Quick Tools
        </span>
        <button
          onClick={() =>
            chrome.tabs.create({ url: "./tabs/json-formatter.html" })
          }
          className="plasmo-px-3 plasmo-py-1.5 plasmo-text-xs plasmo-font-medium plasmo-text-blue-600 plasmo-bg-blue-50 plasmo-rounded-md hover:plasmo-bg-blue-100 plasmo-transition-colors">
          JSON Formatter ↗
        </button>
      </div>
      <QrCodeGen />
    </div>
  )
}

export default IndexPopup
