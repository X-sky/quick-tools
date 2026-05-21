import type { ExportFormat, MarkdownExportSource } from "./types"

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
}

export function formatTimestamp(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")

  return `${year}${month}${day}-${hours}${minutes}${seconds}`
}

function extractHostname(url: string): string {
  try {
    const afterProtocol = url.replace(/^[a-z]+:\/\//i, "")
    const hostPart = afterProtocol.split("/")[0] ?? ""
    const hostname = hostPart.split(":")[0] ?? ""
    return hostname || "web-export"
  } catch {
    return "web-export"
  }
}

export function buildFilenameBase(source: MarkdownExportSource): string {
  const fallbackHost = extractHostname(source.url)

  const title =
    sanitizeFileName(source.title) ||
    sanitizeFileName(fallbackHost) ||
    "web-export"

  return `${title}-${formatTimestamp(new Date(source.capturedAt))}`
}

export function buildDownloadFilename(
  filenameBase: string,
  format: ExportFormat
): string {
  const extension = format === "markdown" ? "md" : format
  return `${filenameBase}.${extension}`
}
