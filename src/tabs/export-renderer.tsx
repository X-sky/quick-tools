import { Resvg, initWasm } from "@resvg/resvg-wasm"
import { decode, encode } from "fast-png"
import { marked } from "marked"
import { PDFDocument } from "pdf-lib"
import React, { useEffect, useMemo, useRef, useState } from "react"
import satori from "satori"

import bodyFontUrl from "data-url:../assets/fonts/Arial Unicode.ttf"
import monoFontUrl from "data-url:../assets/fonts/Courier New.ttf"
import resvgWasmUrl from "data-url:../assets/resvg-index_bg.wasm"
import {
  hasRuntimeContext,
  isExtensionContextInvalid
} from "~features/web-export/extension-runtime"
import type {
  BackgroundMessage,
  MarkdownExportSource,
  RenderJob
} from "~features/web-export/types"
import { buildDownloadFilename } from "~features/web-export/utils"

import "~style.css"

const PAGE_WIDTH = 1120
const PAGE_HEIGHT = 1584
const PAGE_PADDING_X = 72
const PAGE_PADDING_Y = 72
const PAGE_GAP = 20
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_PADDING_X * 2
const SINGLE_PNG_MAX_DIMENSION = 16000
const SINGLE_PNG_MAX_BYTES = 200 * 1024 * 1024
const PDF_PAGE_WIDTH_PT = 595.28

type RenderBlock = {
  html: string
  height: number
}

type RenderPage = {
  html: string
  height: number
}

type PngPreflight = {
  shouldPrompt: boolean
  mergedWidth: number
  mergedHeight: number
  mergedBytes: number
}

type RendererAssets = {
  bodyFontBytes: Uint8Array
  monoFontBytes: Uint8Array
  bodyFontBuffer: ArrayBuffer
  monoFontBuffer: ArrayBuffer
}

let rendererAssetsPromise: Promise<RendererAssets> | null = null

marked.setOptions({
  gfm: true,
  breaks: false
})

