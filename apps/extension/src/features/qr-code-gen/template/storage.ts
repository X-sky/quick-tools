import type { PlaceholderValueEntry, Result, TemplateStore } from "./types"

const STORAGE_KEY = "qrcode-template-store"
const BACKUP_KEY = "qrcode-template-store.bak"

export function createEmptyStore(): TemplateStore {
  return { templates: [], placeholderValues: [], combinationTags: [] }
}

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
  if (raw === null) return createEmptyStore()

  try {
    const parsed = JSON.parse(raw)
    if (isValidStoreShape(parsed)) return parsed
    // Shape invalid — treat as corrupt
    console.error(
      "[qr-template-store] Stored value has invalid shape, resetting"
    )
    localStorage.setItem(BACKUP_KEY, raw)
    return createEmptyStore()
  } catch (e) {
    console.error("[qr-template-store] Failed to parse stored JSON:", e)
    localStorage.setItem(BACKUP_KEY, raw)
    return createEmptyStore()
  }
}

export function saveStore(store: TemplateStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function addValue(
  store: TemplateStore,
  templateId: string,
  placeholderName: string,
  value: string
): Result<TemplateStore> {
  if (value.trim() === "") {
    return { ok: false, error: "候选值不能为空" }
  }

  const idx = store.placeholderValues.findIndex(
    (e) => e.templateId === templateId && e.placeholderName === placeholderName
  )

  if (idx !== -1) {
    const entry = store.placeholderValues[idx]
    if (entry.values.includes(value)) {
      return { ok: true, value: store }
    }
    const updatedEntry: PlaceholderValueEntry = {
      ...entry,
      values: [...entry.values, value]
    }
    const updatedValues = [...store.placeholderValues]
    updatedValues[idx] = updatedEntry
    return { ok: true, value: { ...store, placeholderValues: updatedValues } }
  }

  const newEntry: PlaceholderValueEntry = {
    templateId,
    placeholderName,
    values: [value]
  }
  return {
    ok: true,
    value: { ...store, placeholderValues: [...store.placeholderValues, newEntry] }
  }
}

export function deleteValue(
  store: TemplateStore,
  templateId: string,
  placeholderName: string,
  value: string
): TemplateStore {
  const idx = store.placeholderValues.findIndex(
    (e) => e.templateId === templateId && e.placeholderName === placeholderName
  )

  if (idx === -1) return store

  const entry = store.placeholderValues[idx]
  const updatedEntry: PlaceholderValueEntry = {
    ...entry,
    values: entry.values.filter((v) => v !== value)
  }
  const updatedValues = [...store.placeholderValues]
  updatedValues[idx] = updatedEntry
  return { ...store, placeholderValues: updatedValues }
}

export function reorderValues(
  store: TemplateStore,
  templateId: string,
  placeholderName: string,
  values: string[]
): TemplateStore {
  const idx = store.placeholderValues.findIndex(
    (e) => e.templateId === templateId && e.placeholderName === placeholderName
  )

  if (idx === -1) return store

  const entry = store.placeholderValues[idx]
  const updatedEntry: PlaceholderValueEntry = {
    ...entry,
    values
  }
  const updatedValues = [...store.placeholderValues]
  updatedValues[idx] = updatedEntry
  return { ...store, placeholderValues: updatedValues }
}

export function setDefaultValue(
  store: TemplateStore,
  templateId: string,
  placeholderName: string,
  defaultValue: string | undefined
): TemplateStore {
  const idx = store.placeholderValues.findIndex(
    (e) => e.templateId === templateId && e.placeholderName === placeholderName
  )

  if (idx === -1) return store

  const entry = store.placeholderValues[idx]
  const updatedEntry: PlaceholderValueEntry = {
    ...entry,
    defaultValue
  }
  const updatedValues = [...store.placeholderValues]
  updatedValues[idx] = updatedEntry
  return { ...store, placeholderValues: updatedValues }
}
