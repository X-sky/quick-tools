import {
  CONTENT_WIDTH,
  PAGE_GAP,
  PAGE_HEIGHT,
  PAGE_PADDING_Y,
  PAGE_WIDTH,
  SINGLE_PNG_MAX_BYTES,
  SINGLE_PNG_MAX_DIMENSION
} from "./render-constants"
import type { PngPreflight, RenderBlock, RenderPage } from "./types"

export function measureBlocks(blocks: string[], measurementRoot: HTMLDivElement) {
  return blocks.map((blockHtml) => {
    const block = document.createElement("div")
    block.style.width = `${CONTENT_WIDTH}px`
    block.style.boxSizing = "border-box"
    block.innerHTML = blockHtml
    measurementRoot.appendChild(block)
    const height = Math.ceil(block.getBoundingClientRect().height)
    measurementRoot.removeChild(block)

    return {
      html: blockHtml,
      height
    }
  })
}

export function paginateBlocks(blocks: RenderBlock[]) {
  const usableHeight = PAGE_HEIGHT - PAGE_PADDING_Y * 2 - 52
  const pages: RenderPage[] = []
  let current: RenderBlock[] = []
  let currentHeight = 0

  const pushCurrent = () => {
    if (current.length === 0) {
      return
    }

    pages.push({
      html: current.map((block) => block.html).join(""),
      height: Math.max(PAGE_HEIGHT, currentHeight + PAGE_PADDING_Y * 2 + 52)
    })
    current = []
    currentHeight = 0
  }

  for (const block of blocks) {
    const nextHeight =
      current.length === 0
        ? block.height
        : currentHeight + PAGE_GAP + block.height

    if (current.length > 0 && nextHeight > usableHeight) {
      pushCurrent()
    }

    current.push(block)
    currentHeight =
      current.length === 1 ? block.height : currentHeight + PAGE_GAP + block.height

    if (block.height > usableHeight) {
      pushCurrent()
    }
  }

  pushCurrent()

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
