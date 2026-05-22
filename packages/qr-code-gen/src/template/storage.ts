// Template storage operations — pure functions, zero platform dependencies
// Requirements: 1.4, 1.6, 6.1–6.10

import type { PlaceholderValueEntry, Result, TemplateStore } from "./types"

const MAX_VALUES_PER_LIST = 200
const MAX_VALUE_LENGTH = 1000

export function createEmptyStore(): TemplateStore {
  return { templates: [], placeholderValues: [], combinationTags: [] }
}

export function addValue(
  store: TemplateStore,
  templateId: string,
  placeholderName: string,
  value: string
): Result<TemplateStore> {
  const trimmed = value.trim()

  if (trimmed === "") {
    return { ok: false, error: "候选值不能为空" }
  }

  if (trimmed.length > MAX_VALUE_LENGTH) {
    return { ok: false, error: "候选值长度不能超过 1000 个字符" }
  }

  const idx = store.placeholderValues.findIndex(
    (e) => e.templateId === templateId && e.placeholderName === placeholderName
  )

  if (idx !== -1) {
    const entry = store.placeholderValues[idx]!

    if (entry.values.includes(trimmed)) {
      return { ok: true, value: store }
    }

    if (entry.values.length >= MAX_VALUES_PER_LIST) {
      return { ok: false, error: "候选值数量已达上限（200）" }
    }

    const updatedEntry: PlaceholderValueEntry = {
      ...entry,
      values: [...entry.values, trimmed]
    }
    const updatedValues = [...store.placeholderValues]
    updatedValues[idx] = updatedEntry
    return { ok: true, value: { ...store, placeholderValues: updatedValues } }
  }

  const newEntry: PlaceholderValueEntry = {
    templateId,
    placeholderName,
    values: [trimmed]
  }
  return {
    ok: true,
    value: {
      ...store,
      placeholderValues: [...store.placeholderValues, newEntry]
    }
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

  const entry = store.placeholderValues[idx]!
  const updatedEntry: PlaceholderValueEntry = {
    ...entry,
    values: entry.values.filter((v) => v !== value),
    defaultValue:
      entry.defaultValue === value ? undefined : entry.defaultValue
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

  const entry = store.placeholderValues[idx]!
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

  const entry = store.placeholderValues[idx]!
  const updatedEntry: PlaceholderValueEntry = {
    ...entry,
    defaultValue
  }
  const updatedValues = [...store.placeholderValues]
  updatedValues[idx] = updatedEntry
  return { ...store, placeholderValues: updatedValues }
}
