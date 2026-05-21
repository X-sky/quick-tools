import type { PlatformProvider } from "@quick-tools/platform"
import { registerPlatform } from "@quick-tools/platform"

import { chromeClipboardAccess } from "./clipboard"
import { chromeContentExtractor } from "./content-extractor"
import { chromeFileDownloader } from "./downloads"
import { chromeHttpClient } from "./http"
import { chromeStorageAdapter } from "./storage"

const chromePlatform: PlatformProvider = {
  fileDownloader: chromeFileDownloader,
  clipboard: chromeClipboardAccess,
  storage: chromeStorageAdapter,
  http: chromeHttpClient,
  contentExtractor: chromeContentExtractor
}

export function initChromePlatform(): void {
  registerPlatform(chromePlatform)
}
