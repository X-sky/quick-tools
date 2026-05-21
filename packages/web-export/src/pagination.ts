import type { PngPreflight, RenderPage } from "./types"

/**
 * Layout constants for pagination.
 */
export const PAGE_WIDTH = 1120
export const PAGE_HEIGHT = 1584
export const PAGE_PADDING_X = 72
export const PAGE_PADDING_Y = 72
export const PAGE_GAP = 20
export const PAGE_FOOTER_HEIGHT = 48
export const CONTENT_WIDTH = PAGE_WIDTH - PAGE_PADDING_X * 2
export const PAGE_CONTENT_HEIGHT =
  PAGE_HEIGHT - PAGE_PADDING_Y * 2 - PAGE_FOOTER_HEIGHT
export const SINGLE_PNG_MAX_DIMENSION = 16000
export const SINGLE_PNG_MAX_BYTES = 200 * 1024 * 1024
export const PAGE_BACKGROUND = "#f5f1ea"

/**
 * The height consumed by page chrome (footer).
 */
export const pageChromeHeight = PAGE_FOOTER_HEIGHT

/**
 * Interface for platform-specific DOM measurement.
 * The app layer provides an implementation that measures rendered
 * HTML block heights using actual DOM layout (e.g., getBoundingClientRect).
 */
export interface BlockMeasurer {
  /**
   * Measures the rendered height of a list of HTML blocks
   * when placed inside a page content container.
   */
  measureBlocksHeight(blocksHtml: string[]): number
}

/**
 * Interface for platform-specific block splitting.
 * The app layer provides an implementation that splits oversized
 * blocks (tables, code blocks, lists) using DOM measurement.
 */
export interface BlockSplitter {
  /**
   * Splits an oversized block into smaller chunks that each fit
   * within PAGE_CONTENT_HEIGHT.
   */
  splitOversizedBlock(blockHtml: string, blockTag: string): string[]

  /**
   * Splits a table element for PDF rendering.
   */
  splitTableForPdf(tableHtml: string): string[]
}

/**
 * Represents a block of content with its measured height and metadata.
 */
export interface MeasuredBlock {
  html: string
  height: number
  tag: string
}

/**
 * Computes PNG preflight information from paginated pages.
 */
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

/**
 * Platform-agnostic pagination algorithm.
 * Given a list of measured blocks, groups them into pages
 * respecting PAGE_CONTENT_HEIGHT constraints.
 *
 * Table blocks are isolated on their own pages.
 * Oversized blocks should be pre-split before calling this function.
 */
export function paginateBlocks(blocks: MeasuredBlock[]): RenderPage[] {
  const pages: RenderPage[] = []
  let current: MeasuredBlock[] = []
  let currentHeight = 0

  const pushPage = (nodes: MeasuredBlock[]) => {
    if (nodes.length === 0) {
      return
    }

    const pageKind = nodes.some((node) => node.tag === "table")
      ? "table"
      : "default"

    pages.push({
      html: nodes.map((node) => node.html).join(""),
      height: PAGE_HEIGHT,
      pageKind
    })
  }

  for (const block of blocks) {
    const isTableBlock = block.tag === "table"

    if (isTableBlock && current.length > 0) {
      pushPage(current)
      current = []
      currentHeight = 0
    }

    const candidateHeight = currentHeight + block.height

    if (candidateHeight <= PAGE_CONTENT_HEIGHT || current.length === 0) {
      current.push(block)
      currentHeight = candidateHeight

      if (isTableBlock) {
        pushPage(current)
        current = []
        currentHeight = 0
      }

      continue
    }

    pushPage(current)
    current = [block]
    currentHeight = block.height

    if (isTableBlock) {
      pushPage(current)
      current = []
      currentHeight = 0
    }
  }

  if (current.length > 0) {
    pushPage(current)
  }

  return pages
}
