import type { TemplateStore } from "@quick-tools/qr-code-gen"

export {
  createEmptyStore,
  addValue,
  deleteValue,
  reorderValues,
  setDefaultValue
} from "@quick-tools/qr-code-gen"

const STORAGE_KEY = "qrcode-template-store"
const BACKUP_KEY = "qrcode-template-store.bak"

function isValidStoreShape(data: unknown): data is TemplateStore {
  if (typeof data !== "object" || data === null) return false
  const record = data as Record<string, unknown>
  return (
    Array.isArray(record.templates) &&
    Array.isArray(record.placeholderValues) &&
    Array.isArray(record.combinationTags)
  )
}

export function loadStore(): TemplateStore {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) return { templates: [], placeholderValues: [], combinationTags: [] }

  try {
    const parsed = JSON.parse(raw)
    if (isValidStoreShape(parsed)) return parsed
    // Shape invalid — treat as corrupt
    console.error(
      "[qr-template-store] Stored value has invalid shape, resetting"
    )
    localStorage.setItem(BACKUP_KEY, raw)
    return { templates: [], placeholderValues: [], combinationTags: [] }
  } catch (e) {
    console.error("[qr-template-store] Failed to parse stored JSON:", e)
    localStorage.setItem(BACKUP_KEY, raw)
    return { templates: [], placeholderValues: [], combinationTags: [] }
  }
}

export function saveStore(store: TemplateStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}
