import type { PlatformProvider } from "@quick-tools/platform"
import { registerPlatform } from "@quick-tools/platform"

import { browserPlatform } from "./browser"
import { tauriClipboardAccess } from "./clipboard"
import { tauriContentExtractor } from "./content-extractor"
import { tauriFileDownloader } from "./file-system"
import { tauriHttpClient } from "./http"
import { tauriStorageAdapter } from "./storage"

const tauriPlatform: PlatformProvider = {
  fileDownloader: tauriFileDownloader,
  clipboard: tauriClipboardAccess,
  storage: tauriStorageAdapter,
  http: tauriHttpClient,
  contentExtractor: tauriContentExtractor
}

export function isTauriRuntime(): boolean {
  if (typeof window === "undefined") {
    return false
  }

  return typeof window.__TAURI_INTERNALS__?.invoke === "function"
}

export function initTauriPlatform(): void {
  registerPlatform(isTauriRuntime() ? tauriPlatform : browserPlatform)
}
