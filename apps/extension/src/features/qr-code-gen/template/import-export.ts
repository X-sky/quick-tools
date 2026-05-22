import type { ExportSchema, TemplateStore } from "@quick-tools/qr-code-gen"

export {
  validateExportSchema,
  mergeStores,
  importFromJson
} from "@quick-tools/qr-code-gen"

export function exportToFile(store: TemplateStore): void {
  const schema: ExportSchema = {
    version: 1,
    templates: store.templates,
    placeholderValues: store.placeholderValues,
    combinationTags: store.combinationTags
  }
  const json = JSON.stringify(schema, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const date = new Date().toISOString().slice(0, 10)
  const a = document.createElement("a")
  a.href = url
  a.download = `qrcode-templates-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}
