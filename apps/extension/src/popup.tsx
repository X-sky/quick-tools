import QrCodeGen from "~features/qr-code-gen"
import { initChromePlatform } from "~platform"

import "~style.css"

initChromePlatform()

/** Open the export page bound to the active tab so it can export that page. */
async function openWebExport() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const query = tab?.id ? `?tabId=${tab.id}` : ""
  const url = tab?.url?.startsWith("http") ? `&url=${encodeURIComponent(tab.url)}` : ""
  await chrome.tabs.create({
    url: `./tabs/web-export.html${query}${query ? url : ""}`
  })
}

function IndexPopup() {
  return (
    <div className="plasmo-flex plasmo-flex-col plasmo-w-[600px]">
      <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-px-4 plasmo-py-2 plasmo-bg-stone-50 plasmo-border-b plasmo-border-stone-200">
        <span className="plasmo-font-semibold plasmo-text-stone-600">
          Quick Tools
        </span>
        <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
          <button
            onClick={() => void openWebExport()}
            className="plasmo-px-3 plasmo-py-1.5 plasmo-text-xs plasmo-font-medium plasmo-text-rose-600 plasmo-bg-rose-50 plasmo-rounded-md hover:plasmo-bg-rose-100 plasmo-transition-colors">
            网页导出 ↗
          </button>
          <button
            onClick={() =>
              chrome.tabs.create({ url: "./tabs/json-formatter.html" })
            }
            className="plasmo-px-3 plasmo-py-1.5 plasmo-text-xs plasmo-font-medium plasmo-text-blue-600 plasmo-bg-blue-50 plasmo-rounded-md hover:plasmo-bg-blue-100 plasmo-transition-colors">
            JSON Formatter ↗
          </button>
        </div>
      </div>
      <QrCodeGen />
    </div>
  )
}

export default IndexPopup
