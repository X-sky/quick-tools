import type { MarkdownExportSource } from "@quick-tools/web-export"
import type { ExportFile } from "@quick-tools/web-export-dom"
import { extractFromHtml } from "@quick-tools/web-export-dom"

const FETCH_TIMEOUT_MS = 30_000

const RESTRICTED_PAGE_MESSAGE =
  "当前页面属于浏览器受限页面，扩展无法读取内容。请在普通 http/https 网页中使用导出功能。"

function snapshotPage() {
  return {
    html: document.documentElement.outerHTML,
    url: location.href,
    title: document.title
  }
}

/** Extract the article from a live tab, including JS-rendered content. */
export async function extractFromTab(tabId: number): Promise<MarkdownExportSource> {
  let snapshot: ReturnType<typeof snapshotPage> | undefined
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: snapshotPage
    })
    snapshot = result?.result as ReturnType<typeof snapshotPage> | undefined
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "")
    if (
      message.includes("Cannot access") ||
      message.includes("chrome://") ||
      message.includes("The extensions gallery cannot be scripted")
    ) {
      throw new Error(RESTRICTED_PAGE_MESSAGE)
    }
    throw new Error(message || "当前页面正文提取失败。请在普通网页中重试。")
  }
  if (!snapshot?.html) {
    throw new Error("当前页面没有可导出的正文内容。")
  }
  return extractFromHtml(snapshot.html, snapshot.url, {
    fallbackTitle: snapshot.title
  })
}

/** Fetch a URL (host permissions make this CORS-free) and extract it. */
export async function extractFromUrl(url: string): Promise<MarkdownExportSource> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(url, {
      credentials: "include",
      signal: controller.signal
    })
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("请求超时，请检查网络连接后重试")
    }
    throw new Error(
      `网络错误: ${error instanceof Error ? error.message : String(error)}`
    )
  } finally {
    clearTimeout(timer)
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`)
  }
  return extractFromHtml(await response.text(), response.url || url)
}

export type SaveOutcome =
  | { status: "saved" }
  | { status: "cancelled" }
  | { status: "error"; message: string }

/**
 * Hand files to chrome.downloads. `saveAs` shows the Save As dialog for a
 * single file; multiple files always go to the downloads folder.
 */
export async function saveFiles(
  files: ExportFile[],
  options: { saveAs: boolean }
): Promise<SaveOutcome> {
  const saveAs = options.saveAs && files.length === 1
  try {
    for (const file of files) {
      const url = URL.createObjectURL(
        new Blob([file.bytes], { type: file.mimeType })
      )
      try {
        await chrome.downloads.download({ url, filename: file.filename, saveAs })
      } finally {
        // chrome.downloads reads the blob asynchronously after start.
        setTimeout(() => URL.revokeObjectURL(url), 30_000)
      }
    }
    return { status: "saved" }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.toLowerCase().includes("cancel")) return { status: "cancelled" }
    return { status: "error", message }
  }
}
