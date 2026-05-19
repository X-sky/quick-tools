import { TemplateCardList } from "./components/TemplateCardList"
import { TemplateInputSection } from "./components/TemplateInputSection"
import { TemplateQrDisplay } from "./components/TemplateQrDisplay"

export const TemplateMode = () => {
  return (
    <>
      <TemplateInputSection />
      <div className="plasmo-flex-1 plasmo-flex plasmo-overflow-hidden">
        <TemplateCardList />
        <TemplateQrDisplay />
      </div>
    </>
  )
}
