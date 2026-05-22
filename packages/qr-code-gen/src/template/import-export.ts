import type { ExportSchema, ImportResult, TemplateStore } from "./types"

const CURRENT_VERSION = 1

export function buildExportSchema(store: TemplateStore): ExportSchema {
  return {
    version: CURRENT_VERSION,
    templates: store.templates,
    placeholderValues: store.placeholderValues,
    combinationTags: store.combinationTags
  }
}

export function validateExportSchema(data: unknown): data is ExportSchema {
  if (data === null || typeof data !== "object") return false
  const obj = data as Record<string, unknown>
  if (typeof obj.version !== "number") return false
  if (!Array.isArray(obj.templates)) return false
  if (!Array.isArray(obj.placeholderValues)) return false
  if (!Array.isArray(obj.combinationTags)) return false
  return true
}

export function mergeStores(
  local: TemplateStore,
  imported: ExportSchema
): TemplateStore {
  // Merge templates: match by id, keep newer updatedAt (local wins on tie)
  const localTemplateMap = new Map(
    local.templates.map((t) => [t.id, t])
  )
  const mergedTemplates = [...local.templates]

  for (const imp of imported.templates) {
    const existing = localTemplateMap.get(imp.id)
    if (existing) {
      if (imp.updatedAt > existing.updatedAt) {
        const idx = mergedTemplates.findIndex((t) => t.id === imp.id)
        mergedTemplates[idx] = imp
      }
    } else {
      mergedTemplates.push(imp)
    }
  }

  // Merge placeholderValues: union per (templateId, placeholderName)
  // local order first, then imported values not present
  const pvKey = (templateId: string, placeholderName: string) =>
    `${templateId}::${placeholderName}`

  const localPvMap = new Map(
    local.placeholderValues.map((pv) => [
      pvKey(pv.templateId, pv.placeholderName),
      pv
    ])
  )
  const mergedPvs = [...local.placeholderValues]

  for (const imp of imported.placeholderValues) {
    const key = pvKey(imp.templateId, imp.placeholderName)
    const existing = localPvMap.get(key)
    if (existing) {
      const localSet = new Set(existing.values)
      const newValues = imp.values.filter((v) => !localSet.has(v))
      if (newValues.length > 0) {
        const idx = mergedPvs.findIndex(
          (pv) =>
            pv.templateId === existing.templateId &&
            pv.placeholderName === existing.placeholderName
        )
        mergedPvs[idx] = {
          ...existing,
          values: [...existing.values, ...newValues]
        }
      }
    } else {
      mergedPvs.push(imp)
    }
  }

  // Merge combinationTags: match by (templateId, name), keep newer createdAt
  // Append unmatched imported tags
  const tagKey = (templateId: string, name: string) =>
    `${templateId}::${name}`

  const localTagMap = new Map(
    local.combinationTags.map((t) => [tagKey(t.templateId, t.name), t])
  )
  const mergedTags = [...local.combinationTags]

  for (const imp of imported.combinationTags) {
    const key = tagKey(imp.templateId, imp.name)
    const existing = localTagMap.get(key)
    if (existing) {
      if (imp.createdAt > existing.createdAt) {
        const idx = mergedTags.findIndex(
          (t) =>
            t.templateId === existing.templateId && t.name === existing.name
        )
        mergedTags[idx] = imp
      }
    } else {
      mergedTags.push(imp)
    }
  }

  return {
    templates: mergedTemplates,
    placeholderValues: mergedPvs,
    combinationTags: mergedTags
  }
}

export function importFromJson(
  json: string,
  currentStore: TemplateStore
): ImportResult {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return {
      success: false,
      added: { templates: 0, values: 0, tags: 0 },
      error: "文件内容不是有效的 JSON 格式"
    }
  }

  if (!validateExportSchema(data)) {
    return {
      success: false,
      added: { templates: 0, values: 0, tags: 0 },
      error: "文件格式不正确"
    }
  }

  if (data.version > CURRENT_VERSION) {
    return {
      success: false,
      added: { templates: 0, values: 0, tags: 0 },
      error: "文件版本过新，请升级应用后再导入"
    }
  }

  const mergedStore = mergeStores(currentStore, data)

  const addedTemplates =
    mergedStore.templates.length - currentStore.templates.length
  const addedTags =
    mergedStore.combinationTags.length - currentStore.combinationTags.length

  // Count newly added values across all placeholder value entries
  const currentValueCount = currentStore.placeholderValues.reduce(
    (sum, pv) => sum + pv.values.length,
    0
  )
  const mergedValueCount = mergedStore.placeholderValues.reduce(
    (sum, pv) => sum + pv.values.length,
    0
  )
  const addedValues = mergedValueCount - currentValueCount

  return {
    success: true,
    added: {
      templates: addedTemplates,
      values: addedValues,
      tags: addedTags
    },
    mergedStore
  }
}
