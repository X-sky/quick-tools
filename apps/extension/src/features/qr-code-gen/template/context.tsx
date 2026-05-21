import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode
} from "react"

import type {
  CombinationTag,
  ImportResult,
  RecallResult,
  Result,
  Template,
  TemplateStore
} from "./types"
import {
  loadStore,
  saveStore,
  createEmptyStore,
  addValue,
  deleteValue,
  reorderValues,
  setDefaultValue as setDefaultValueInStore
} from "./storage"
import { parse } from "./parser"
import { exportToFile, importFromJson } from "./import-export"

interface TemplateContextType {
  store: TemplateStore
  createTemplate: (name: string, templateString: string) => Result<Template>
  updateTemplate: (
    id: string,
    patch: Partial<Pick<Template, "name" | "templateString">>
  ) => Result<Template>
  deleteTemplate: (id: string) => void
  activeTemplateId: string | null
  setActiveTemplateId: (id: string | null) => void
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
  selections: Record<string, string>
  setSelection: (placeholderName: string, value: string) => void
  clearSelections: () => void
  saveCombinationTag: (templateId: string, name: string) => Result<void>
  deleteCombinationTag: (templateId: string, name: string) => void
  recallCombinationTag: (templateId: string, name: string) => RecallResult
  exportAll: () => void
  importFromFile: (file: File) => Promise<ImportResult>
}

const TemplateContext = createContext<TemplateContextType | null>(null)

