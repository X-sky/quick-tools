import {
  CONTENT_WIDTH,
  PAGE_CONTENT_HEIGHT,
  PAGE_FOOTER_HEIGHT,
  PAGE_HEIGHT,
  SINGLE_PNG_MAX_BYTES,
  SINGLE_PNG_MAX_DIMENSION,
  PAGE_WIDTH
} from "./render-constants"
import type { PngPreflight, RenderPage } from "./types"

function createMeasureArticle(measurementRoot: HTMLDivElement) {
  measurementRoot.innerHTML = `
    <div class="web-export-page web-export-page--measure">
      <div class="web-export-page__content">
        <article class="web-export-markdown web-export-markdown--page"></article>
      </div>
      <div class="web-export-page__footer">0 / 0</div>
    </div>
  `

  return measurementRoot.querySelector(
    ".web-export-markdown"
  ) as HTMLElement | null
}

function measureNodesHeight(
  nodes: HTMLElement[],
  measurementRoot: HTMLDivElement
) {
  const article = createMeasureArticle(measurementRoot)

  if (!article) {
    return 0
  }

  for (const node of nodes) {
    article.appendChild(node.cloneNode(true))
  }

  return Math.ceil(article.getBoundingClientRect().height)
}

function clonePreChunk(pre: HTMLElement, lines: string[]) {
  const clone = pre.cloneNode(true) as HTMLElement
  const code = clone.querySelector("code")
  const chunkText = lines.join("\n")

  if (code) {
    code.textContent = chunkText
  } else {
    clone.textContent = chunkText
  }

  return clone
}

function splitPreElement(pre: HTMLElement, measurementRoot: HTMLDivElement) {
  const code = pre.querySelector("code")
  const lines = (code?.textContent ?? pre.textContent ?? "").split("\n")

  if (lines.length <= 1) {
    return [pre.cloneNode(true) as HTMLElement]
  }

  const parts: HTMLElement[] = []
  let current: string[] = []

  for (const line of lines) {
    current.push(line)

    if (
      measureNodesHeight([clonePreChunk(pre, current)], measurementRoot) >
        PAGE_CONTENT_HEIGHT &&
      current.length > 1
    ) {
      const lastLine = current.pop()!
      parts.push(clonePreChunk(pre, current))
      current = [lastLine]
    }
  }

  if (current.length > 0) {
    parts.push(clonePreChunk(pre, current))
  }

  return parts.length > 0 ? parts : [pre.cloneNode(true) as HTMLElement]
}

function cloneListChunk(list: HTMLElement, items: HTMLElement[]) {
  const clone = list.cloneNode(false) as HTMLElement

  items.forEach((item) => {
    clone.appendChild(item.cloneNode(true))
  })

  clone.setAttribute("data-export-block", "list")
  return clone
}

function splitListElement(list: HTMLElement, measurementRoot: HTMLDivElement) {
  const items = Array.from(list.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement
  )

  if (items.length <= 1) {
    return [list.cloneNode(true) as HTMLElement]
  }

  const parts: HTMLElement[] = []
  let current: HTMLElement[] = []

  for (const item of items) {
    current.push(item)

    if (
      measureNodesHeight([cloneListChunk(list, current)], measurementRoot) >
        PAGE_CONTENT_HEIGHT &&
      current.length > 1
    ) {
      const lastItem = current.pop()!
      parts.push(cloneListChunk(list, current))
      current = [lastItem]
    }
  }

  if (current.length > 0) {
    parts.push(cloneListChunk(list, current))
  }

  return parts.length > 0 ? parts : [list.cloneNode(true) as HTMLElement]
}

function cloneTableChunk(
  table: HTMLTableElement,
  header: HTMLElement | null,
  rows: HTMLElement[]
) {
  const clone = table.cloneNode(false) as HTMLTableElement

  if (header) {
    clone.appendChild(header.cloneNode(true))
  }

  const body = document.createElement("tbody")
  rows.forEach((row) => body.appendChild(row.cloneNode(true)))
  clone.appendChild(body)
  clone.setAttribute("data-export-block", "table")

  const columnCount = Math.max(
    header?.querySelectorAll("th,td").length ?? 0,
    ...rows.map((row) => row.querySelectorAll("th,td").length)
  )

  if (columnCount >= 6) {
    clone.classList.add("web-export-markdown__table--compact")
  }

  if (table.scrollWidth > CONTENT_WIDTH) {
    clone.classList.add("web-export-markdown__table--scaled")
  }

  return clone
}

