import React from "react"

import "./markdown-theme.css"

import { useExportRenderer } from "./use-export-renderer"

export function ExportRendererTab() {
  const {
    error,
    progressMessage,
    activeFormat,
    pngDecision,
    preflight,
    documentRef,
    measurementRef,
    captureRef,
    measurementWidth,
    setActiveFormat,
    setPngDecision,
    setProgressMessage
  } = useExportRenderer()

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
        ref={documentRef}
        style={{
          position: "fixed",
          left: "-100000px",
          top: 0,
          width: `${measurementWidth}px`,
          pointerEvents: "none",
          opacity: 0
        }}
      />
      <div
        ref={measurementRef}
        style={{
          position: "fixed",
          left: "-100000px",
          top: 0,
          width: `${measurementWidth}px`,
          pointerEvents: "none",
          opacity: 0
        }}
      />
      <div
        ref={captureRef}
        style={{
          position: "fixed",
          left: "-100000px",
          top: 0,
          width: "1120px",
          pointerEvents: "none",
          opacity: 0
        }}
      />
    </main>
  )
}
