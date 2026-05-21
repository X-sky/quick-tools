import type { FileDownloader, PlatformResult } from "@quick-tools/platform"
import { createErrorResult, createSuccess } from "@quick-tools/platform"
import { save } from "@tauri-apps/plugin-dialog"
import { writeFile, BaseDirectory } from "@tauri-apps/plugin-fs"

function toUint8Array(data: Uint8Array | string): Uint8Array {
  if (data instanceof Uint8Array) {
    return data
  }
  return new TextEncoder().encode(data)
}

export const tauriFileDownloader: FileDownloader = {
  async download(
    data: Uint8Array | string,
    filename: string,
    mimeType: string
  ): Promise<PlatformResult<void>> {
    try {
      const bytes = toUint8Array(data)
      await writeFile(filename, bytes, {
        baseDir: BaseDirectory.Download
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
      const filePath = await save({
        defaultPath: suggestedName
      })

      if (!filePath) {
        return createErrorResult("cancelled", "Download was cancelled by user")
      }

      const bytes = toUint8Array(data)
      await writeFile(filePath, bytes)
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
