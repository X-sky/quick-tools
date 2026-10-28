import { getPlatform } from "@quick-tools/platform"
import type { ExportFile, ImageFetcher } from "@quick-tools/web-export-dom"
import { defaultImageFetcher } from "@quick-tools/web-export-dom"

import { isTauriRuntime } from "~/platform"

/**
 * Images are fetched through tauri-plugin-http inside the desktop shell, so
 * cross-origin images can be inlined; the browser fallback uses plain fetch.
 */
export function getImageFetcher(): ImageFetcher {
  if (!isTauriRuntime()) return defaultImageFetcher
  return async (url) => {
    const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http")
    const response = await tauriFetch(url, { method: "GET" })
    if (!response.ok) {
      throw new Error(`Image request failed with ${response.status}`)
    }
    const type = response.headers.get("content-type")?.split(";")[0] ?? ""
    return new Blob([await response.arrayBuffer()], { type })
  }
}

export type SaveOutcome =
  | { status: "saved" }
  | { status: "cancelled" }
  | { status: "error"; message: string }

/**
 * Save export files. One file goes through the save dialog; several files
 * (paged PNG) go into a folder the user picks, or the browser's downloads.
 */
export async function saveExportFiles(files: ExportFile[]): Promise<SaveOutcome> {
  const platform = getPlatform()
  const [single] = files
  if (files.length === 1 && single) {
    const result = await platform.fileDownloader.downloadWithDialog(
      single.bytes,
      single.filename,
      single.mimeType
    )
    if (result.ok) return { status: "saved" }
    return result.error.category === "cancelled"
      ? { status: "cancelled" }
      : { status: "error", message: result.error.message }
  }

  if (isTauriRuntime()) {
    const { open } = await import("@tauri-apps/plugin-dialog")
    const folder = await open({ directory: true, title: "选择导出目录" })
    if (!folder || Array.isArray(folder)) return { status: "cancelled" }
    return await writeFilesToFolder(folder, files)
  }

  for (const file of files) {
    const result = await platform.fileDownloader.download(
      file.bytes,
      file.filename,
      file.mimeType
    )
    if (!result.ok) return { status: "error", message: result.error.message }
  }
  return { status: "saved" }
}

/** Write files straight into a folder (Tauri only). */
export async function writeFilesToFolder(
  folder: string,
  files: ExportFile[]
): Promise<SaveOutcome> {
  try {
    const { writeFile } = await import("@tauri-apps/plugin-fs")
    for (const file of files) {
      await writeFile(`${folder}/${file.filename}`, file.bytes)
    }
    return { status: "saved" }
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : String(err)
    }
  }
}
