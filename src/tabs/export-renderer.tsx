import { decode, encode } from "fast-png"
import { toCanvas, toPng } from "html-to-image"
import { jsPDF } from "jspdf"
import React, { useEffect, useMemo, useRef, useState } from "react"

import {
  hasRuntimeContext,
  isExtensionContextInvalid
} from "~features/web-export/extension-runtime"
import { ExportDocument } from "~features/web-export/render/ExportDocument"
import type {
  BackgroundMessage,
  ExportFormat,
  ExportMetrics,
  ExportStrategy,
  ExportTask
} from "~features/web-export/types"
import { buildDownloadFilename } from "~features/web-export/utils"

import "~style.css"

const PNG_PIXEL_RATIO = 3
const PDF_PAGE_PIXEL_RATIO = 2
const MAX_MERGED_CANVAS_DIMENSION = 16384
const MAX_MERGED_RGBA_BYTES = 200 * 1024 * 1024
const SUPER_LONG_PAGE_THRESHOLD = 12
const PAGE_WIDTH_PT = 595.28
const PAGE_HEIGHT_PT = 841.89

function getContentMetrics(element: HTMLElement): ExportMetrics {
  const contentWidth = Math.ceil(element.scrollWidth)
  const contentHeight = Math.ceil(element.scrollHeight)
  const pageCssHeight = Math.floor(
    (contentWidth * PAGE_HEIGHT_PT) / PAGE_WIDTH_PT
  )
  const totalPages = Math.max(1, Math.ceil(contentHeight / pageCssHeight))
  const mergedWidth = Math.ceil(contentWidth * PNG_PIXEL_RATIO)
  const mergedHeight = Math.ceil(contentHeight * PNG_PIXEL_RATIO)
  const mergedBytes = mergedWidth * mergedHeight * 4

  return {
    contentWidth,
    contentHeight,
    pageCssHeight,
    totalPages,
    mergedWidth,
    mergedHeight,
    mergedBytes
  }
}

function getExportStrategy(metrics: ExportMetrics): ExportStrategy {
  if (metrics.contentHeight <= metrics.pageCssHeight) {
    return {
      sizeTier: "short",
      recommendedFormat: "png",
      pngMode: "single",
      reason: ["内容高度在单页内，适合直接导出单张 PNG。"],
      summary: "SHORT · 单张 PNG"
    }
  }

  const canMerge =
    metrics.mergedWidth <= MAX_MERGED_CANVAS_DIMENSION &&
    metrics.mergedHeight <= MAX_MERGED_CANVAS_DIMENSION &&
    metrics.mergedBytes <= MAX_MERGED_RGBA_BYTES &&
    metrics.totalPages <= SUPER_LONG_PAGE_THRESHOLD

  if (canMerge) {
    return {
      sizeTier: "medium",
      recommendedFormat: "png",
      pngMode: "merge",
      reason: ["内容需要分页渲染，但仍可在安全尺寸内合并为单张 PNG。"],
      summary: "MEDIUM · 合并单张 PNG"
    }
  }

  const reason = []

  if (metrics.totalPages > SUPER_LONG_PAGE_THRESHOLD) {
    reason.push(`分页数达到 ${metrics.totalPages} 页，已视为超长内容。`)
  }

  if (metrics.mergedWidth > MAX_MERGED_CANVAS_DIMENSION) {
    reason.push("合并后的 PNG 宽度将超过浏览器安全尺寸。")
  }

  if (metrics.mergedHeight > MAX_MERGED_CANVAS_DIMENSION) {
    reason.push("合并后的 PNG 高度将超过浏览器安全尺寸。")
  }

  if (metrics.mergedBytes > MAX_MERGED_RGBA_BYTES) {
    reason.push("合并后的位图内存开销过高。")
  }

  return {
    sizeTier: "super_long",
    recommendedFormat: "pdf",
    pngMode: "confirm",
    reason,
    summary: "SUPER_LONG · 推荐 PDF"
  }
}

function describeStrategy(
  format: Exclude<ExportFormat, "markdown">,
  strategy: ExportStrategy,
  modeOverride?: "single" | "merge" | "paged" | "pdf"
) {
  const mode = modeOverride || (format === "pdf" ? "pdf" : strategy.pngMode)

  if (format === "pdf" || mode === "pdf") {
    return `${strategy.sizeTier.toUpperCase()} · 分页导出 PDF`
  }

  if (mode === "single") {
    return `${strategy.sizeTier.toUpperCase()} · 单张 PNG`
  }

  if (mode === "merge") {
    return `${strategy.sizeTier.toUpperCase()} · 已合并为单张 PNG`
  }

  return `${strategy.sizeTier.toUpperCase()} · 已分页导出 PNG`
}

