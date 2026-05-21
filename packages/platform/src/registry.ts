import type { PlatformProvider } from "./interfaces"

let currentPlatform: PlatformProvider | null = null

export function registerPlatform(provider: PlatformProvider): void {
  currentPlatform = provider
}

export function getPlatform(): PlatformProvider {
  if (!currentPlatform) {
    throw new Error(
      "Platform not registered. Call registerPlatform() before using platform capabilities."
    )
  }
  return currentPlatform
}
