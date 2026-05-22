import type { PlatformResult } from "@quick-tools/platform"
import { createErrorResult, createSuccess } from "@quick-tools/platform"
import { open } from "@tauri-apps/plugin-dialog"
import { readTextFile } from "@tauri-apps/plugin-fs"

export async function openJsonFile(): Promise<PlatformResult<string>> {
  try {
    const filePath = await open({
      filters: [{ name: "JSON", extensions: ["json"] }],
      multiple: false
    })

    if (!filePath) {
      return createErrorResult("cancelled", "用户取消了文件选择")
    }

    const content = await readTextFile(filePath as string)
    return createSuccess(content)
  } catch (err) {
    return createErrorResult(
      "unknown",
      `读取文件失败: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}
