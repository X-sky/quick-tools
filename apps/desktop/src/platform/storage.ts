import type { PlatformResult, StorageAdapter } from "@quick-tools/platform"
import { createErrorResult, createSuccess } from "@quick-tools/platform"
import { load } from "@tauri-apps/plugin-store"

const STORE_PATH = "quick-tools-store.json"

let storeInstance: Awaited<ReturnType<typeof load>> | null = null

async function getStore() {
  if (!storeInstance) {
    storeInstance = await load(STORE_PATH)
  }
  return storeInstance
}

export const tauriStorageAdapter: StorageAdapter = {
  async get<T>(key: string): Promise<PlatformResult<T | null>> {
    try {
      const store = await getStore()
      const value = await store.get<T>(key)
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
      const store = await getStore()
      await store.set(key, value)
      await store.save()
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
      const store = await getStore()
      await store.delete(key)
      await store.save()
      return createSuccess(undefined)
    } catch (err) {
      return createErrorResult(
        "unknown",
        `Failed to remove storage key "${key}": ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}
