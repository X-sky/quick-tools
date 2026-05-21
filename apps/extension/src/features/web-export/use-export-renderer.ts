import { useEffect, useMemo, useRef, useState } from "react"

import {
  hasRuntimeContext,
  isExtensionContextInvalid
} from "./extension-runtime"
import {
  buildPageFilename,
  capturePageForPdf,
  bytesToObjectUrl,
  canMergeIntoSinglePng,
  downloadObjectUrl,
  getPdfCaptureProfile,
  mergePngPages,
  renderPagePngBytes
} from "./image-export"
import { buildRenderedDocument } from "./markdown-render"
import { getPngPreflight, paginateRenderedDocument } from "./pagination"
import { buildPdfBytes } from "./pdf-export"
import { CONTENT_WIDTH } from "./render-constants"
import type {
  BackgroundMessage,
  BinaryExportFormat,
  PdfPageCapture,
  PngDecision,
  PngPreflight,
  RenderJob
} from "./types"
import { buildDownloadFilename } from "./utils"

async function notifyBackground(message: BackgroundMessage) {
  if (!hasRuntimeContext()) {
    return
  }

  await chrome.runtime.sendMessage(message)
}

export function useExportRenderer() {
  const [job, setJob] = useState<RenderJob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progressMessage, setProgressMessage] = useState(
    "Initializing export task..."
  )
  const [activeFormat, setActiveFormat] = useState<BinaryExportFormat | null>(null)
  const [pngDecision, setPngDecision] = useState<PngDecision>(null)
  const [preflight, setPreflight] = useState<PngPreflight | null>(null)
  const documentRef = useRef<HTMLDivElement>(null)
  const measurementRef = useRef<HTMLDivElement>(null)
  const captureRef = useRef<HTMLDivElement>(null)
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
    if (
      !taskId ||
      !job ||
      !documentRef.current ||
      !measurementRef.current ||
      !captureRef.current ||
      !activeFormat
    ) {
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
        await updateProgress("Preparing Markdown content...")
        const renderedDocument = await buildRenderedDocument(job.source)

        if (cancelled) {
          return
        }

        documentRef.current!.innerHTML = renderedDocument.html

        const articleRoot = documentRef.current!.querySelector(
          ".web-export-markdown"
        ) as HTMLElement | null

        if (!articleRoot) {
          throw new Error("Failed to render Markdown document.")
        }

        await updateProgress("Calculating page layout...")
        const pages = paginateRenderedDocument(
          articleRoot,
          measurementRef.current!
        )

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

        if (activeFormat === "png") {
          const pagePngs: Uint8Array[] = []

          for (let index = 0; index < pages.length; index += 1) {
            await updateProgress(`Rendering page ${index + 1} of ${pages.length}...`)
            pagePngs.push(
              await renderPagePngBytes(
                pages[index],
                index,
                pages.length,
                captureRef.current!
              )
            )
          }

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
              renderedDocument.imageFailures > 0
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
              renderedDocument.imageFailures > 0
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
          const pageCaptures: PdfPageCapture[] = []

          for (let index = 0; index < pages.length; index += 1) {
            const page = pages[index]
            const profile = getPdfCaptureProfile(page)
            const detail =
              page.pageKind === "table"
                ? "Rendering table page"
                : "Rendering page"

            await updateProgress(`${detail} ${index + 1} of ${pages.length}...`)
            pageCaptures.push(
              await capturePageForPdf(
                page,
                index,
                pages.length,
                captureRef.current!,
                profile
              )
            )
          }

          await updateProgress("Generating the PDF file...")
          const pdfBytes = await buildPdfBytes(pageCaptures)
          const pdfUrl = bytesToObjectUrl(pdfBytes, "application/pdf")
          await downloadObjectUrl(
            pdfUrl,
            buildDownloadFilename(job.filenameBase, "pdf")
          )

          const summary =
            renderedDocument.imageFailures > 0
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

  return {
    error,
    progressMessage,
    activeFormat,
    pngDecision,
    preflight,
    documentRef,
    measurementRef,
    captureRef,
    measurementWidth: CONTENT_WIDTH,
    setActiveFormat,
    setPngDecision,
    setProgressMessage
  }
}
