import { buildDownloadFilename, buildFilenameBase, buildMarkdownDocument, sanitizeFileName, formatTimestamp } from "@quick-tools/web-export"
import type { ExportFormat } from "@quick-tools/web-export"

import { EXPORT_TASK_KEY_PREFIX } from "./constants"
import type { ExportStatus } from "./types"

export { buildDownloadFilename, buildFilenameBase, buildMarkdownDocument, sanitizeFileName, formatTimestamp }

export function toDataUrl(content: string, mimeType: string) {
  const encoded = btoa(unescape(encodeURIComponent(content)))
  return `data:${mimeType};base64,${encoded}`
}

export function createStatus(
  state: ExportStatus["state"],
  message: string,
  format?: ExportFormat,
  title?: string
): ExportStatus {
  return {
    state,
    message,
    format,
    title,
    updatedAt: new Date().toISOString()
  }
}

export function getTaskStorageKey(taskId: string) {
  return `${EXPORT_TASK_KEY_PREFIX}${taskId}`
}
