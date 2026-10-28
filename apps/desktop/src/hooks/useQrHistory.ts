import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { getPlatform } from "@quick-tools/platform"
import type { HistoryItem } from "@quick-tools/qr-code-gen"
import {
  addTagToHistoryItem,
  collectHistoryTags,
  exportHistoryData,
  mergeHistory,
  parseHistoryImport,
  removeHistoryItem,
  removeTagFromHistoryItem,
  upsertHistoryItem
} from "@quick-tools/qr-code-gen"

export const QR_HISTORY_STORAGE_KEY = "qr-history"

export interface QrHistoryImportResult {
  added: number
  merged: number
  error?: string
}

/**
 * QR free-mode history backed by the platform StorageAdapter. All list
 * operations come from @quick-tools/qr-code-gen so the desktop app and the
 * extension behave the same (dedupe, tags, 50-item cap, import/export format).
 */
export function useQrHistory() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const itemsRef = useRef<HistoryItem[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await getPlatform().storage.get<HistoryItem[]>(
        QR_HISTORY_STORAGE_KEY
      )
      if (cancelled) return
      if (result.ok && Array.isArray(result.value)) {
        // Older desktop builds stored duplicates without tags; normalise once.
        const normalised = mergeHistory([], result.value)
        itemsRef.current = normalised
        setItems(normalised)
      }
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const commit = useCallback(async (next: HistoryItem[]) => {
    itemsRef.current = next
    setItems(next)
    await getPlatform().storage.set(QR_HISTORY_STORAGE_KEY, next)
  }, [])

  const upsert = useCallback(
    (content: string, tags?: string[]) =>
      commit(upsertHistoryItem(itemsRef.current, content, { tags })),
    [commit]
  )

  const remove = useCallback(
    (content: string) => commit(removeHistoryItem(itemsRef.current, content)),
    [commit]
  )

  const addTag = useCallback(
    (content: string, tag: string) =>
      commit(addTagToHistoryItem(itemsRef.current, content, tag)),
    [commit]
  )

  const removeTag = useCallback(
    (content: string, tag: string) =>
      commit(removeTagFromHistoryItem(itemsRef.current, content, tag)),
    [commit]
  )

  const exportJson = useCallback(
    () => exportHistoryData(itemsRef.current),
    []
  )

  const importJson = useCallback(
    async (json: string): Promise<QrHistoryImportResult> => {
      const parsed = parseHistoryImport(json)
      if (parsed.error || parsed.items.length === 0) {
        return { added: 0, merged: 0, error: parsed.error }
      }
      const existing = new Set(itemsRef.current.map((i) => i.content))
      await commit(mergeHistory(itemsRef.current, parsed.items))
      const added = parsed.items.filter(
        (i) => !existing.has(i.content.trim())
      ).length
      return { added, merged: parsed.items.length - added }
    },
    [commit]
  )

  const allTags = useMemo(() => collectHistoryTags(items), [items])

  // Stable object: page callbacks depend on it and feed the shell's command
  // actions, so a fresh object per render would re-render endlessly.
  return useMemo(
    () => ({
      items,
      loaded,
      allTags,
      upsert,
      remove,
      addTag,
      removeTag,
      exportJson,
      importJson
    }),
    [
      items,
      loaded,
      allTags,
      upsert,
      remove,
      addTag,
      removeTag,
      exportJson,
      importJson
    ]
  )
}
