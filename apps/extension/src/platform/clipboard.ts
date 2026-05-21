import type { ClipboardAccess, PlatformResult } from "@quick-tools/platform"
import { createErrorResult, createSuccess } from "@quick-tools/platform"

export const chromeClipboardAccess: ClipboardAccess = {
  async writeText(text: string): Promise<PlatformResult<void>> {
    try {
      await navigator.clipboard.writeText(text)
      return createSuccess(undefined)
    } catch (err) {
      return createErrorResult(
        "permission",
        `Clipboard write failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  },

  async writeImage(
    data: Uint8Array,
    mimeType: string
  ): Promise<PlatformResult<void>> {
    try {
      const blob = new Blob([data], { type: mimeType })
      const item = new ClipboardItem({ [mimeType]: blob })
      await navigator.clipboard.write([item])
      return createSuccess(undefined)
    } catch (err) {
      return createErrorResult(
        "permission",
        `Clipboard image write failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}
