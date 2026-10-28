import type { TemplateStore } from "@quick-tools/qr-code-gen"
import {
  buildExportSchema,
  templateExportFilename
} from "@quick-tools/qr-code-gen"

export {
  validateExportSchema,
  mergeStores,
  importFromJson
} from "@quick-tools/qr-code-gen"

export const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024

export function exportToFile(store: TemplateStore): void {
  const json = JSON.stringify(buildExportSchema(store), null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = templateExportFilename()
  a.click()
  URL.revokeObjectURL(url)
}
