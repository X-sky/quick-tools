import { decode, encode } from "fast-png"
import { toCanvas, toPng } from "html-to-image"
import { jsPDF } from "jspdf"
import React, { useEffect, useMemo, useRef, useState } from "react"

import {
  hasRuntimeContext,
  isExtensionContextInvalid
} from "~features/web-export/extension-runtime"
import { ExportDocument } from "~features/web-export/render/ExportDocument"
import type { BackgroundMessage, ExportTask } from "~features/web-export/types"
import { buildDownloadFilename } from "~features/web-export/utils"

import "~style.css"

const PNG_PIXEL_RATIO = 3
const PDF_PAGE_PIXEL_RATIO = 2
const MAX_MERGED_CANVAS_DIMENSION = 16384

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

function canMergeToSinglePng(element: HTMLElement) {
  return (
    Math.ceil(element.scrollWidth * PNG_PIXEL_RATIO) <=
      MAX_MERGED_CANVAS_DIMENSION &&
    Math.ceil(element.scrollHeight * PNG_PIXEL_RATIO) <=
      MAX_MERGED_CANVAS_DIMENSION
  )
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
  const pageWidthPt = 595.28
  const pageHeightPt = 841.89
  const contentWidth = Math.ceil(element.scrollWidth)
  const contentHeight = Math.ceil(element.scrollHeight)
  const pageCssHeight = Math.floor((contentWidth * pageHeightPt) / pageWidthPt)
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

        setTask(response.task as ExportTask)
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
    if (!taskId || !task || !contentRef.current) {
      return
    }

    let cancelled = false

    const render = async () => {
      try {
        await document.fonts.ready
        await new Promise((resolve) => window.setTimeout(resolve, 300))

        try {
          if (task.format === "pdf") {
            const objectUrl = await buildPdfObjectUrl(contentRef.current!)
            await downloadObjectUrl(
              objectUrl,
              buildDownloadFilename(task.filenameBase, task.format)
            )
          } else {
            const contentHeight = Math.ceil(contentRef.current!.scrollHeight)
            const contentWidth = Math.ceil(contentRef.current!.scrollWidth)
            const pageCssHeight = Math.floor((contentWidth * 841.89) / 595.28)

            if (contentHeight <= pageCssHeight) {
              const dataUrl = await toPng(contentRef.current!, {
                cacheBust: true,
                pixelRatio: PNG_PIXEL_RATIO,
                backgroundColor: "#f6efe6"
              })

              await chrome.downloads.download({
                url: dataUrl,
                filename: buildDownloadFilename(task.filenameBase, task.format)
              })
            } else if (canMergeToSinglePng(contentRef.current!)) {
              const objectUrl = await buildMergedPngObjectUrl(
                contentRef.current!
              )

              await downloadObjectUrl(
                objectUrl,
                buildDownloadFilename(task.filenameBase, task.format)
              )
            } else {
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
            `${task.format.toUpperCase()} render failed: ${
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
            format: task.format,
            title: task.article.title
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
  }, [task, taskId])

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
