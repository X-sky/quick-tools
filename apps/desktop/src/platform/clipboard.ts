import type { ClipboardAccess, PlatformResult } from "@quick-tools/platform"
import { createErrorResult, createSuccess } from "@quick-tools/platform"
import { writeText, writeImage } from "@tauri-apps/plugin-clipboard-manager"
import { Image } from "@tauri-apps/api/image"

export const tauriClipboardAccess: ClipboardAccess = {
  async writeText(text: string): Promise<PlatformResult<void>> {
    try {
      await writeText(text)
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
      const image = await Image.fromBytes(data)
      await writeImage(image)
      return createSuccess(undefined)
    } catch (err) {
      return createErrorResult(
        "permission",
        `Clipboard image write failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}