async function loadBinaryAsset(url: string) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to load asset: ${url}`)
  }

  return new Uint8Array(await response.arrayBuffer())
}

function toExactArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  )
}

async function getRendererAssets() {
  if (!rendererAssetsPromise) {
    rendererAssetsPromise = (async () => {
      const [wasmBinary, bodyFont, monoFont] = await Promise.all([
        loadBinaryAsset(resvgWasmUrl),
        loadBinaryAsset(bodyFontUrl),
        loadBinaryAsset(monoFontUrl)
      ])

      await initWasm(wasmBinary)

      return {
        bodyFontBytes: bodyFont,
        monoFontBytes: monoFont,
        bodyFontBuffer: toExactArrayBuffer(bodyFont),
        monoFontBuffer: toExactArrayBuffer(monoFont)
      }
    })()
  }

  return rendererAssetsPromise
}

function buildHeaderHtml(source: MarkdownExportSource) {
  const meta = [
    `来源：<a href="${source.url}" style="color:#7c4f1d;text-decoration:none;">${source.url}</a>`,
    `抓取时间：${new Date(source.capturedAt).toLocaleString("zh-CN")}`
  ]

  if (source.byline) {
    meta.push(`作者：${source.byline}`)
  }

  const excerpt = source.excerpt?.trim()
    ? `<p style="display:flex;flex-direction:column;margin-top:18px;margin-right:0;margin-bottom:0;margin-left:0;color:#7a5e40;font-size:24px;line-height:1.65;">${escapeHtml(
        source.excerpt.trim()
      )}</p>`
    : ""

  return `
    <section style="display:flex;flex-direction:column;margin-top:0;margin-right:0;margin-bottom:32px;margin-left:0;padding-top:0;padding-right:0;padding-bottom:28px;padding-left:0;border-bottom:1px solid #d8c3ab;">
      <h1 style="display:flex;flex-direction:column;margin-top:0;margin-right:0;margin-bottom:14px;margin-left:0;font-size:54px;line-height:1.15;color:#2f2115;font-weight:700;">${escapeHtml(
        source.title || "Untitled page"
      )}</h1>
      <div style="display:flex;flex-direction:column;row-gap:12px;color:#8a6a4b;font-size:21px;line-height:1.5;">
        ${meta.map((item) => `<span>${item}</span>`).join("")}
      </div>
      ${excerpt}
    </section>
  `.trim()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function absolutizeUrl(url: string, baseUrl: string) {
  try {
    return new URL(url, baseUrl).href
  } catch {
    return url
  }
}

function walkAndStyleHtml(html: string, baseUrl: string) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html")
  const root = doc.body.firstElementChild as HTMLElement | null

  if (!root) {
    return ""
  }

  const elements = Array.from(root.querySelectorAll("*"))

  for (const element of elements) {
    const tag = element.tagName.toLowerCase()

    if (tag === "a") {
      const href = element.getAttribute("href")

      if (href) {
        element.setAttribute("href", absolutizeUrl(href, baseUrl))
      }

      element.setAttribute(
        "style",
        "color:#7c4f1d;text-decoration:none;border-bottom:1px solid rgba(124,79,29,0.35);"
      )
    }

    if (tag === "p") {
      element.setAttribute(
        "style",
        "display:flex;flex-direction:column;margin:0;color:#2f2115;font-size:28px;line-height:1.75;"
      )
    }

    if (/^h[1-6]$/.test(tag)) {
      const size =
        tag === "h1"
          ? 48
          : tag === "h2"
            ? 42
            : tag === "h3"
              ? 36
              : tag === "h4"
                ? 32
                : tag === "h5"
                  ? 28
                  : 26

      element.setAttribute(
        "style",
        `display:flex;flex-direction:column;margin:0;color:#2f2115;font-size:${size}px;line-height:1.25;font-weight:700;`
      )
    }

    if (tag === "ul" || tag === "ol") {
      element.setAttribute(
        "style",
        "display:flex;flex-direction:column;margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;padding-top:0;padding-right:0;padding-bottom:0;padding-left:30px;color:#2f2115;font-size:28px;line-height:1.75;"
      )
    }

    if (tag === "li") {
      element.setAttribute("style", "display:flex;margin:0;")
    }

    if (tag === "blockquote") {
      element.setAttribute(
        "style",
        "display:flex;flex-direction:column;margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;padding-top:16px;padding-right:20px;padding-bottom:16px;padding-left:20px;border-left:6px solid #c89d72;background:#f5ebde;color:#5f4934;font-size:26px;line-height:1.75;border-radius:12px;"
      )
    }

    if (tag === "pre") {
      element.setAttribute(
        "style",
        "display:flex;flex-direction:column;margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;padding-top:18px;padding-right:22px;padding-bottom:18px;padding-left:22px;background:#23170f;color:#f8ead8;border-radius:18px;font-size:22px;line-height:1.7;white-space:pre-wrap;word-break:break-word;"
      )
    }

    if (tag === "code" && element.parentElement?.tagName.toLowerCase() !== "pre") {
      element.setAttribute(
        "style",
        "display:flex;padding-top:3px;padding-right:8px;padding-bottom:3px;padding-left:8px;background:#f2e7d9;color:#8c4818;border-radius:8px;font-size:0.92em;"
      )
    }

    if (tag === "pre" || element.parentElement?.tagName.toLowerCase() === "pre") {
      element.setAttribute(
        "style",
        `${
          element.getAttribute("style") ?? ""
        }font-family:'Courier New','Menlo','Monaco',monospace;`
      )
    }

    if (tag === "table") {
      element.setAttribute(
        "style",
        "display:flex;flex-direction:column;width:100%;margin:0;border-collapse:collapse;font-size:24px;line-height:1.6;border-radius:14px;overflow:hidden;"
      )
    }

    if (tag === "thead" || tag === "tbody" || tag === "tr") {
      element.setAttribute("style", "display:flex;width:100%;")
    }

    if (tag === "th" || tag === "td") {
      const isHeader = tag === "th"
      element.setAttribute(
        "style",
        `display:flex;flex:1;border:1px solid #d8c3ab;padding-top:14px;padding-right:16px;padding-bottom:14px;padding-left:16px;text-align:left;background:${isHeader ? "#efe0cf" : "#fffdf8"};color:#2f2115;`
      )
    }

    if (tag === "hr") {
      element.setAttribute(
        "style",
        "display:flex;margin:0;border:none;border-top:1px solid #d8c3ab;"
      )
    }

    if (tag === "img") {
      const src = element.getAttribute("src")

      if (src) {
        element.setAttribute("src", absolutizeUrl(src, baseUrl))
      }

      element.setAttribute(
        "style",
        "display:flex;max-width:100%;height:auto;margin-top:0;margin-right:auto;margin-bottom:0;margin-left:auto;border-radius:18px;"
      )
    }
  }

  return root.innerHTML.trim()
}

