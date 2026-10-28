import type {
  BinaryExportFormat,
  MarkdownExportSource,
  PdfPageCapture,
  PngPreflight,
  RenderPage
} from "@quick-tools/web-export"
import {
  buildDownloadFilename,
  buildFilenameBase,
  buildMarkdownDocument,
  buildPageFilename
} from "@quick-tools/web-export"

import {
  canMergeIntoSinglePng,
  capturePageForPdf,
  getPdfCaptureProfile,
  mergePngPages,
  renderPagePngBytes
} from "./capture"
import { CONTENT_WIDTH, PAGE_WIDTH } from "./constants"
import { getPngPreflight, paginateRenderedDocument } from "./paginate"
import { buildPdfBytes } from "./pdf"
import type { ImageFetcher } from "./render-document"
import { buildRenderedDocument, defaultImageFetcher } from "./render-document"
import { ensureThemeStyles } from "./theme"

export interface ExportFile {
  filename: string
  mimeType: string
  bytes: Uint8Array
}

/** What to do when a single PNG would be too large to export reliably. */
export type OversizedPngChoice = "paged" | "pdf" | "cancel"

export interface ExportOptions {
  fetchImage?: ImageFetcher
  onProgress?: (message: string) => void
  /**
   * Called only when the merged PNG would exceed the size limits. Defaults to
   * paged PNG output when not provided.
   */
  onOversizedPng?: (preflight: PngPreflight) => Promise<OversizedPngChoice>
}

export interface ExportResult {
  /** Format actually produced (a PNG request can turn into PDF). */
  format: "markdown" | BinaryExportFormat
  files: ExportFile[]
  imageFailures: number
  paged: boolean
}

export class ExportCancelledError extends Error {
  constructor() {
    super("导出已取消")
  }
}

const encoder = new TextEncoder()

function createHiddenRoot(width: number): HTMLDivElement {
  const root = document.createElement("div")
  root.setAttribute("aria-hidden", "true")
  Object.assign(root.style, {
    position: "fixed",
    left: "-100000px",
    top: "0",
    width: `${width}px`,
    pointerEvents: "none",
    opacity: "0"
  })
  document.body.appendChild(root)
  return root
}

interface PreparedDocument {
  pages: RenderPage[]
  imageFailures: number
  captureRoot: HTMLDivElement
  dispose: () => void
}

async function prepareDocument(
  source: MarkdownExportSource,
  fetchImage: ImageFetcher,
  progress: (message: string) => void
): Promise<PreparedDocument> {
  ensureThemeStyles()
  const documentRoot = createHiddenRoot(CONTENT_WIDTH)
  const measurementRoot = createHiddenRoot(CONTENT_WIDTH)
  const captureRoot = createHiddenRoot(PAGE_WIDTH)
  const dispose = () => {
    documentRoot.remove()
    measurementRoot.remove()
    captureRoot.remove()
  }
  try {
    progress("正在准备 Markdown 内容…")
    const rendered = await buildRenderedDocument(source, fetchImage)
    documentRoot.innerHTML = rendered.html
    const articleRoot = documentRoot.querySelector(
      ".web-export-markdown"
    ) as HTMLElement | null
    if (!articleRoot) throw new Error("Markdown 文档渲染失败。")

    progress("正在计算分页…")
    const pages = paginateRenderedDocument(articleRoot, measurementRoot)
    return { pages, imageFailures: rendered.imageFailures, captureRoot, dispose }
  } catch (error) {
    dispose()
    throw error
  }
}

async function renderPdf(
  prepared: PreparedDocument,
  filenameBase: string,
  progress: (message: string) => void
): Promise<ExportFile> {
  const { pages, captureRoot } = prepared
  const captures: PdfPageCapture[] = []
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index]!
    progress(`正在渲染第 ${index + 1} / ${pages.length} 页…`)
    captures.push(
      await capturePageForPdf(
        page,
        index,
        pages.length,
        captureRoot,
        getPdfCaptureProfile(page)
      )
    )
  }
  progress("正在生成 PDF…")
  return {
    filename: buildDownloadFilename(filenameBase, "pdf"),
    mimeType: "application/pdf",
    bytes: await buildPdfBytes(captures)
  }
}

