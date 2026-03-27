import { EXPORT_STATUS_KEY, MENU_IDS } from "~features/web-export/constants"
import { extractArticleInPage } from "~features/web-export/extract-page"
import type {
  BackgroundMessage,
  ExportFormat,
  ExportTask,
  ExtractedArticle
} from "~features/web-export/types"
import {
  buildDownloadFilename,
  buildFilenameBase,
  buildMarkdownDocument,
  createStatus,
  getTaskStorageKey,
  toDataUrl
} from "~features/web-export/utils"

const MENU_TITLE: Record<ExportFormat, string> = {
  markdown: "导出正文为 Markdown",
  pdf: "导出正文为 PDF",
  png: "导出正文为 PNG"
}

async function setExportStatus(
  state: "running" | "success" | "error",
  message: string,
  format?: ExportFormat,
  title?: string
) {
  await chrome.storage.local.set({
    [EXPORT_STATUS_KEY]: createStatus(state, message, format, title)
  })
}

async function setupContextMenus() {
  await chrome.contextMenus.removeAll()

  chrome.contextMenus.create({
    id: MENU_IDS.parent,
    title: "导出网页正文",
    contexts: ["page"]
  })
  ;(["markdown", "pdf", "png"] as ExportFormat[]).forEach((format) => {
    chrome.contextMenus.create({
      id: MENU_IDS[format],
      parentId: MENU_IDS.parent,
      title: MENU_TITLE[format],
      contexts: ["page"]
    })
  })
}

void setupContextMenus().catch((error) => {
  console.error("Failed to initialize context menus", error)
})

async function extractArticle(tabId: number) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractArticleInPage
    })

    const article = results[0]?.result

    if (!article) {
      throw new Error("当前页面没有可导出的正文内容。")
    }

    return article as ExtractedArticle
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "")

    if (
      message.includes("Cannot access") ||
      message.includes("chrome://") ||
      message.includes("The extensions gallery cannot be scripted")
    ) {
      throw new Error(
        "当前页面属于浏览器受限页面，扩展无法读取内容。请在普通 http/https 网页中使用导出功能。"
      )
    }

    throw new Error(message || "当前页面正文提取失败。请在普通网页中重试。")
  }
}

async function downloadDataUrl(
  dataUrl: string,
  filename: string,
  saveAs = false
) {
  await chrome.downloads.download({
    url: dataUrl,
    filename,
    saveAs
  })
}

async function queueRenderTask(task: ExportTask) {
  const taskId = crypto.randomUUID()
  const storageKey = getTaskStorageKey(taskId)

  await chrome.storage.local.set({
    [storageKey]: task
  })

  await chrome.tabs.create({
    url: chrome.runtime.getURL(`tabs/export-renderer.html?taskId=${taskId}`),
    active: false
  })
}

async function exportCurrentPage(format: ExportFormat, tab?: chrome.tabs.Tab) {
  if (!tab?.id) {
    throw new Error("未找到可导出的活动标签页。")
  }

  await setExportStatus("running", "正在提取网页正文…", format)
  const article = await extractArticle(tab.id)
  const filenameBase = buildFilenameBase(article)

  if (format === "markdown") {
    const markdown = buildMarkdownDocument(article)
    await downloadDataUrl(
      toDataUrl(markdown, "text/markdown"),
      buildDownloadFilename(filenameBase, format)
    )
    await setExportStatus(
      "success",
      "Markdown 已开始下载。",
      format,
      article.title
    )
    return
  }

  await queueRenderTask({
    article,
    filenameBase,
    format
  })
  await setExportStatus(
    "running",
    `${format.toUpperCase()} 正在生成并准备下载…`,
    format,
    article.title
  )
}

async function clearRenderTask(taskId: string) {
  await chrome.storage.local.remove(getTaskStorageKey(taskId))
}

chrome.runtime.onInstalled.addListener(() => {
  void setupContextMenus()
})

chrome.runtime.onStartup?.addListener(() => {
  void setupContextMenus()
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const format =
    info.menuItemId === MENU_IDS.markdown
      ? "markdown"
      : info.menuItemId === MENU_IDS.pdf
        ? "pdf"
        : info.menuItemId === MENU_IDS.png
          ? "png"
          : null

  if (!format) {
    return
  }

  void exportCurrentPage(format, tab).catch(async (error) => {
    console.error("Web export failed", error)
    await setExportStatus(
      "error",
      error instanceof Error ? error.message : "网页正文导出失败。",
      format
    )
  })
})

chrome.runtime.onMessage.addListener(
  (message: BackgroundMessage, sender, sendResponse) => {
    void (async () => {
      if (message.type === "get-render-task") {
        const storageKey = getTaskStorageKey(message.taskId)
        const result = await chrome.storage.local.get(storageKey)
        sendResponse({ ok: true, task: result[storageKey] ?? null })
        return
      }

      if (message.type === "render-export-complete") {
        await clearRenderTask(message.taskId)

        await setExportStatus(
          "success",
          `${message.format.toUpperCase()} 已开始下载。`,
          message.format,
          message.title
        )

        sendResponse({ ok: true })
        return
      }

      if (message.type === "render-export-error") {
        await clearRenderTask(message.taskId)

        await setExportStatus("error", message.error)
        sendResponse({ ok: true })
      }
    })().catch((error) => {
      console.error("Background message handler failed", error)
      sendResponse({
        ok: false,
        error:
          error instanceof Error ? error.message : "扩展后台处理导出任务失败。"
      })
    })

    return true
  }
)