function wrapRenderBlockHtml(html: string) {
  return `<section style="display:flex;flex-direction:column;width:100%;margin-top:0;margin-right:0;margin-bottom:24px;margin-left:0;">${html}</section>`
}

async function blobToDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Failed to read binary blob"))
    reader.readAsDataURL(blob)
  })
}

function supportsInlineDataUrl(mimeType: string) {
  return [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/svg+xml"
  ].includes(mimeType.toLowerCase())
}

async function loadImageDimensions(src: string) {
  return await new Promise<{ width: number; height: number } | null>(
    (resolve) => {
      const image = new Image()

      image.onload = () => {
        resolve(
          image.naturalWidth > 0 && image.naturalHeight > 0
            ? {
                width: image.naturalWidth,
                height: image.naturalHeight
              }
            : null
        )
      }

      image.onerror = () => resolve(null)
      image.src = src
    }
  )
}

async function inlineImagesInHtml(html: string, baseUrl: string) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html")
  const root = doc.body.firstElementChild as HTMLElement | null

  if (!root) {
    return { html: "", failed: 0 }
  }

  let failed = 0
  const images = Array.from(root.querySelectorAll("img"))

  await Promise.all(
    images.map(async (image) => {
      const rawSrc = image.getAttribute("src")?.trim()

      if (!rawSrc) {
        image.replaceWith(buildImagePlaceholder(doc))
        failed += 1
        return
      }

      const src = absolutizeUrl(rawSrc, baseUrl)

      try {
        const response = await fetch(src, {
          credentials: "include"
        })

        if (!response.ok) {
          throw new Error(`Image request failed with ${response.status}`)
        }

        const blob = await response.blob()
        let resolvedSrc = src

        if (supportsInlineDataUrl(blob.type || "")) {
          const dataUrl = await blobToDataUrl(blob)
          resolvedSrc = dataUrl
        }

        const dimensions = await loadImageDimensions(resolvedSrc)

        if (!dimensions) {
          throw new Error("Image size cannot be determined")
        }

        image.setAttribute("src", resolvedSrc)
        image.setAttribute("width", String(dimensions.width))
        image.setAttribute("height", String(dimensions.height))
      } catch {
        image.replaceWith(buildImagePlaceholder(doc))
        failed += 1
      }
    })
  )

  return {
    html: root.innerHTML.trim(),
    failed
  }
}

function buildImagePlaceholder(doc: Document) {
  const placeholder = doc.createElement("div")
  placeholder.setAttribute(
    "style",
    "display:flex;justify-content:center;margin-top:18px;margin-right:0;margin-bottom:18px;margin-left:0;padding-top:18px;padding-right:20px;padding-bottom:18px;padding-left:20px;border:1px dashed #d8c3ab;border-radius:18px;background:#fbf4ea;color:#8a6a4b;font-size:22px;line-height:1.6;text-align:center;"
  )
  placeholder.textContent = "图片未能成功嵌入导出结果"
  return placeholder
}

async function buildRenderBlocks(source: MarkdownExportSource) {
  const tokens = marked.lexer(source.markdown || source.plainText || "")
  const htmlBlocks = tokens
    .filter((token) => token.type !== "space")
    .map((token) => marked.parser([token]))
    .map((html) => walkAndStyleHtml(html, source.url))
    .map((html) => wrapRenderBlockHtml(html))
    .filter(Boolean)

  const normalizedBlocks = [buildHeaderHtml(source), ...htmlBlocks]
  const preparedBlocks = await Promise.all(
    normalizedBlocks.map(async (html) => {
      const prepared = await inlineImagesInHtml(html, source.url)
      return {
        html: prepared.html,
        imageFailures: prepared.failed
      }
    })
  )

  return {
    blocks: preparedBlocks.map((block) => block.html),
    imageFailures: preparedBlocks.reduce(
      (total, block) => total + block.imageFailures,
      0
    )
  }
}