function buildPageFilename(base: string, index: number, total: number) {
  return total > 1
    ? `${base}-p${String(index + 1).padStart(2, "0")}.png`
    : `${base}.png`
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to create image blob"))
        return
      }

      resolve(blob)
    }, "image/png")
  })
}

async function blobToUint8Array(blob: Blob) {
  return new Uint8Array(await blob.arrayBuffer())
}

function toRgbaBuffer(
  data: Uint8Array | Uint8ClampedArray | Uint16Array,
  width: number,
  height: number,
  channels: number
) {
  const rgba = new Uint8Array(width * height * 4)

  if (channels === 4) {
    if (data instanceof Uint16Array) {
      for (let i = 0; i < width * height; i += 1) {
        const sourceOffset = i * 4
        const targetOffset = i * 4
        rgba[targetOffset] = data[sourceOffset] >> 8
        rgba[targetOffset + 1] = data[sourceOffset + 1] >> 8
        rgba[targetOffset + 2] = data[sourceOffset + 2] >> 8
        rgba[targetOffset + 3] = data[sourceOffset + 3] >> 8
      }
    } else {
      rgba.set(data as Uint8Array)
    }

    return rgba
  }

  for (let i = 0; i < width * height; i += 1) {
    const targetOffset = i * 4
    const sourceOffset = i * channels

    if (channels === 3) {
      rgba[targetOffset] = Number(data[sourceOffset])
      rgba[targetOffset + 1] = Number(data[sourceOffset + 1])
      rgba[targetOffset + 2] = Number(data[sourceOffset + 2])
      rgba[targetOffset + 3] = 255
      continue
    }

    if (channels === 2) {
      const gray = Number(data[sourceOffset])
      rgba[targetOffset] = gray
      rgba[targetOffset + 1] = gray
      rgba[targetOffset + 2] = gray
      rgba[targetOffset + 3] = Number(data[sourceOffset + 1])
      continue
    }

    const gray = Number(data[sourceOffset])
    rgba[targetOffset] = gray
    rgba[targetOffset + 1] = gray
    rgba[targetOffset + 2] = gray
    rgba[targetOffset + 3] = 255
  }

  return rgba
}

async function downloadObjectUrl(url: string, filename: string) {
  const downloadId = await chrome.downloads.download({
    url,
    filename
  })

  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)

  return downloadId
}

async function withPagedCanvases(
  element: HTMLElement,
  pixelRatio: number,
  onPage: (args: {
    canvas: HTMLCanvasElement
    index: number
    total: number
    cssWidth: number
    cssHeight: number
  }) => Promise<void>
) {
  const contentWidth = Math.ceil(element.scrollWidth)
  const contentHeight = Math.ceil(element.scrollHeight)
  const pageCssHeight = Math.floor(
    (contentWidth * PAGE_HEIGHT_PT) / PAGE_WIDTH_PT
  )
  const totalPages = Math.max(1, Math.ceil(contentHeight / pageCssHeight))
  const stagingRoot = document.createElement("div")

  stagingRoot.style.position = "fixed"
  stagingRoot.style.left = "-99999px"
  stagingRoot.style.top = "0"
  stagingRoot.style.width = `${contentWidth}px`
  stagingRoot.style.pointerEvents = "none"
  stagingRoot.style.zIndex = "-1"
  document.body.appendChild(stagingRoot)

  try {
    for (let index = 0; index < totalPages; index += 1) {
      const offsetY = index * pageCssHeight
      const currentPageHeight = Math.min(pageCssHeight, contentHeight - offsetY)
      const viewport = document.createElement("div")
      viewport.style.width = `${contentWidth}px`
      viewport.style.height = `${currentPageHeight}px`
      viewport.style.overflow = "hidden"
      viewport.style.background = "#f6efe6"
      viewport.style.position = "relative"

      const pageClone = element.cloneNode(true) as HTMLElement
      pageClone.style.margin = "0"
      pageClone.style.width = `${contentWidth}px`
      pageClone.style.transform = `translateY(-${offsetY}px)`
      pageClone.style.transformOrigin = "top left"

      viewport.appendChild(pageClone)
      stagingRoot.appendChild(viewport)

      try {
        const canvas = await toCanvas(viewport, {
          cacheBust: true,
          pixelRatio,
          backgroundColor: "#f6efe6",
          skipAutoScale: true
        })

        await onPage({
          canvas,
          index,
          total: totalPages,
          cssWidth: contentWidth,
          cssHeight: currentPageHeight
        })
      } finally {
        stagingRoot.removeChild(viewport)
      }
    }
  } finally {
    document.body.removeChild(stagingRoot)
  }
}

