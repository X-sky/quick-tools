import { useCallback, useEffect, useRef, useState } from "react"

import { getPlatform } from "@quick-tools/platform"
import type { PlatformResult } from "@quick-tools/platform"
import {
  addValue as sharedAddValue,
  buildExportSchema,
  createEmptyStore,
  deleteValue as sharedDeleteValue,
  importFromJson,
  parse,
  reorderValues as sharedReorderValues,
  setDefaultValue as sharedSetDefaultValue
} from "@quick-tools/qr-code-gen"
import type {
  CombinationTag,
  ImportResult,
  RecallResult,
  Result,
  Template,
  TemplateStore
} from "@quick-tools/qr-code-gen"

const STORAGE_KEY = "qr-template-store"
const STORAGE_KEY_BAK = "qr-template-store.bak"
const DEBOUNCE_MS = 1000

function isValidStoreShape(data: unknown): data is TemplateStore {
  if (data === null || typeof data !== "object") return false
  const obj = data as Record<string, unknown>
  return (
    Array.isArray(obj.templates) &&
    Array.isArray(obj.placeholderValues) &&
    Array.isArray(obj.combinationTags)
  )
}

export interface UseTemplateStoreReturn {
  store: TemplateStore
  initialized: boolean

  // Template CRUD
  createTemplate: (name: string, templateString: string) => Result<Template>
  updateTemplate: (
    id: string,
    patch: Partial<Pick<Template, "name" | "templateString">>
  ) => Result<Template>
  deleteTemplate: (id: string) => void

  // Active template
  activeTemplateId: string | null
  setActiveTemplateId: (id: string | null) => void

  // Placeholder values
  addPlaceholderValue: (
    templateId: string,
    name: string,
    value: string
  ) => Result<void>
  deletePlaceholderValue: (
    templateId: string,
    name: string,
    value: string
  ) => void
  reorderPlaceholderValues: (
    templateId: string,
    name: string,
    values: string[]
  ) => void
  setDefaultValue: (
    templateId: string,
    placeholderName: string,
    defaultValue: string | undefined
  ) => void

  // Selections (ephemeral)
  selections: Record<string, string>
  setSelection: (placeholderName: string, value: string) => void
  clearSelections: () => void

  // Combination tags
  saveCombinationTag: (templateId: string, name: string) => Result<void>
  deleteCombinationTag: (templateId: string, name: string) => void
  recallCombinationTag: (templateId: string, name: string) => RecallResult

  // Import/Export
  exportToJson: () => string
  importFromJsonString: (json: string) => ImportResult
}

