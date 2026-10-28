import { parse } from "./parser"
import type { Template } from "./types"

export const MAX_TEMPLATE_NAME_LENGTH = 50
export const MAX_TEMPLATE_CONTENT_LENGTH = 10000
export const MAX_COMBINATION_TAG_NAME_LENGTH = 30

/** Candidate values and defaults collected while authoring a template. */
export interface TemplateDraft {
  values: Record<string, string[]>
  defaults: Record<string, string>
}

export function createEmptyDraft(): TemplateDraft {
  return { values: {}, defaults: {} }
}

/**
 * Validate name + content for create (no `editingId`) or update. Returns the
 * trimmed values on success, otherwise the first user-facing error.
 */
export function validateTemplateInput(
  name: string,
  templateString: string,
  templates: Pick<Template, "id" | "name">[],
  editingId?: string
):
  | { ok: true; name: string; templateString: string }
  | { ok: false; error: string } {
  const trimmedName = name.trim()
  const trimmedString = templateString.trim()
  if (!trimmedName) return { ok: false, error: "模板名称不能为空" }
  if (trimmedName.length > MAX_TEMPLATE_NAME_LENGTH) {
    return { ok: false, error: `模板名称不能超过${MAX_TEMPLATE_NAME_LENGTH}个字符` }
  }
  if (!trimmedString) return { ok: false, error: "模板内容不能为空" }
  if (trimmedString.length > MAX_TEMPLATE_CONTENT_LENGTH) {
    return {
      ok: false,
      error: `模板内容不能超过${MAX_TEMPLATE_CONTENT_LENGTH}个字符`
    }
  }
  if (templates.some((t) => t.name === trimmedName && t.id !== editingId)) {
    return { ok: false, error: "模板名称已存在" }
  }
  const parsed = parse(trimmedString)
  if (parsed.errors.length > 0) {
    return { ok: false, error: parsed.errors[0]!.message }
  }
  return { ok: true, name: trimmedName, templateString: trimmedString }
}

/**
 * Turn the query string of a URL-like template (`?k=v&k2=v2`) into
 * placeholders (`?k={k}&k2={k2}`). Each original value becomes a candidate
 * and, if none is set yet, the default. Returns null when there is no `?`.
 */
export function quickSplitQuery(
  templateString: string,
  draft: TemplateDraft
): { templateString: string; draft: TemplateDraft } | null {
  const qIdx = templateString.indexOf("?")
  if (qIdx === -1) return null

  const base = templateString.slice(0, qIdx + 1)
  const pairs = templateString
    .slice(qIdx + 1)
    .split("&")
    .filter(Boolean)
  const values: Record<string, string[]> = { ...draft.values }
  const defaults: Record<string, string> = { ...draft.defaults }
  const parts: string[] = []

  for (const pair of pairs) {
    const eqIdx = pair.indexOf("=")
    if (eqIdx === -1) {
      parts.push(pair)
      continue
    }
    const key = pair.slice(0, eqIdx)
    const value = pair.slice(eqIdx + 1)
    const safeName = key.replace(/[^A-Za-z0-9_-]/g, "_")
    parts.push(`${safeName}={${safeName}}`)
    if (value) {
      const existing = values[safeName] ?? []
      if (!existing.includes(value)) values[safeName] = [...existing, value]
      if (!defaults[safeName]) defaults[safeName] = value
    }
  }

  return {
    templateString: base + parts.join("&"),
    draft: { values, defaults }
  }
}

/**
 * Replace every `{placeholder}` with its default (or first candidate) and
 * drop the placeholder from the draft. Returns null when there is no value
 * to fix it to.
 */
export function fixPlaceholderAsText(
  templateString: string,
  placeholder: string,
  draft: TemplateDraft
): { templateString: string; draft: TemplateDraft } | null {
  const fixValue =
    draft.defaults[placeholder] || (draft.values[placeholder] ?? [])[0] || ""
  if (!fixValue) return null
  const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const next = templateString.replace(
    new RegExp(`\\{${escaped}\\}`, "g"),
    () => fixValue
  )
  const values = { ...draft.values }
  const defaults = { ...draft.defaults }
  delete values[placeholder]
  delete defaults[placeholder]
  return { templateString: next, draft: { values, defaults } }
}

export function addDraftValue(
  draft: TemplateDraft,
  placeholder: string,
  value: string
): TemplateDraft {
  const trimmed = value.trim()
  const existing = draft.values[placeholder] ?? []
  if (!trimmed || existing.includes(trimmed)) return draft
  return {
    ...draft,
    values: { ...draft.values, [placeholder]: [...existing, trimmed] }
  }
}

export function removeDraftValue(
  draft: TemplateDraft,
  placeholder: string,
  value: string
): TemplateDraft {
  const remaining = (draft.values[placeholder] ?? []).filter((v) => v !== value)
  const defaults = { ...draft.defaults }
  if (defaults[placeholder] === value) {
    if (remaining[0]) defaults[placeholder] = remaining[0]
    else delete defaults[placeholder]
  }
  return { values: { ...draft.values, [placeholder]: remaining }, defaults }
}

export function setDraftDefault(
  draft: TemplateDraft,
  placeholder: string,
  value: string
): TemplateDraft {
  return { ...draft, defaults: { ...draft.defaults, [placeholder]: value } }
}

/**
 * Seed the authoring draft from values already stored for a template, so the
 * edit form starts with the same candidates the user saved before.
 */
export function draftFromStoredValues(
  entries: { placeholderName: string; values: string[]; defaultValue?: string }[]
): TemplateDraft {
  const draft = createEmptyDraft()
  for (const entry of entries) {
    draft.values[entry.placeholderName] = [...entry.values]
    if (entry.defaultValue) draft.defaults[entry.placeholderName] = entry.defaultValue
  }
  return draft
}
