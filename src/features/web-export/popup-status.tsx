import React, { useEffect, useState } from "react"

import { EXPORT_STATUS_KEY } from "./constants"
import {
  hasRuntimeContext,
  isExtensionContextInvalid
} from "./extension-runtime"
import type { ExportStatus } from "./types"

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleString()
}

export function WebExportStatusCard() {
  const [status, setStatus] = useState<ExportStatus | null>(null)

  useEffect(() => {
    if (!hasRuntimeContext()) {
      return
    }

    chrome.storage.local.get(EXPORT_STATUS_KEY, (result) => {
      if (!hasRuntimeContext()) {
        return
      }

      if (chrome.runtime.lastError) {
        if (!isExtensionContextInvalid(chrome.runtime.lastError.message)) {
          console.error(
            "Failed to read export status",
            chrome.runtime.lastError
          )
        }
        return
      }

      setStatus((result?.[EXPORT_STATUS_KEY] as ExportStatus) ?? null)
    })

    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== "local" || !changes[EXPORT_STATUS_KEY]) {
        return
      }

      setStatus((changes[EXPORT_STATUS_KEY].newValue as ExportStatus) ?? null)
    }

    try {
      chrome.storage.onChanged.addListener(listener)
    } catch (error) {
      if (!isExtensionContextInvalid(error)) {
        console.error("Failed to subscribe export status", error)
      }
      return
    }

    return () => {
      try {
        if (hasRuntimeContext()) {
          chrome.storage.onChanged.removeListener(listener)
        }
      } catch (error) {
        if (!isExtensionContextInvalid(error)) {
          console.error("Failed to unsubscribe export status", error)
        }
      }
    }
  }, [])

  if (!status) {
    return (
      <div className="plasmo-mx-4 plasmo-mt-4 plasmo-rounded-xl plasmo-border plasmo-border-stone-200 plasmo-bg-amber-50 plasmo-p-3 plasmo-text-sm plasmo-text-stone-700">
        页面正文导出已接入右键菜单。打开网页后右键，即可导出 Markdown、PDF 或
        PNG。
      </div>
    )
  }

  const accentClass =
    status.state === "error"
      ? "plasmo-border-red-200 plasmo-bg-red-50 plasmo-text-red-700"
      : status.state === "success"
        ? "plasmo-border-emerald-200 plasmo-bg-emerald-50 plasmo-text-emerald-700"
        : "plasmo-border-amber-200 plasmo-bg-amber-50 plasmo-text-amber-700"

  return (
    <div
      className={`plasmo-mx-4 plasmo-mt-4 plasmo-rounded-xl plasmo-border plasmo-p-3 plasmo-text-sm ${accentClass}`}>
      <div className="plasmo-font-medium">网页正文导出</div>
      <div className="plasmo-mt-1">{status.message}</div>
      <div className="plasmo-mt-2 plasmo-text-xs plasmo-opacity-80">
        {status.format ? `${status.format.toUpperCase()} · ` : ""}
        {status.title ? `${status.title} · ` : ""}
        {formatTime(status.updatedAt)}
      </div>
    </div>
  )
}
