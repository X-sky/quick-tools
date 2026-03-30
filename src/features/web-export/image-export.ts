import { toBlob, toJpeg, toPng } from "html-to-image"
import { decode, encode } from "fast-png"

import {
  PAGE_BACKGROUND,
  PAGE_HEIGHT,
  PAGE_PADDING_X,
  PAGE_PADDING_Y,
  PAGE_WIDTH,
  SINGLE_PNG_MAX_BYTES,
  SINGLE_PNG_MAX_DIMENSION
} from "./render-constants"
import type {
  PdfCaptureProfile,
  PdfPageCapture,
  RenderPage
} from "./types"

function buildPageMarkup(page: RenderPage, index: number, total: number) {
  return `
    <div class="web-export-page" style="width:${PAGE_WIDTH}px;height:${PAGE_HEIGHT}px;padding:${PAGE_PADDING_Y}px ${PAGE_PADDING_X}px;background:${PAGE_BACKGROUND};">
      <div class="web-export-page__content">
        <article class="web-export-markdown web-export-markdown--page">
          ${page.html}
        </article>
      </div>
      <div class="web-export-page__footer">${index + 1} / ${total}</div>
    </div>
  `.trim()
}

async function dataUrlToBytes(dataUrl: string) {
  const response = await fetch(dataUrl)
  return new Uint8Array(await response.arrayBuffer())
}

async function blobToBytes(blob: Blob) {
  return new Uint8Array(await blob.arrayBuffer())
}

function mountPageNode(
  page: RenderPage,
  index: number,
  total: number,
  captureRoot: HTMLDivElement
) {
  captureRoot.innerHTML = buildPageMarkup(page, index, total)
  const pageNode = captureRoot.firstElementChild as HTMLElement | null

  if (!pageNode) {
    throw new Error("Failed to mount page for image export.")
  }

  return pageNode
}

export async function renderPagePngBytes(
  page: RenderPage,
  index: number,
  total: number,
  captureRoot: HTMLDivElement
) {
  const pageNode = mountPageNode(page, index, total, captureRoot)

  const dataUrl = await toPng(pageNode, {
    cacheBust: true,
    backgroundColor: PAGE_BACKGROUND,
    pixelRatio: 2,
    canvasWidth: PAGE_WIDTH * 2,
    canvasHeight: PAGE_HEIGHT * 2,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT
  })

  captureRoot.innerHTML = ""
  return await dataUrlToBytes(dataUrl)
}

export function getPdfCaptureProfile(page: RenderPage): PdfCaptureProfile {
  if (page.pageKind === "table") {
    return {
      pixelRatio: 1.9,
      format: "png"
    }
  }

  return {
    pixelRatio: 1.35,
    quality: 0.82,
    format: "jpeg"
  }
}

export async function capturePageForPdf(
  page: RenderPage,
  index: number,
  total: number,
  captureRoot: HTMLDivElement,
  profile: PdfCaptureProfile
): Promise<PdfPageCapture> {
  const pageNode = mountPageNode(page, index, total, captureRoot)

  if (profile.format === "jpeg") {
    const dataUrl = await toJpeg(pageNode, {
      cacheBust: true,
      backgroundColor: PAGE_BACKGROUND,
      pixelRatio: profile.pixelRatio,
      canvasWidth: PAGE_WIDTH * profile.pixelRatio,
      canvasHeight: PAGE_HEIGHT * profile.pixelRatio,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      quality: profile.quality
    })

    captureRoot.innerHTML = ""

    return {
      bytes: await dataUrlToBytes(dataUrl),
      format: profile.format,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT
    }
  }

  const blob = await toBlob(pageNode, {
    cacheBust: true,
    backgroundColor: PAGE_BACKGROUND,
    pixelRatio: profile.pixelRatio,
    canvasWidth: PAGE_WIDTH * profile.pixelRatio,
    canvasHeight: PAGE_HEIGHT * profile.pixelRatio,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    quality: profile.quality,
    type: "image/png"
  })

  captureRoot.innerHTML = ""

  if (!blob) {
    throw new Error("Failed to capture PDF page image.")
  }

  return {
    bytes: await blobToBytes(blob),
    format: profile.format,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT
  }
}

export function canMergeIntoSinglePng(pagePngs: Uint8Array[]) {
  const decodedPages = pagePngs.map((bytes) => decode(bytes))
  const mergedWidth = decodedPages[0]?.width ?? 0
  const mergedHeight = decodedPages.reduce((sum, page) => sum + page.height, 0)
  const mergedBytes = mergedWidth * mergedHeight * 4

  return (
    mergedWidth <= SINGLE_PNG_MAX_DIMENSION &&
    mergedHeight <= SINGLE_PNG_MAX_DIMENSION &&
    mergedBytes <= SINGLE_PNG_MAX_BYTES
  )
}

export function mergePngPages(pagePngs: Uint8Array[]) {
  const decodedPages = pagePngs.map((bytes) => decode(bytes))
  const mergedWidth = decodedPages[0].width
  const mergedHeight = decodedPages.reduce((sum, page) => sum + page.height, 0)
  const data = new Uint8Array(mergedWidth * mergedHeight * 4)

  let offsetY = 0

  for (const page of decodedPages) {
    const rgba = page.data as Uint8Array

    for (let row = 0; row < page.height; row += 1) {
      const sourceStart = row * page.width * 4
      const sourceEnd = sourceStart + page.width * 4
      const targetStart = (offsetY + row) * mergedWidth * 4
      data.set(rgba.subarray(sourceStart, sourceEnd), targetStart)
    }

    offsetY += page.height
  }

  return encode({
    width: mergedWidth,
    height: mergedHeight,
    data,
    channels: 4,
    depth: 8
  })
}

export function bytesToObjectUrl(bytes: Uint8Array, mimeType: string) {
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }))
}

export async function downloadObjectUrl(url: string, filename: string) {
  await chrome.downloads.download({
    url,
    filename
  })

  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export function buildPageFilename(base: string, index: number, total: number) {
  return total > 1
    ? `${base}-p${String(index + 1).padStart(2, "0")}.png`
    : `${base}.png`
}