export function useTemplateStore(): UseTemplateStoreReturn {
  const [store, setStore] = useState<TemplateStore>(createEmptyStore())
  const [initialized, setInitialized] = useState(false)
  const [activeTemplateId, setActiveTemplateIdState] = useState<string | null>(
    null
  )
  const [selections, setSelections] = useState<Record<string, string>>({})

  const storeRef = useRef(store)
  storeRef.current = store

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initializedRef = useRef(false)

  // Persist store with debounce
  const persistStore = useCallback((newStore: TemplateStore) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(async () => {
      const platform = getPlatform()
      const result: PlatformResult<void> = await platform.storage.set(
        STORAGE_KEY,
        newStore
      )
      if (!result.ok) {
        console.error(
          "[useTemplateStore] persist failed:",
          result.error.message
        )
      }
    }, DEBOUNCE_MS)
  }, [])

  // Update store and trigger persistence
  const updateStore = useCallback(
    (newStore: TemplateStore) => {
      setStore(newStore)
      storeRef.current = newStore
      if (initializedRef.current) {
        persistStore(newStore)
      }
    },
    [persistStore]
  )

  // Initialize: load from StorageAdapter
  useEffect(() => {
    async function init() {
      const platform = getPlatform()
      const result = await platform.storage.get<TemplateStore>(STORAGE_KEY)

      if (!result.ok) {
        console.error(
          "[useTemplateStore] load failed:",
          result.error.message
        )
        setInitialized(true)
        initializedRef.current = true
        return
      }

      const data = result.value
      if (data === null) {
        setInitialized(true)
        initializedRef.current = true
        return
      }

      if (!isValidStoreShape(data)) {
        console.error(
          "[useTemplateStore] invalid store shape, backing up to .bak"
        )
        await platform.storage.set(STORAGE_KEY_BAK, data)
        setInitialized(true)
        initializedRef.current = true
        return
      }

      setStore(data)
      storeRef.current = data
      setInitialized(true)
      initializedRef.current = true
    }

    void init()
  }, [])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // setActiveTemplateId with auto-apply default values
  const setActiveTemplateId = useCallback(
    (id: string | null) => {
      setActiveTemplateIdState(id)

      if (id === null) {
        setSelections({})
        return
      }

      // Auto-apply default values for the template's placeholders
      const template = storeRef.current.templates.find((t) => t.id === id)
      if (!template) {
        setSelections({})
        return
      }

      const { placeholderNames } = parse(template.templateString)
      const newSelections: Record<string, string> = {}

      for (const name of placeholderNames) {
        const entry = storeRef.current.placeholderValues.find(
          (pv) => pv.templateId === id && pv.placeholderName === name
        )
        if (entry?.defaultValue) {
          newSelections[name] = entry.defaultValue
        }
      }

      setSelections(newSelections)
    },
    []
  )

  // Template CRUD
  const createTemplate = useCallback(
    (name: string, templateString: string): Result<Template> => {
      const trimmedName = name.trim()
      const trimmedString = templateString.trim()

      if (!trimmedName) {
        return { ok: false, error: "模板名称不能为空" }
      }

      if (trimmedName.length > 50) {
        return { ok: false, error: "模板名称不能超过50个字符" }
      }

      if (!trimmedString) {
        return { ok: false, error: "模板内容不能为空" }
      }

      if (trimmedString.length > 10000) {
        return { ok: false, error: "模板内容不能超过10000个字符" }
      }

      const duplicate = storeRef.current.templates.find(
        (t) => t.name === trimmedName
      )
      if (duplicate) {
        return { ok: false, error: "模板名称已存在" }
      }

      const parseResult = parse(trimmedString)
      if (parseResult.errors.length > 0) {
        return { ok: false, error: parseResult.errors[0]!.message }
      }

      const now = Date.now()
      const template: Template = {
        id: crypto.randomUUID(),
        name: trimmedName,
        templateString: trimmedString,
        createdAt: now,
        updatedAt: now
      }

      const newStore: TemplateStore = {
        ...storeRef.current,
        templates: [...storeRef.current.templates, template]
      }
      updateStore(newStore)

      return { ok: true, value: template }
    },
    [updateStore]
  )

  const updateTemplate = useCallback(
    (
      id: string,
      patch: Partial<Pick<Template, "name" | "templateString">>
    ): Result<Template> => {
      const existing = storeRef.current.templates.find((t) => t.id === id)
      if (!existing) {
        return { ok: false, error: "模板不存在" }
      }

      const newName = patch.name !== undefined ? patch.name.trim() : existing.name
      const newString =
        patch.templateString !== undefined
          ? patch.templateString.trim()
          : existing.templateString

      if (!newName) {
        return { ok: false, error: "模板名称不能为空" }
      }

      if (newName.length > 50) {
        return { ok: false, error: "模板名称不能超过50个字符" }
      }

      if (!newString) {
        return { ok: false, error: "模板内容不能为空" }
      }

      if (newString.length > 10000) {
        return { ok: false, error: "模板内容不能超过10000个字符" }
      }

      const duplicate = storeRef.current.templates.find(
        (t) => t.name === newName && t.id !== id
      )
      if (duplicate) {
        return { ok: false, error: "模板名称已存在" }
      }

      const parseResult = parse(newString)
      if (parseResult.errors.length > 0) {
        return { ok: false, error: parseResult.errors[0]!.message }
      }

      const updated: Template = {
        ...existing,
        name: newName,
        templateString: newString,
        updatedAt: Date.now()
      }

      const newStore: TemplateStore = {
        ...storeRef.current,
        templates: storeRef.current.templates.map((t) =>
          t.id === id ? updated : t
        )
      }
      updateStore(newStore)

      return { ok: true, value: updated }
    },
    [updateStore]
  )

  const deleteTemplate = useCallback(
    (id: string) => {
      const newStore: TemplateStore = {
        templates: storeRef.current.templates.filter((t) => t.id !== id),
        placeholderValues: storeRef.current.placeholderValues.filter(
          (pv) => pv.templateId !== id
        ),
        combinationTags: storeRef.current.combinationTags.filter(
          (ct) => ct.templateId !== id
        )
      }
      updateStore(newStore)

      if (activeTemplateId === id) {
        setActiveTemplateIdState(null)
        setSelections({})
      }
    },
    [updateStore, activeTemplateId]
  )

  // Placeholder value operations
  const addPlaceholderValue = useCallback(
    (templateId: string, name: string, value: string): Result<void> => {
      const result = sharedAddValue(storeRef.current, templateId, name, value)
      if (!result.ok) {
        return { ok: false, error: result.error }
      }
      updateStore(result.value)
      return { ok: true, value: undefined }
    },
    [updateStore]
  )

  const deletePlaceholderValue = useCallback(
    (templateId: string, name: string, value: string) => {
      const newStore = sharedDeleteValue(
        storeRef.current,
        templateId,
        name,
        value
      )
      updateStore(newStore)
    },
    [updateStore]
  )

  const reorderPlaceholderValues = useCallback(
    (templateId: string, name: string, values: string[]) => {
      const newStore = sharedReorderValues(
        storeRef.current,
        templateId,
        name,
        values
      )
      updateStore(newStore)
    },
    [updateStore]
  )

  const setDefaultValueFn = useCallback(
    (
      templateId: string,
      placeholderName: string,
      defaultValue: string | undefined
    ) => {
      const newStore = sharedSetDefaultValue(
        storeRef.current,
        templateId,
        placeholderName,
        defaultValue
      )
      updateStore(newStore)
    },
    [updateStore]
  )

  // Selections (ephemeral)
  const setSelection = useCallback(
    (placeholderName: string, value: string) => {
      setSelections((prev) => ({ ...prev, [placeholderName]: value }))
    },
    []
  )

  const clearSelections = useCallback(() => {
    setSelections({})
  }, [])

  // Combination tags
  const saveCombinationTag = useCallback(
    (templateId: string, name: string): Result<void> => {
      const trimmedName = name.trim()

      if (!trimmedName) {
        return { ok: false, error: "组合标签名称不能为空" }
      }

      if (trimmedName.length > 30) {
        return { ok: false, error: "组合标签名称不能超过30个字符" }
      }

      const template = storeRef.current.templates.find(
        (t) => t.id === templateId
      )
      if (!template) {
        return { ok: false, error: "模板不存在" }
      }

      const { placeholderNames } = parse(template.templateString)

      // Check all placeholders have selections
      for (const ph of placeholderNames) {
        if (!selections[ph]) {
          return { ok: false, error: "请先为所有占位符选择候选值" }
        }
      }

      const mapping: Record<string, string> = {}
      for (const ph of placeholderNames) {
        mapping[ph] = selections[ph]!
      }

      const tag: CombinationTag = {
        templateId,
        name: trimmedName,
        mapping,
        createdAt: Date.now()
      }

      // Check for existing tag with same name (overwrite)
      const existingIdx = storeRef.current.combinationTags.findIndex(
        (ct) => ct.templateId === templateId && ct.name === trimmedName
      )

      let newTags: CombinationTag[]
      if (existingIdx !== -1) {
        newTags = [...storeRef.current.combinationTags]
        newTags[existingIdx] = tag
      } else {
        newTags = [...storeRef.current.combinationTags, tag]
      }

      const newStore: TemplateStore = {
        ...storeRef.current,
        combinationTags: newTags
      }
      updateStore(newStore)

      return { ok: true, value: undefined }
    },
    [updateStore, selections]
  )

  const deleteCombinationTag = useCallback(
    (templateId: string, name: string) => {
      const newStore: TemplateStore = {
        ...storeRef.current,
        combinationTags: storeRef.current.combinationTags.filter(
          (ct) => !(ct.templateId === templateId && ct.name === name)
        )
      }
      updateStore(newStore)
    },
    [updateStore]
  )

  const recallCombinationTag = useCallback(
    (templateId: string, name: string): RecallResult => {
      const tag = storeRef.current.combinationTags.find(
        (ct) => ct.templateId === templateId && ct.name === name
      )
      if (!tag) {
        return { ok: false, warnings: ["组合标签不存在"] }
      }

      const template = storeRef.current.templates.find(
        (t) => t.id === templateId
      )
      if (!template) {
        return { ok: false, warnings: ["模板不存在"] }
      }

      const { placeholderNames } = parse(template.templateString)
      const warnings: string[] = []
      const newSelections: Record<string, string> = {}
      let currentStore = storeRef.current

      // Check for stale placeholders in the tag
      const stalePlaceholders = Object.keys(tag.mapping).filter(
        (ph) => !placeholderNames.includes(ph)
      )
      if (stalePlaceholders.length > 0) {
        warnings.push("组合标签包含已失效的占位符")
      }

      // Apply recall only to still-valid placeholders
      for (const ph of placeholderNames) {
        const tagValue = tag.mapping[ph]
        if (tagValue === undefined) continue

        newSelections[ph] = tagValue

        // Re-add missing value to candidate list
        const entry = currentStore.placeholderValues.find(
          (pv) => pv.templateId === templateId && pv.placeholderName === ph
        )
        if (!entry || !entry.values.includes(tagValue)) {
          const result = sharedAddValue(
            currentStore,
            templateId,
            ph,
            tagValue
          )
          if (result.ok) {
            currentStore = result.value
          }
        }
      }

      // Update store if values were re-added
      if (currentStore !== storeRef.current) {
        updateStore(currentStore)
      }

      setSelections((prev) => ({ ...prev, ...newSelections }))

      return { ok: true, warnings }
    },
    [updateStore]
  )

  // Import/Export
  const exportToJson = useCallback((): string => {
    const schema = buildExportSchema(storeRef.current)
    return JSON.stringify(schema, null, 2)
  }, [])

  const importFromJsonString = useCallback(
    (json: string): ImportResult => {
      const result = importFromJson(json, storeRef.current)
      if (result.success && result.mergedStore) {
        updateStore(result.mergedStore)
      }
      return result
    },
    [updateStore]
  )

  return {
    store,
    initialized,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    activeTemplateId,
    setActiveTemplateId,
    addPlaceholderValue,
    deletePlaceholderValue,
    reorderPlaceholderValues,
    setDefaultValue: setDefaultValueFn,
    selections,
    setSelection,
    clearSelections,
    saveCombinationTag,
    deleteCombinationTag,
    recallCombinationTag,
    exportToJson,
    importFromJsonString
  }
}
