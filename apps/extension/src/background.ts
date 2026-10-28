import type { ExportFormat } from "@quick-tools/web-export"

import { MENU_IDS } from "~features/web-export/constants"

const MENU_TITLE: Record<ExportFormat, string> = {
  markdown: "导出正文为 Markdown",
  pdf: "导出正文为 PDF",
  png: "导出正文为 PNG"
}

function createMenu(props: chrome.contextMenus.CreateProperties) {
  return new Promise<void>((resolve, reject) => {
    chrome.contextMenus.create(props, () => {
      const error = chrome.runtime.lastError
      if (error) reject(new Error(error.message))
      else resolve()
    })
  })
}

async function buildContextMenus() {
  await chrome.contextMenus.removeAll()
  await createMenu({
    id: MENU_IDS.parent,
    title: "导出网页正文",
    contexts: ["page"]
  })
  for (const format of ["markdown", "pdf", "png"] as ExportFormat[]) {
    await createMenu({
      id: MENU_IDS[format],
      parentId: MENU_IDS.parent,
      title: MENU_TITLE[format],
      contexts: ["page"]
    })
  }
}

// Rebuilds must not interleave: a second removeAll() landing between another
// run's create() calls drops or duplicates items.
let menuSetup: Promise<void> = Promise.resolve()

function setupContextMenus() {
  menuSetup = menuSetup
    .then(buildContextMenus)
    .catch((error) => {
      console.error("Failed to initialize context menus", error)
    })
  return menuSetup
}

// Menus persist across service-worker restarts, so they are only (re)built
// on install/update and browser startup.
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

  if (!format || !tab?.id) {
    return
  }

  // The export page needs a DOM (Readability, rendering), which the service
  // worker lacks. It extracts the source tab, downloads the file and closes
  // itself; on error or when it needs a decision it comes to the front.
  const params = new URLSearchParams({
    tabId: String(tab.id),
    format,
    auto: "1"
  })
  void chrome.tabs.create({
    url: chrome.runtime.getURL(`tabs/web-export.html?${params.toString()}`),
    active: false,
    index: tab.index + 1
  })
})