async function renderPngPages(
  prepared: PreparedDocument,
  progress: (message: string) => void
): Promise<Uint8Array[]> {
  const { pages, captureRoot } = prepared
  const pngs: Uint8Array[] = []
  for (let index = 0; index < pages.length; index += 1) {
    progress(`正在渲染第 ${index + 1} / ${pages.length} 页…`)
    pngs.push(
      await renderPagePngBytes(pages[index]!, index, pages.length, captureRoot)
    )
  }
  return pngs
}

/**
 * Export an extracted article as Markdown, PDF or PNG. PNG output is one
 * tall image when it fits the size limits, otherwise one file per page (or
 * PDF, depending on `onOversizedPng`).
 */
export async function exportArticle(
  source: MarkdownExportSource,
  format: "markdown" | BinaryExportFormat,
  options: ExportOptions = {}
): Promise<ExportResult> {
  const progress = options.onProgress ?? (() => {})
  const filenameBase = buildFilenameBase(source)

  if (format === "markdown") {
    return {
      format,
      files: [
        {
          filename: buildDownloadFilename(filenameBase, "markdown"),
          mimeType: "text/markdown;charset=utf-8",
          bytes: encoder.encode(buildMarkdownDocument(source))
        }
      ],
      imageFailures: 0,
      paged: false
    }
  }

  const prepared = await prepareDocument(
    source,
    options.fetchImage ?? defaultImageFetcher,
    progress
  )
  try {
    if (format === "pdf") {
      return {
        format,
        files: [await renderPdf(prepared, filenameBase, progress)],
        imageFailures: prepared.imageFailures,
        paged: false
      }
    }

    const preflight = getPngPreflight(prepared.pages)
    let forcePaged = false
    if (preflight.shouldPrompt) {
      const choice = options.onOversizedPng
        ? await options.onOversizedPng(preflight)
        : "paged"
      if (choice === "cancel") throw new ExportCancelledError()
      if (choice === "pdf") {
        return {
          format: "pdf",
          files: [await renderPdf(prepared, filenameBase, progress)],
          imageFailures: prepared.imageFailures,
          paged: false
        }
      }
      forcePaged = true
    }

    const pngs = await renderPngPages(prepared, progress)
    progress("正在准备 PNG…")
    if (!forcePaged && canMergeIntoSinglePng(pngs)) {
      return {
        format,
        files: [
          {
            filename: buildDownloadFilename(filenameBase, "png"),
            mimeType: "image/png",
            bytes: mergePngPages(pngs)
          }
        ],
        imageFailures: prepared.imageFailures,
        paged: false
      }
    }
    return {
      format,
      files: pngs.map((bytes, index) => ({
        filename: buildPageFilename(filenameBase, index, pngs.length),
        mimeType: "image/png",
        bytes
      })),
      imageFailures: prepared.imageFailures,
      paged: pngs.length > 1
    }
  } finally {
    prepared.dispose()
  }
}

/**
 * Render the article as one PNG for the clipboard. Fails when the merged
 * image exceeds the single-PNG limits.
 */
export async function renderArticlePng(
  source: MarkdownExportSource,
  options: Pick<ExportOptions, "fetchImage" | "onProgress"> = {}
): Promise<{ bytes: Uint8Array; imageFailures: number }> {
  const progress = options.onProgress ?? (() => {})
  const prepared = await prepareDocument(
    source,
    options.fetchImage ?? defaultImageFetcher,
    progress
  )
  try {
    if (getPngPreflight(prepared.pages).shouldPrompt) {
      throw new Error("内容过长，无法作为单张图片复制，请改为导出 PNG 或 PDF。")
    }
    const pngs = await renderPngPages(prepared, progress)
    if (!canMergeIntoSinglePng(pngs)) {
      throw new Error("内容过长，无法作为单张图片复制，请改为导出 PNG 或 PDF。")
    }
    return { bytes: mergePngPages(pngs), imageFailures: prepared.imageFailures }
  } finally {
    prepared.dispose()
  }
}

/** User-facing summary of a finished export. */
export function describeExportResult(result: ExportResult): string {
  const label = result.format === "markdown" ? "Markdown" : result.format.toUpperCase()
  const base = result.paged
    ? `${label} 已分页导出（${result.files.length} 个文件）`
    : `${label} 已导出`
  return result.imageFailures > 0 ? `${base}，部分图片未成功嵌入。` : `${base}。`
}
