import { HistoryList, InputSection, QrDisplay } from "./components"
import { QrCodeProvider } from "./context"

function QrCodeGenContent() {
  return (
    <div className="plasmo-w-[600px] plasmo-bg-stone-50 plasmo-flex plasmo-flex-col plasmo-h-[500px] plasmo-font-sans plasmo-text-stone-800 plasmo-overflow-hidden">
      <InputSection />

      <div className="plasmo-flex-1 plasmo-flex plasmo-overflow-hidden">
        <HistoryList />
        <QrDisplay />
      </div>
    </div>
  )
}

export default function QrCodeGen() {
  return (
    <QrCodeProvider>
      <QrCodeGenContent />
    </QrCodeProvider>
  )
}
