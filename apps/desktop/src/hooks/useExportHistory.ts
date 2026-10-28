import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { getPlatform } from "@quick-tools/platform"
import type { ExportHistoryItem } from "@quick-tools/web-export"
import {
  addExportHistoryItem,
  removeExportHistoryItem
} from "@quick-tools/web-export"

export const EXPORT_HISTORY_STORAGE_KEY = "web-export-history"

/** Web-export history backed by the platform StorageAdapter. */
export function useExportHistory() {
  const [items, setItems] = useState<ExportHistoryItem[]>([])
  const itemsRef = useRef<ExportHistoryItem[]>([])

  useEffect(() => {
    let cancelled = false
    void getPlatform()
      .storage.get<ExportHistoryItem[]>(EXPORT_HISTORY_STORAGE_KEY)
      .then((result) => {
        if (cancelled || !result.ok || !Array.isArray(result.value)) return
        const sorted = [...result.value].sort((a, b) => b.timestamp - a.timestamp)
        itemsRef.current = sorted
        setItems(sorted)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const commit = useCallback(async (next: ExportHistoryItem[]) => {
    itemsRef.current = next
    setItems(next)
    await getPlatform().storage.set(EXPORT_HISTORY_STORAGE_KEY, next)
  }, [])

  const add = useCallback(
    (item: ExportHistoryItem) => commit(addExportHistoryItem(itemsRef.current, item)),
    [commit]
  )

  const remove = useCallback(
    (item: ExportHistoryItem) =>
      commit(removeExportHistoryItem(itemsRef.current, item)),
    [commit]
  )

  // Stable object: pages put these callbacks in command actions, which are
  // pushed to the shell in an effect; a fresh object would loop forever.
  return useMemo(() => ({ items, add, remove }), [items, add, remove])
}