export function splitTableForPdf(
  table: HTMLTableElement,
  measurementRoot: HTMLDivElement
) {
  const header = table.querySelector("thead")
  const bodyRows = Array.from(table.querySelectorAll("tbody tr"))

  if (bodyRows.length <= 1) {
    return [table.cloneNode(true) as HTMLElement]
  }

  const parts: HTMLElement[] = []
  let currentRows: HTMLElement[] = []

  for (const row of bodyRows) {
    currentRows.push(row)

    if (
      measureNodesHeight(
        [cloneTableChunk(table, header, currentRows)],
        measurementRoot
      ) > PAGE_CONTENT_HEIGHT &&
      currentRows.length > 1
    ) {
      const lastRow = currentRows.pop()!
      parts.push(cloneTableChunk(table, header, currentRows))
      currentRows = [lastRow]
    }
  }

  if (currentRows.length > 0) {
    parts.push(cloneTableChunk(table, header, currentRows))
  }

  return parts.length > 0 ? parts : [table.cloneNode(true) as HTMLElement]
}

function splitOversizedBlock(
  block: HTMLElement,
  measurementRoot: HTMLDivElement
) {
  const tag = block.tagName.toLowerCase()

  if (tag === "pre") {
    return splitPreElement(block, measurementRoot)
  }

  if (tag === "table") {
    return splitTableForPdf(block as HTMLTableElement, measurementRoot)
  }

  if (tag === "ul" || tag === "ol") {
    return splitListElement(block, measurementRoot)
  }

  return [block.cloneNode(true) as HTMLElement]
}

function collectBlocks(articleRoot: HTMLElement) {
  const header = articleRoot.querySelector(
    ".web-export-markdown__header"
  ) as HTMLElement | null
  const body = articleRoot.querySelector(
    ".web-export-markdown__body"
  ) as HTMLElement | null

  return [
    ...(header ? [header] : []),
    ...Array.from(body?.children ?? []).filter(
      (child): child is HTMLElement => child instanceof HTMLElement
    )
  ]
}

export function paginateRenderedDocument(
  articleRoot: HTMLElement,
  measurementRoot: HTMLDivElement
) {
  const blocks = collectBlocks(articleRoot)
  const expandedBlocks: HTMLElement[] = []

  for (const block of blocks) {
    const height = measureNodesHeight([block], measurementRoot)

    if (height > PAGE_CONTENT_HEIGHT) {
      expandedBlocks.push(...splitOversizedBlock(block, measurementRoot))
      continue
    }

    expandedBlocks.push(block.cloneNode(true) as HTMLElement)
  }

  const pages: RenderPage[] = []
  let current: HTMLElement[] = []

  const pushPage = (nodes: HTMLElement[]) => {
    if (nodes.length === 0) {
      return
    }

    const pageKind = nodes.some(
      (node) => node.tagName.toLowerCase() === "table"
    )
      ? "table"
      : "default"

    pages.push({
      html: nodes.map((node) => node.outerHTML).join(""),
      height: PAGE_HEIGHT,
      pageKind
    })
  }

  for (const block of expandedBlocks) {
    const isTableBlock = block.tagName.toLowerCase() === "table"

    if (isTableBlock && current.length > 0) {
      pushPage(current)
      current = []
    }

    const candidate = [...current, block]
    const candidateHeight = measureNodesHeight(candidate, measurementRoot)

    if (candidateHeight <= PAGE_CONTENT_HEIGHT || current.length === 0) {
      current = candidate

      if (isTableBlock) {
        pushPage(current)
        current = []
      }

      continue
    }

    pushPage(current)
    current = [block]

    if (isTableBlock) {
      pushPage(current)
      current = []
    }
  }

  if (current.length > 0) {
    pushPage(current)
  }

  measurementRoot.innerHTML = ""

  return pages
}

export function getPngPreflight(pages: RenderPage[]): PngPreflight {
  const mergedWidth = PAGE_WIDTH
  const mergedHeight = pages.reduce((sum, page) => sum + page.height, 0)
  const mergedBytes = mergedWidth * mergedHeight * 4

  return {
    shouldPrompt:
      mergedWidth > SINGLE_PNG_MAX_DIMENSION ||
      mergedHeight > SINGLE_PNG_MAX_DIMENSION ||
      mergedBytes > SINGLE_PNG_MAX_BYTES,
    mergedWidth,
    mergedHeight,
    mergedBytes
  }
}

export const pageChromeHeight = PAGE_FOOTER_HEIGHT
