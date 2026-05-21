import React from "react"

import { JsonComparator } from "../features/json-formatter/components/JsonComparator"

import "~style.css"

function JsonFormatterTab() {
  return (
    <div className="plasmo-w-full plasmo-max-w-[1400px] plasmo-mx-auto plasmo-flex plasmo-flex-col plasmo-min-h-screen plasmo-h-screen plasmo-font-sans plasmo-text-stone-800 plasmo-bg-gray-50">
      <JsonComparator />
    </div>
  )
}

export default JsonFormatterTab