async function buildPdfObjectUrl(element: HTMLElement) {
  try {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4"
    })
    const pageWidth = pdf.internal.pageSize.getWidth()

    await withPagedCanvases(
      element,
      PDF_PAGE_PIXEL_RATIO,
      async ({ canvas, index, cssWidth, cssHeight }) => {
        const renderedHeight = (cssHeight * pageWidth) / cssWidth

        if (index > 0) {
          pdf.addPage()
        }

        pdf.addImage(
          canvas,
          "JPEG",
          0,
          0,
          pageWidth,
          renderedHeight,
          undefined,
          "MEDIUM"
        )
      }
    )

    const blob = pdf.output("blob")
    return URL.createObjectURL(blob)
  } catch (error) {
    throw new Error(
      `PDF compose failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    )
  }
}

async function buildMergedPngObjectUrl(element: HTMLElement) {
  const mergedWidth = Math.ceil(element.scrollWidth * PNG_PIXEL_RATIO)
  const mergedHeight = Math.ceil(element.scrollHeight * PNG_PIXEL_RATIO)
  const mergedBuffer = new Uint8Array(mergedWidth * mergedHeight * 4)

  let offsetY = 0

  await withPagedCanvases(element, PNG_PIXEL_RATIO, async ({ canvas }) => {
    const blob = await canvasToBlob(canvas)
    const pngBytes = await blobToUint8Array(blob)
    const decoded = decode(pngBytes)
    const rgba = toRgbaBuffer(
      decoded.data,
      decoded.width,
      decoded.height,
      decoded.channels
    )

    for (let row = 0; row < decoded.height; row += 1) {
      const sourceStart = row * decoded.width * 4
      const sourceEnd = sourceStart + decoded.width * 4
      const targetStart = (offsetY + row) * mergedWidth * 4
      mergedBuffer.set(rgba.subarray(sourceStart, sourceEnd), targetStart)
    }

    offsetY += decoded.height
  })

  const encoded = encode({
    width: mergedWidth,
    height: mergedHeight,
    data: mergedBuffer,
    channels: 4,
    depth: 8
  })
  const blob = new Blob([encoded], { type: "image/png" })
  return URL.createObjectURL(blob)
}

function ExportRendererTab() {
  const [task, setTask] = useState<ExportTask | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [strategy, setStrategy] = useState<ExportStrategy | null>(null)
  const [metrics, setMetrics] = useState<ExportMetrics | null>(null)
  const [activeFormat, setActiveFormat] = useState<Exclude<
    ExportFormat,
    "markdown"
  > | null>(null)
  const [pngDecision, setPngDecision] = useState<"paged" | null>(null)
  const [progressMessage, setProgressMessage] = useState<string>("")
  const [statusSummary, setStatusSummary] = useState<string>("")
  const contentRef = useRef<HTMLDivElement>(null)
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
      setError("Missing export task id.")
      return
    }

    if (!hasRuntimeContext()) {
      setError("Extension context invalidated. Please reopen the export.")
      return
    }

    void chrome.runtime
      .sendMessage({
        type: "get-render-task",
        taskId
      } satisfies BackgroundMessage)
      .then((response) => {
        if (!response?.ok || !response.task) {
          throw new Error("Export task not found.")
        }

        const exportTask = response.task as ExportTask
        setTask(exportTask)
        setActiveFormat(exportTask.format)
        setPngDecision(null)
        setProgressMessage("")
        setStatusSummary("")
      })
      .catch((loadError) => {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Failed to load export task."

        setError(
          isExtensionContextInvalid(loadError)
            ? "Extension reloaded. Please start the export again."
            : message
        )
      })
  }, [taskId])

  useEffect(() => {
    if (!task || !contentRef.current || !activeFormat) {
      return
    }

    let cancelled = false

    const inspect = async () => {
      await document.fonts.ready
      await new Promise((resolve) => window.setTimeout(resolve, 150))

      if (cancelled || !contentRef.current) {
        return
      }

      const nextMetrics = getContentMetrics(contentRef.current)
      const nextStrategy = getExportStrategy(nextMetrics)

      setMetrics(nextMetrics)
      setStrategy(nextStrategy)

      if (activeFormat === "pdf") {
        setStatusSummary(describeStrategy("pdf", nextStrategy, "pdf"))
      } else if (nextStrategy.sizeTier === "short") {
        setStatusSummary(describeStrategy("png", nextStrategy, "single"))
      } else if (nextStrategy.sizeTier === "medium") {
        setStatusSummary(describeStrategy("png", nextStrategy, "merge"))
      } else if (pngDecision === "paged") {
        setStatusSummary(describeStrategy("png", nextStrategy, "paged"))
      } else {
        setStatusSummary(nextStrategy.summary)
      }
    }

    void inspect()

    return () => {
      cancelled = true
    }
  }, [task, activeFormat, pngDecision])

  useEffect(() => {
    if (!taskId || !task || !contentRef.current || !activeFormat || !strategy) {
      return
    }

    if (
      activeFormat === "png" &&
      strategy.sizeTier === "super_long" &&
      pngDecision !== "paged"
    ) {
      return
    }

    let cancelled = false

    const render = async () => {
      try {
        await document.fonts.ready
        await new Promise((resolve) => window.setTimeout(resolve, 300))

        try {
          if (activeFormat === "pdf") {
            setProgressMessage("正在分页渲染 PDF…")
            const objectUrl = await buildPdfObjectUrl(contentRef.current!)
            await downloadObjectUrl(
              objectUrl,
              buildDownloadFilename(task.filenameBase, activeFormat)
            )
          } else {
            if (strategy.sizeTier === "short") {
              setProgressMessage("短内容，正在导出单张 PNG…")
              const dataUrl = await toPng(contentRef.current!, {
                cacheBust: true,
                pixelRatio: PNG_PIXEL_RATIO,
                backgroundColor: "#f6efe6"
              })

              await chrome.downloads.download({
                url: dataUrl,
                filename: buildDownloadFilename(task.filenameBase, activeFormat)
              })
            } else if (strategy.sizeTier === "medium") {
              setProgressMessage("中长内容，正在分页渲染并合并单张 PNG…")
              const objectUrl = await buildMergedPngObjectUrl(
                contentRef.current!
              )

              await downloadObjectUrl(
                objectUrl,
                buildDownloadFilename(task.filenameBase, activeFormat)
              )
            } else {
              setProgressMessage("超长内容，正在分页导出 PNG…")
              await withPagedCanvases(
                contentRef.current!,
                PNG_PIXEL_RATIO,
                async ({ canvas, index, total }) => {
                  const blob = await canvasToBlob(canvas)
                  const objectUrl = URL.createObjectURL(blob)

                  await downloadObjectUrl(
                    objectUrl,
                    buildPageFilename(task.filenameBase, index, total)
                  )
                }
              )
            }
          }
        } catch (error) {
          throw new Error(
            `${activeFormat.toUpperCase()} render failed: ${
              error instanceof Error ? error.message : "unknown error"
            }`
          )
        }

        if (cancelled) {
          return
        }

        if (hasRuntimeContext()) {
          await chrome.runtime.sendMessage({
            type: "render-export-complete",
            taskId,
            format: activeFormat,
            title: task.article.title,
            summaryMessage:
              statusSummary || describeStrategy(activeFormat, strategy)
          } satisfies BackgroundMessage)
        }

        window.setTimeout(() => window.close(), 120)
      } catch (renderError) {
        if (cancelled) {
          return
        }

        const message = isExtensionContextInvalid(renderError)
          ? "Extension reloaded. Please start the export again."
          : renderError instanceof Error
            ? renderError.message
            : "Failed to render export document."

        setError(message)

        if (hasRuntimeContext()) {
          try {
            await chrome.runtime.sendMessage({
              type: "render-export-error",
              taskId,
              error: message
            } satisfies BackgroundMessage)
          } catch (notifyError) {
            if (!isExtensionContextInvalid(notifyError)) {
              console.error("Failed to report export error", notifyError)
            }
          }
        }
      }
    }

    void render()

    return () => {
      cancelled = true
    }
  }, [activeFormat, pngDecision, statusSummary, strategy, task, taskId])

  if (error) {
    return (
      <main className="plasmo-min-h-screen plasmo-bg-[#f6efe6] plasmo-p-8 plasmo-text-[#4f2f2f]">
        <div className="plasmo-mx-auto plasmo-max-w-2xl plasmo-rounded-3xl plasmo-border plasmo-border-red-200 plasmo-bg-white plasmo-p-8">
          {error}
        </div>
      </main>
    )
  }

  return (
    <main className="plasmo-min-h-screen plasmo-bg-[radial-gradient(circle_at_top,_#fff9ef,_#f6efe6_55%,_#efe3d1)] plasmo-p-10">
      {task && strategy && activeFormat ? (
        <section className="plasmo-mx-auto plasmo-mb-6 plasmo-w-full plasmo-max-w-[860px] plasmo-rounded-[24px] plasmo-border plasmo-border-[#eadbc9] plasmo-bg-white/90 plasmo-p-6 plasmo-shadow-[0_18px_40px_rgba(120,84,50,0.08)]">
          <div className="plasmo-flex plasmo-items-start plasmo-justify-between plasmo-gap-4">
            <div>
              <div className="plasmo-text-[12px] plasmo-uppercase plasmo-tracking-[0.24em] plasmo-text-[#b07d48]">
                Export Strategy
              </div>
              <h2 className="plasmo-mt-2 plasmo-text-2xl plasmo-font-semibold plasmo-text-[#352a1e]">
                {strategy.sizeTier === "short"
                  ? "短内容"
                  : strategy.sizeTier === "medium"
                    ? "中长内容"
                    : "超长内容"}
              </h2>
              <p className="plasmo-mt-2 plasmo-text-sm plasmo-text-[#6c5238]">
                推荐格式：{strategy.recommendedFormat.toUpperCase()} ·
                当前导出：
                {activeFormat.toUpperCase()}
              </p>
            </div>
            <div className="plasmo-rounded-full plasmo-bg-[#f6ede2] plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-font-medium plasmo-text-[#8a5a2d]">
              {statusSummary}
            </div>
          </div>

          <div className="plasmo-mt-4 plasmo-grid plasmo-gap-3 plasmo-text-sm plasmo-text-[#5f4a35] md:plasmo-grid-cols-3">
            <div className="plasmo-rounded-2xl plasmo-bg-[#fbf4ea] plasmo-p-4">
              宽度 {metrics?.contentWidth ?? "-"}px
            </div>
            <div className="plasmo-rounded-2xl plasmo-bg-[#fbf4ea] plasmo-p-4">
              高度 {metrics?.contentHeight ?? "-"}px
            </div>
            <div className="plasmo-rounded-2xl plasmo-bg-[#fbf4ea] plasmo-p-4">
              预估页数 {metrics?.totalPages ?? "-"}
            </div>
          </div>

          <div className="plasmo-mt-4 plasmo-space-y-2 plasmo-text-sm plasmo-text-[#5f4a35]">
            {strategy.reason.map((line) => (
              <div key={line}>{line}</div>
            ))}
            {progressMessage ? (
              <div className="plasmo-font-medium plasmo-text-[#8a5a2d]">
                {progressMessage}
              </div>
            ) : null}
          </div>

          {activeFormat === "png" &&
          strategy.sizeTier === "super_long" &&
          pngDecision !== "paged" ? (
            <div className="plasmo-mt-5 plasmo-flex plasmo-gap-3">
              <button
                onClick={() => {
                  setActiveFormat("pdf")
                  setProgressMessage("已切换为 PDF 导出策略。")
                }}
                className="plasmo-rounded-xl plasmo-bg-[#3f3427] plasmo-px-4 plasmo-py-2 plasmo-text-sm plasmo-font-medium plasmo-text-white hover:plasmo-bg-[#2f261d]">
                改为 PDF 导出
              </button>
              <button
                onClick={() => {
                  setPngDecision("paged")
                  setStatusSummary(describeStrategy("png", strategy, "paged"))
                  setProgressMessage("已确认继续分页导出 PNG。")
                }}
                className="plasmo-rounded-xl plasmo-border plasmo-border-[#d9c2a9] plasmo-bg-white plasmo-px-4 plasmo-py-2 plasmo-text-sm plasmo-font-medium plasmo-text-[#6c5238] hover:plasmo-bg-[#fcf7f1]">
                继续分页 PNG
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
      <div ref={contentRef}>
        {task ? (
          <ExportDocument article={task.article} />
        ) : (
          <div className="plasmo-mx-auto plasmo-max-w-2xl plasmo-rounded-3xl plasmo-border plasmo-border-[#eadbc9] plasmo-bg-white plasmo-p-8 plasmo-text-[#6f5742]">
            Preparing export document...
          </div>
        )}
      </div>
    </main>
  )
}

export default ExportRendererTab
