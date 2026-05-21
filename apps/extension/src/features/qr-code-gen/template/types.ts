// Template data models for QR Template Generator
// Requirements: 2.1, 3.2, 4.1, 4.2, 6.1, 8.1, 9.2

export interface Template {
  id: string // crypto.randomUUID()
  name: string // user-editable, unique within store
  templateString: string // contains {placeholder} tokens
  createdAt: number // Date.now() at creation
  updatedAt: number // Date.now() at last modification
}

export interface PlaceholderValueEntry {
  templateId: string
  placeholderName: string
  values: string[] // ordered, distinct
  defaultValue?: string // auto-selected when recalling or first load
}

export interface CombinationTag {
  templateId: string
  name: string // unique per templateId
  mapping: Record<string, string> // placeholderName → value
  createdAt: number
}

export interface TemplateStore {
  templates: Template[]
  placeholderValues: PlaceholderValueEntry[]
  combinationTags: CombinationTag[]
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

export interface RecallResult {
  ok: boolean
  warnings: string[] // e.g. "组合标签包含已失效的占位符"
}

export interface ExportSchema {
  version: number
  templates: Template[]
  placeholderValues: PlaceholderValueEntry[]
  combinationTags: CombinationTag[]
}

export interface ImportResult {
  success: boolean
  added: { templates: number; values: number; tags: number }
  error?: string
  mergedStore?: TemplateStore
}

// Parser types

export interface Segment {
  type: "literal" | "placeholder"
  value: string // literal text or placeholder name
}

export interface ParseError {
  offset: number // 1-based character offset
  message: string
}

export interface ParseResult {
  segments: Segment[]
  placeholderNames: string[] // deduplicated, first-occurrence order
  errors: ParseError[]
}
