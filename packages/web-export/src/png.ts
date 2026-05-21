import type { PngPreflight, RenderPage } from "./types"
import {
  PAGE_WIDTH,
  SINGLE_PNG_MAX_DIMENSION,
  SINGLE_PNG_MAX_BYTES
} from "./pagination"

/**
 * Interface for platform-specific PNG page rendering.
 * The app layer provides an implementation that captures DOM nodes
 * as PNG image bytes (e.g., using html-to-image).
 */
export interface PngPageRenderer {
  renderPagePng(
    page: RenderPage,
    index: number,
    total: number
  ): Promise<Uint8Array>
}

/**
 * Interface for platform-specific PNG merging.
 * The app layer provides an implementation that decodes and merges
 * multiple PNG images vertically (e.g., using fast-png).
 */
export interface PngMerger {
  canMerge(pagePngs: Uint8Array[]): boolean
  merge(pagePngs: Uint8Array[]): Uint8Array
}

/**
 * Computes PNG preflight information to determine whether
 * the merged image would exceed size limits.
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
 * Builds the filename for a single page in a multi-page PNG export.
 */
export function buildPageFilename(
  base: string,
  index: number,
  total: number
): string {
  return total > 1
    ? `${base}-p${String(index + 1).padStart(2, "0")}.png`
    : `${base}.png`
}

/**
 * Orchestrates PNG export from rendered pages.
 * Uses the provided renderer and merger abstractions to avoid
 * direct dependency on DOM or image processing libraries.
 */
export async function renderPngPages(
  pages: RenderPage[],
  renderer: PngPageRenderer
): Promise<Uint8Array[]> {
  const results: Uint8Array[] = []

  for (let i = 0; i < pages.length; i++) {
    const bytes = await renderer.renderPagePng(pages[i]!, i, pages.length)
    results.push(bytes)
  }

  return results
}