export function TemplateProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<TemplateStore>(createEmptyStore)
  const [activeTemplateId, setActiveTemplateIdRaw] = useState<string | null>(null)
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [initialized, setInitialized] = useState(false)

  // Wrap setActiveTemplateId to auto-apply default values
  const setActiveTemplateId = useCallback(
    (id: string | null) => {
      setActiveTemplateIdRaw(id)
      if (id) {
        const defaults: Record<string, string> = {}
        store.placeholderValues
          .filter((pv) => pv.templateId === id && pv.defaultValue)
          .forEach((pv) => {
            defaults[pv.placeholderName] = pv.defaultValue!
          })
        setSelections(defaults)
      } else {
        setSelections({})
      }
    },
    [store.placeholderValues]
  )

  // On mount: load store from localStorage
  useEffect(() => {
    setStore(loadStore())
    setInitialized(true)
  }, [])

  // On every store change after init: persist to localStorage
  useEffect(() => {
    if (initialized) {
      saveStore(store)
    }
  }, [store, initialized])

  const createTemplate = useCallback(
    (name: string, templateString: string): Result<Template> => {
      if (name.trim() === "") {
        return { ok: false, error: "模板名称不能为空" }
      }
      if (templateString.trim() === "") {
        return { ok: false, error: "模板内容不能为空" }
      }

      const duplicate = store.templates.find((t) => t.name === name)
      if (duplicate) {
        return { ok: false, error: "模板名称已存在" }
      }

      const parseResult = parse(templateString)
      if (parseResult.errors.length > 0) {
        return { ok: false, error: parseResult.errors[0].message }
      }

      const now = Date.now()
      const template: Template = {
        id: crypto.randomUUID(),
        name,
        templateString,
        createdAt: now,
        updatedAt: now
      }

      setStore((prev) => ({
        ...prev,
        templates: [...prev.templates, template]
      }))

      return { ok: true, value: template }
    },
    [store.templates]
  )

  const updateTemplate = useCallback(
    (
      id: string,
      patch: Partial<Pick<Template, "name" | "templateString">>
    ): Result<Template> => {
      const existing = store.templates.find((t) => t.id === id)
      if (!existing) {
        return { ok: false, error: "模板不存在" }
      }

      const newName = patch.name ?? existing.name
      const newTemplateString = patch.templateString ?? existing.templateString

      if (newName.trim() === "") {
        return { ok: false, error: "模板名称不能为空" }
      }
      if (newTemplateString.trim() === "") {
        return { ok: false, error: "模板内容不能为空" }
      }

      const duplicate = store.templates.find(
        (t) => t.name === newName && t.id !== id
      )
      if (duplicate) {
        return { ok: false, error: "模板名称已存在" }
      }

      if (patch.templateString !== undefined) {
        const parseResult = parse(newTemplateString)
        if (parseResult.errors.length > 0) {
          return { ok: false, error: parseResult.errors[0].message }
        }
      }

      const updated: Template = {
        ...existing,
        name: newName,
        templateString: newTemplateString,
        updatedAt: Date.now()
      }

      setStore((prev) => ({
        ...prev,
        templates: prev.templates.map((t) => (t.id === id ? updated : t))
      }))

      return { ok: true, value: updated }
    },
    [store.templates]
  )

  const deleteTemplate = useCallback((id: string) => {
    setStore((prev) => ({
      templates: prev.templates.filter((t) => t.id !== id),
      placeholderValues: prev.placeholderValues.filter(
        (pv) => pv.templateId !== id
      ),
      combinationTags: prev.combinationTags.filter(
        (ct) => ct.templateId !== id
      )
    }))
  }, [])

  const addPlaceholderValue = useCallback(
    (templateId: string, name: string, value: string): Result<void> => {
      if (value.trim() === "") {
        return { ok: false, error: "候选值不能为空" }
      }
      setStore((prev) => {
        const result = addValue(prev, templateId, name, value)
        return result.ok === true ? result.value : prev
      })
      return { ok: true, value: undefined }
    },
    []
  )

  const deletePlaceholderValue = useCallback(
    (templateId: string, name: string, value: string) => {
      setStore((prev) => deleteValue(prev, templateId, name, value))
    },
    []
  )

  const reorderPlaceholderValues = useCallback(
    (templateId: string, name: string, values: string[]) => {
      setStore((prev) => reorderValues(prev, templateId, name, values))
    },
    []
  )

  const setDefaultValue = useCallback(
    (templateId: string, placeholderName: string, defaultValue: string | undefined) => {
      setStore((prev) => setDefaultValueInStore(prev, templateId, placeholderName, defaultValue))
    },
    []
  )

  const setSelection = useCallback(
    (placeholderName: string, value: string) => {
      setSelections((prev) => ({ ...prev, [placeholderName]: value }))
    },
    []
  )

  const clearSelections = useCallback(() => {
    setSelections({})
  }, [])

  const saveCombinationTag = useCallback(
    (templateId: string, name: string): Result<void> => {
      const template = store.templates.find((t) => t.id === templateId)
      if (!template) {
        return { ok: false, error: "模板不存在" }
      }

      const parseResult = parse(template.templateString)
      const placeholderNames = parseResult.placeholderNames

      // Check all placeholders have selections
      for (const ph of placeholderNames) {
        if (!selections[ph]) {
          return { ok: false, error: "请先为所有占位符选择候选值" }
        }
      }

      const mapping: Record<string, string> = {}
      for (const ph of placeholderNames) {
        mapping[ph] = selections[ph]
      }

      const tag: CombinationTag = {
        templateId,
        name,
        mapping,
        createdAt: Date.now()
      }

      setStore((prev) => {
        const existingIdx = prev.combinationTags.findIndex(
          (ct) => ct.templateId === templateId && ct.name === name
        )
        if (existingIdx !== -1) {
          const updated = [...prev.combinationTags]
          updated[existingIdx] = tag
          return { ...prev, combinationTags: updated }
        }
        return {
          ...prev,
          combinationTags: [...prev.combinationTags, tag]
        }
      })

      return { ok: true, value: undefined }
    },
    [store.templates, selections]
  )

  const deleteCombinationTag = useCallback(
    (templateId: string, name: string) => {
      setStore((prev) => ({
        ...prev,
        combinationTags: prev.combinationTags.filter(
          (ct) => !(ct.templateId === templateId && ct.name === name)
        )
      }))
    },
    []
  )

  const recallCombinationTag = useCallback(
    (templateId: string, name: string): RecallResult => {
      const tag = store.combinationTags.find(
        (ct) => ct.templateId === templateId && ct.name === name
      )
      if (!tag) {
        return { ok: false, warnings: [] }
      }

      const template = store.templates.find((t) => t.id === templateId)
      if (!template) {
        return { ok: false, warnings: [] }
      }

      const parseResult = parse(template.templateString)
      const currentPlaceholders = new Set(parseResult.placeholderNames)
      const warnings: string[] = []

      // Check for stale placeholders in the tag
      const hasStale = Object.keys(tag.mapping).some(
        (ph) => !currentPlaceholders.has(ph)
      )
      if (hasStale) {
        warnings.push("组合标签包含已失效的占位符")
      }

      // Re-add missing values to candidate lists
      let updatedStore = store
      for (const [ph, value] of Object.entries(tag.mapping)) {
        if (!currentPlaceholders.has(ph)) continue
        const entry = updatedStore.placeholderValues.find(
          (pv) => pv.templateId === templateId && pv.placeholderName === ph
        )
        if (!entry || !entry.values.includes(value)) {
          const result = addValue(updatedStore, templateId, ph, value)
          if (result.ok) {
            updatedStore = result.value
          }
        }
      }

      if (updatedStore !== store) {
        setStore(updatedStore)
      }

      // Apply selections for current placeholders only
      const newSelections: Record<string, string> = {}
      parseResult.placeholderNames.forEach((ph) => {
        if (tag.mapping[ph] !== undefined) {
          newSelections[ph] = tag.mapping[ph]
        }
      })
      setSelections(newSelections)

      return { ok: true, warnings }
    },
    [store]
  )

  const exportAll = useCallback(() => {
    exportToFile(store)
  }, [store])

  const handleImportFromFile = useCallback(
    async (file: File): Promise<ImportResult> => {
      const text = await file.text()
      const result = importFromJson(text, store)
      if (result.success && result.mergedStore) {
        setStore(result.mergedStore)
      }
      return result
    },
    [store]
  )

  const value: TemplateContextType = {
    store,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    activeTemplateId,
    setActiveTemplateId,
    addPlaceholderValue,
    deletePlaceholderValue,
    reorderPlaceholderValues,
    setDefaultValue,
    selections,
    setSelection,
    clearSelections,
    saveCombinationTag,
    deleteCombinationTag,
    recallCombinationTag,
    exportAll,
    importFromFile: handleImportFromFile
  }

  return (
    <TemplateContext.Provider value={value}>
      {children}
    </TemplateContext.Provider>
  )
}

export function useTemplate(): TemplateContextType {
  const context = useContext(TemplateContext)
  if (!context) {
    throw new Error("useTemplate must be used within a TemplateProvider")
  }
  return context
}
