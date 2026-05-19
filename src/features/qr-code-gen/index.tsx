import { useState } from "react"

import { HistoryList, InputSection, ModeSwitch, QrDisplay } from "./components"
import { QrCodeProvider } from "./context"
import { TemplateProvider } from "./template/context"
import { TemplateMode } from "./template"

function QrCodeGenContent() {
  const [mode, setMode] = useState<"free" | "template">("free")

  return (
    <div className="plasmo-w-[600px] plasmo-bg-stone-50 plasmo-flex plasmo-flex-col plasmo-h-[500px] plasmo-font-sans plasmo-text-stone-800 plasmo-overflow-hidden">
      <div className="plasmo-px-4 plasmo-pt-3 plasmo-pb-2">
        <ModeSwitch mode={mode} onModeChange={setMode} />
      </div>

      <div style={{ display: mode === "free" ? "contents" : "none" }}>
        <InputSection />
        <div className="plasmo-flex-1 plasmo-flex plasmo-overflow-hidden">
          <HistoryList />
          <QrDisplay />
        </div>
      </div>

      <div style={{ display: mode === "template" ? "contents" : "none" }}>
        <TemplateMode />
      </div>
    </div>
  )
}

export default function QrCodeGen() {
  return (
    <QrCodeProvider>
      <TemplateProvider>
        <QrCodeGenContent />
      </TemplateProvider>
    </QrCodeProvider>
  )
}
