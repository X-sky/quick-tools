import type { PlatformResult, StorageAdapter } from "@quick-tools/platform"
import { createErrorResult, createSuccess } from "@quick-tools/platform"

export const chromeStorageAdapter: StorageAdapter = {
  async get<T>(key: string): Promise<PlatformResult<T | null>> {
    try {
      const result = await chrome.storage.local.get(key)
      const value = result[key] as T | undefined
      return createSuccess(value ?? null)
    } catch (err) {
      return createErrorResult(
        "unknown",
        `Failed to read storage key "${key}": ${err instanceof Error ? err.message : String(err)}`
      )
    }
  },

  async set<T>(key: string, value: T): Promise<PlatformResult<void>> {
    try {
      await chrome.storage.local.set({ [key]: value })
      return createSuccess(undefined)
    } catch (err) {
      return createErrorResult(
        "unknown",
        `Failed to write storage key "${key}": ${err instanceof Error ? err.message : String(err)}`
      )
    }
  },

  async remove(key: string): Promise<PlatformResult<void>> {
    try {
      await chrome.storage.local.remove(key)
      return createSuccess(undefined)
    } catch (err) {
      return createErrorResult(
        "unknown",
        `Failed to remove storage key "${key}": ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}