function measureBlocks(blocks: string[], measurementRoot: HTMLDivElement) {
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

function paginateBlocks(blocks: RenderBlock[]) {
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

function getPngPreflight(pages: RenderPage[]): PngPreflight {
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

function buildPageMarkup(page: RenderPage, index: number, total: number) {
  return `
    <div style="display:flex;flex-direction:column;justify-content:space-between;width:${PAGE_WIDTH}px;height:${page.height}px;padding-top:${PAGE_PADDING_Y}px;padding-right:${PAGE_PADDING_X}px;padding-bottom:${PAGE_PADDING_Y}px;padding-left:${PAGE_PADDING_X}px;box-sizing:border-box;background:#f6efe6;font-family:'Arial Unicode MS','PingFang SC','Hiragino Sans GB',sans-serif;">
      <div style="display:flex;flex-direction:column;width:${CONTENT_WIDTH}px;">
        ${page.html}
      </div>
      <div style="margin-top:26px;color:#8a6a4b;font-size:18px;line-height:1.4;text-align:right;">${index + 1} / ${total}</div>
    </div>
  `.trim()
}

function styleStringToObject(styleText: string) {
  return styleText
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((styles, entry) => {
      const [property, ...rest] = entry.split(":")

      if (!property || rest.length === 0) {
        return styles
      }

      const value = rest.join(":").trim()
      const key = property
        .trim()
        .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())

      styles[key] = value
      return styles
    }, {})
}

function domNodeToReact(node: ChildNode, key: string): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null
  }

  const element = node as HTMLElement
  const props: Record<string, unknown> = { key }

  for (const attribute of Array.from(element.attributes)) {
    if (attribute.name === "style") {
      props.style = styleStringToObject(attribute.value)
      continue
    }

    if (attribute.name === "class") {
      continue
    }

    if (attribute.name === "colspan") {
      props.colSpan = Number(attribute.value)
      continue
    }

    if (attribute.name === "rowspan") {
      props.rowSpan = Number(attribute.value)
      continue
    }

    props[attribute.name] = attribute.value
  }

  const existingStyle = (props.style as Record<string, string> | undefined) ?? {}
  const hasMultipleChildren =
    Array.from(element.childNodes).filter((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        return Boolean(child.textContent?.trim())
      }

      return child.nodeType === Node.ELEMENT_NODE
    }).length > 1

  if (
    element.tagName.toLowerCase() === "div" &&
    hasMultipleChildren &&
    !existingStyle.display
  ) {
    props.style = {
      ...existingStyle,
      display: "flex",
      flexDirection: "column"
    }
  }

  const children = Array.from(element.childNodes).map((child, index) =>
    domNodeToReact(child, `${key}-${index}`)
  )

  return React.createElement(
    element.tagName.toLowerCase(),
    props,
    ...(children.length > 0 ? children : [])
  )
}

function htmlToSatoriNode(markup: string) {
  const doc = new DOMParser().parseFromString(markup, "text/html")
  const root = doc.body.firstElementChild

  if (!root) {
    return React.createElement("div", null)
  }

  return domNodeToReact(root, "root") as React.ReactElement
}

async function renderPagePngBytes(
  page: RenderPage,
  index: number,
  total: number,
  assets: RendererAssets
) {
  const svg = await satori(htmlToSatoriNode(buildPageMarkup(page, index, total)), {
    width: PAGE_WIDTH,
    height: page.height,
    fonts: [
      {
        name: "Arial Unicode MS",
        data: assets.bodyFontBuffer,
        weight: 400,
        style: "normal"
      },
      {
        name: "Courier New",
        data: assets.monoFontBuffer,
        weight: 400,
        style: "normal"
      }
    ]
  })

  const resvg = new Resvg(svg, {
    background: "#f6efe6",
    font: {
      fontBuffers: [assets.bodyFontBytes, assets.monoFontBytes],
      defaultFontFamily: "Arial Unicode MS",
      monospaceFamily: "Courier New"
    }
  })

  return resvg.render().asPng()
}

function canMergeIntoSinglePng(pagePngs: Uint8Array[]) {
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

function mergePngPages(pagePngs: Uint8Array[]) {
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

function bytesToObjectUrl(bytes: Uint8Array, mimeType: string) {
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }))
}

