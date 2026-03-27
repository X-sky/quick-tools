import { EXPORT_TASK_KEY_PREFIX } from "./constants"
import type { ExportFormat, ExportStatus, MarkdownExportSource } from "./types"

export function sanitizeFileName(name: string) {
  return name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
}

export function formatTimestamp(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")

  return `${year}${month}${day}-${hours}${minutes}${seconds}`
}

export function buildFilenameBase(source: MarkdownExportSource) {
  const fallbackHost = (() => {
    try {
      return new URL(source.url).hostname
    } catch {
      return "web-export"
    }
  })()

  const title =
    sanitizeFileName(source.title) ||
    sanitizeFileName(fallbackHost) ||
    "web-export"

  return `${title}-${formatTimestamp(new Date(source.capturedAt))}`
}

export function buildMarkdownDocument(source: MarkdownExportSource) {
  const lines = [
    `# ${source.title || "Untitled page"}`,
    "",
    `- Source: ${source.url}`,
    `- Captured At: ${source.capturedAt}`
  ]

  if (source.byline) {
    lines.push(`- Byline: ${source.byline}`)
  }

  if (source.excerpt) {
    lines.push("", `> ${source.excerpt}`)
  }

  lines.push("", source.markdown.trim() || source.plainText.trim())

  return lines.join("\n").trim() + "\n"
}

export function buildDownloadFilename(
  filenameBase: string,
  format: ExportFormat
) {
  const extension = format === "markdown" ? "md" : format
  return `${filenameBase}.${extension}`
}

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
