import React from "react"

import { JsonFormatter } from "../features/json-formatter"

import "~style.css"

function JsonFormatterTab() {
  return (
    <div className="plasmo-w-full plasmo-max-w-[1200px] plasmo-mx-auto plasmo-flex plasmo-flex-col plasmo-min-h-screen plasmo-h-screen plasmo-font-sans plasmo-text-stone-800 plasmo-bg-gray-50">
      <JsonFormatter />
    </div>
  )
}

export default JsonFormatterTab
