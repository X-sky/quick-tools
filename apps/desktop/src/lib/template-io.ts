import type { PlatformResult } from "@quick-tools/platform"
import { createErrorResult, createSuccess } from "@quick-tools/platform"
import type { ImportResult, TemplateStore } from "@quick-tools/qr-code-gen"
import { buildExportSchema, importFromJson } from "@quick-tools/qr-code-gen"
import { save, open } from "@tauri-apps/plugin-dialog"
import { readTextFile, writeTextFile, stat } from "@tauri-apps/plugin-fs"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

function buildExportFilename(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  return `qrcode-templates-${yyyy}-${mm}-${dd}.json`
}

export async function exportTemplateFile(
  store: TemplateStore
): Promise<PlatformResult<void>> {
  try {
    const filePath = await save({
      defaultPath: buildExportFilename(),
      filters: [{ name: "JSON", extensions: ["json"] }]
    })

    if (!filePath) {
      return createSuccess(undefined)
    }

    const schema = buildExportSchema(store)
    const json = JSON.stringify(schema, null, 2)
    await writeTextFile(filePath, json)
    return createSuccess(undefined)
  } catch (err) {
    return createErrorResult(
      "unknown",
      `导出失败: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

export async function importTemplateFile(
  currentStore: TemplateStore
): Promise<ImportResult> {
  try {
    const filePath = await open({
      filters: [{ name: "JSON", extensions: ["json"] }],
      multiple: false
    })

    if (!filePath) {
      return {
        success: true,
        added: { templates: 0, values: 0, tags: 0 }
      }
    }

    const fileInfo = await stat(filePath as string)
    if (fileInfo.size > MAX_FILE_SIZE) {
      return {
        success: false,
        added: { templates: 0, values: 0, tags: 0 },
        error: "文件大小超过 10 MB 限制"
      }
    }

    const content = await readTextFile(filePath as string)
    return importFromJson(content, currentStore)
  } catch (err) {
    return {
      success: false,
      added: { templates: 0, values: 0, tags: 0 },
      error: `导入失败: ${err instanceof Error ? err.message : String(err)}`
    }
  }
}
