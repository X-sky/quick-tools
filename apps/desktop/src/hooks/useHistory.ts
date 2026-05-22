import { useCallback, useEffect, useState } from "react"

import { getPlatform } from "@quick-tools/platform"

import { filterHistory } from "../lib/history-filter"

interface UseHistoryOptions {
  storageKey: string
  maxItems?: number
}

interface UseHistoryReturn<T> {
  items: T[]
  add: (item: T) => Promise<void>
  remove: (index: number) => Promise<void>
  search: (query: string) => T[]
  clear: () => Promise<void>
}

/**
 * 通用历史记录 hook，封装 StorageAdapter 的 CRUD 操作
 * 支持泛型、maxItems 限制、按时间倒序排列
 */
export function useHistory<T extends { content: string; timestamp: number }>(
  options: UseHistoryOptions
): UseHistoryReturn<T> {
  const { storageKey, maxItems = 50 } = options
  const [items, setItems] = useState<T[]>([])

  const loadItems = useCallback(async () => {
    const platform = getPlatform()
    const result = await platform.storage.get<T[]>(storageKey)
    if (result.ok && result.value) {
      const sorted = [...result.value].sort(
        (a, b) => b.timestamp - a.timestamp
      )
      setItems(sorted)
    }
  }, [storageKey])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  const saveItems = useCallback(
    async (newItems: T[]) => {
      const platform = getPlatform()
      await platform.storage.set(storageKey, newItems)
    },
    [storageKey]
  )

  const add = useCallback(
    async (item: T) => {
      const updated = [item, ...items].slice(0, maxItems)
      setItems(updated)
      await saveItems(updated)
    },
    [items, maxItems, saveItems]
  )

  const remove = useCallback(
    async (index: number) => {
      const updated = items.filter((_, i) => i !== index)
      setItems(updated)
      await saveItems(updated)
    },
    [items, saveItems]
  )

  const search = useCallback(
    (query: string): T[] => {
      return filterHistory(items, query)
    },
    [items]
  )

  const clear = useCallback(async () => {
    setItems([])
    const platform = getPlatform()
    await platform.storage.remove(storageKey)
  }, [storageKey])

  return { items, add, remove, search, clear }
}
