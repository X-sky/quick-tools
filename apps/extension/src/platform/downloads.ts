import type { FileDownloader, PlatformResult } from "@quick-tools/platform"
import { createErrorResult, createSuccess } from "@quick-tools/platform"

function toDataUrl(data: Uint8Array | string, mimeType: string): string {
  if (typeof data === "string") {
    const encoded = btoa(unescape(encodeURIComponent(data)))
    return `data:${mimeType};base64,${encoded}`
  }
  const binary = Array.from(data)
    .map((byte) => String.fromCharCode(byte))
    .join("")
  return `data:${mimeType};base64,${btoa(binary)}`
}

export const chromeFileDownloader: FileDownloader = {
  async download(
    data: Uint8Array | string,
    filename: string,
    mimeType: string
  ): Promise<PlatformResult<void>> {
    try {
      const url = toDataUrl(data, mimeType)
      await chrome.downloads.download({
        url,
        filename,
        saveAs: false
      })
      return createSuccess(undefined)
    } catch (err) {
      return createErrorResult(
        "unknown",
        `Download failed for "${filename}": ${err instanceof Error ? err.message : String(err)}`
      )
    }
  },

  async downloadWithDialog(
    data: Uint8Array | string,
    suggestedName: string,
    mimeType: string
  ): Promise<PlatformResult<void>> {
    try {
      const url = toDataUrl(data, mimeType)
      await chrome.downloads.download({
        url,
        filename: suggestedName,
        saveAs: true
      })
      return createSuccess(undefined)
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.toLowerCase().includes("cancel")
      ) {
        return createErrorResult("cancelled", "Download was cancelled by user")
      }
      return createErrorResult(
        "unknown",
        `Download with dialog failed for "${suggestedName}": ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}