async function downloadObjectUrl(url: string, filename: string) {
  await chrome.downloads.download({
    url,
    filename
  })

  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

function buildPageFilename(base: string, index: number, total: number) {
  return total > 1
    ? `${base}-p${String(index + 1).padStart(2, "0")}.png`
    : `${base}.png`
}

async function buildPdfBytes(pagePngs: Uint8Array[]) {
  const pdf = await PDFDocument.create()

  for (const pngBytes of pagePngs) {
    const embedded = await pdf.embedPng(pngBytes)
    const pageWidth = PDF_PAGE_WIDTH_PT
    const pageHeight = (embedded.height * pageWidth) / embedded.width
    const page = pdf.addPage([pageWidth, pageHeight])

    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight
    })
  }

  return await pdf.save()
}

async function notifyBackground(message: BackgroundMessage) {
  if (!hasRuntimeContext()) {
    return
  }

  await chrome.runtime.sendMessage(message)
}

function ExportRendererTab() {
  const [job, setJob] = useState<RenderJob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progressMessage, setProgressMessage] = useState(
    "Initializing export task..."
  )
  const [activeFormat, setActiveFormat] = useState<"png" | "pdf" | null>(null)
  const [pngDecision, setPngDecision] = useState<"single" | "paged" | "pdf" | null>(
    null
  )
  const [preflight, setPreflight] = useState<PngPreflight | null>(null)
  const measurementRef = useRef<HTMLDivElement>(null)
  const taskId = useMemo(
    () => new URLSearchParams(window.location.search).get("taskId"),
    []
  )

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isExtensionContextInvalid(event.reason)) {
        event.preventDefault()
      }
    }

    const handleWindowError = (event: ErrorEvent) => {
      if (isExtensionContextInvalid(event.error ?? event.message)) {
        event.preventDefault()
      }
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection)
    window.addEventListener("error", handleWindowError)

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
      window.removeEventListener("error", handleWindowError)
    }
  }, [])

  useEffect(() => {
    if (!taskId) {
      setError("Missing render task id.")
      return
    }

    if (!hasRuntimeContext()) {
      setError("Extension context invalidated. Please reopen the export.")
      return
    }

    void chrome.runtime
      .sendMessage({
        type: "get-render-job",
        taskId
      } satisfies BackgroundMessage)
      .then((response) => {
        if (!response?.ok || !response.job) {
          throw new Error("Render job not found.")
        }

        const nextJob = response.job as RenderJob
        setJob(nextJob)
        setActiveFormat(nextJob.format)
        setPngDecision(null)
        setPreflight(null)
      })
      .catch((loadError) => {
        setError(
          isExtensionContextInvalid(loadError)
            ? "Extension reloaded. Please start the export again."
            : loadError instanceof Error
              ? loadError.message
              : "Failed to load render job."
        )
      })
  }, [taskId])

  useEffect(() => {
    if (!taskId || !job || !measurementRef.current || !activeFormat) {
      return
    }

    let cancelled = false

    const updateProgress = async (message: string) => {
      if (cancelled) {
        return
      }

      setProgressMessage(message)
      await notifyBackground({
        type: "render-job-progress",
        taskId,
        message
      })
    }

    const run = async () => {
      try {
        await updateProgress("Initializing the Markdown renderer...")
        const assets = await getRendererAssets()

        await updateProgress("Preparing Markdown content...")
        const prepared = await buildRenderBlocks(job.source)

        await updateProgress("Calculating page layout...")
        const measuredBlocks = measureBlocks(prepared.blocks, measurementRef.current!)
        const pages = paginateBlocks(measuredBlocks)

        if (activeFormat === "png") {
          const nextPreflight = getPngPreflight(pages)
          setPreflight(nextPreflight)

          if (nextPreflight.shouldPrompt && !pngDecision) {
            setProgressMessage(
              "This export is too large for a reliable single PNG. PDF is recommended, or you can continue with paged PNG files."
            )
            return
          }
        }

        await updateProgress("Rendering page images...")
        const pagePngs: Uint8Array[] = []

        for (let index = 0; index < pages.length; index += 1) {
          await updateProgress(
            `Rendering page ${index + 1} of ${pages.length}...`
          )
          pagePngs.push(
            await renderPagePngBytes(pages[index], index, pages.length, assets)
          )
        }

        if (activeFormat === "png") {
          await updateProgress("Preparing PNG download...")

          const shouldMerge =
            pngDecision !== "paged" && canMergeIntoSinglePng(pagePngs)

          if (shouldMerge) {
            const mergedBytes = mergePngPages(pagePngs)
            const mergedUrl = bytesToObjectUrl(mergedBytes, "image/png")
            await downloadObjectUrl(
              mergedUrl,
              buildDownloadFilename(job.filenameBase, "png")
            )

            const summary =
              prepared.imageFailures > 0
                ? "PNG 已开始下载，部分图片未成功嵌入。"
                : "PNG 已开始下载。"

            await notifyBackground({
              type: "render-job-complete",
              taskId,
              format: "png",
              title: job.source.title,
              summaryMessage: summary
            })
          } else {
            for (let index = 0; index < pagePngs.length; index += 1) {
              const pageUrl = bytesToObjectUrl(pagePngs[index], "image/png")
              await downloadObjectUrl(
                pageUrl,
                buildPageFilename(job.filenameBase, index, pagePngs.length)
              )
            }

            const summary =
              prepared.imageFailures > 0
                ? "PNG 已分页下载，部分图片未成功嵌入。"
                : "PNG 已分页下载。"

            await notifyBackground({
              type: "render-job-complete",
              taskId,
              format: "png",
              title: job.source.title,
              summaryMessage: summary
            })
          }
        } else {
          await updateProgress("Generating the PDF file...")
          const pdfBytes = await buildPdfBytes(pagePngs)
          const pdfUrl = bytesToObjectUrl(pdfBytes, "application/pdf")
          await downloadObjectUrl(
            pdfUrl,
            buildDownloadFilename(job.filenameBase, "pdf")
          )

          const summary =
            prepared.imageFailures > 0
              ? "PDF 已开始下载，部分图片未成功嵌入。"
              : "PDF 已开始下载。"

          await notifyBackground({
            type: "render-job-complete",
            taskId,
            format: "pdf",
            title: job.source.title,
            summaryMessage: summary
          })
        }

        window.setTimeout(() => window.close(), 120)
      } catch (renderError) {
        const message =
          renderError instanceof Error
            ? renderError.stack || renderError.message
            : "Failed to render export document."

        if (!cancelled) {
          setError(message)

          if (hasRuntimeContext()) {
            await notifyBackground({
              type: "render-job-error",
              taskId,
              error: message
            })
          }
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [activeFormat, job, pngDecision, taskId])

  return (
    <main className="plasmo-min-h-screen plasmo-bg-stone-100 plasmo-p-8 plasmo-text-stone-900">
      <div className="plasmo-mx-auto plasmo-max-w-3xl plasmo-rounded-2xl plasmo-border plasmo-border-stone-200 plasmo-bg-white plasmo-p-6 plasmo-shadow-sm">
        <h1 className="plasmo-text-xl plasmo-font-semibold">
          Web Page Export
        </h1>
        <p className="plasmo-mt-3 plasmo-text-sm plasmo-leading-6 plasmo-text-stone-600">
          {error || progressMessage}
        </p>
        {!error && activeFormat === "png" && preflight?.shouldPrompt && !pngDecision ? (
          <div className="plasmo-mt-5 plasmo-rounded-xl plasmo-border plasmo-border-amber-200 plasmo-bg-amber-50 plasmo-p-4">
            <p className="plasmo-text-sm plasmo-leading-6 plasmo-text-amber-900">
              This PNG would be approximately {preflight.mergedWidth} x{" "}
              {preflight.mergedHeight} pixels. A single image may be too large to
              export reliably.
            </p>
            <div className="plasmo-mt-4 plasmo-flex plasmo-gap-3">
              <button
                onClick={() => setPngDecision("paged")}
                className="plasmo-rounded-md plasmo-bg-stone-900 plasmo-px-4 plasmo-py-2 plasmo-text-sm plasmo-font-medium plasmo-text-white">
                Export as paged PNG
              </button>
              <button
                onClick={() => {
                  setActiveFormat("pdf")
                  setPngDecision("pdf")
                  setProgressMessage("Switching to PDF export...")
                }}
                className="plasmo-rounded-md plasmo-bg-white plasmo-px-4 plasmo-py-2 plasmo-text-sm plasmo-font-medium plasmo-text-stone-900 plasmo-ring-1 plasmo-ring-stone-300">
                Export as PDF instead
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <div
        ref={measurementRef}
        style={{
          position: "fixed",
          left: "-100000px",
          top: 0,
          width: `${CONTENT_WIDTH}px`,
          pointerEvents: "none",
          opacity: 0
        }}
      />
    </main>
  )
}

export default ExportRendererTab
