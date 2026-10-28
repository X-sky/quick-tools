import { describe, expect, it } from "vitest"

import {
  addDraftValue,
  createEmptyDraft,
  draftFromStoredValues,
  fixPlaceholderAsText,
  quickSplitQuery,
  removeDraftValue,
  validateTemplateInput
} from "../template/authoring"

describe("validateTemplateInput", () => {
  const templates = [{ id: "1", name: "A" }]

  it("trims and accepts valid input", () => {
    expect(validateTemplateInput(" B ", " x{y} ", templates)).toEqual({
      ok: true,
      name: "B",
      templateString: "x{y}"
    })
  })

  it("rejects duplicates except for the template being edited", () => {
    expect(validateTemplateInput("A", "x", templates)).toEqual({
      ok: false,
      error: "模板名称已存在"
    })
    expect(validateTemplateInput("A", "x", templates, "1").ok).toBe(true)
  })

  it("enforces length limits and parse errors", () => {
    expect(validateTemplateInput("n".repeat(51), "x", []).ok).toBe(false)
    expect(validateTemplateInput("n", "x".repeat(10001), []).ok).toBe(false)
    expect(validateTemplateInput("n", "{bad", []).ok).toBe(false)
  })
})

describe("quickSplitQuery", () => {
  it("turns query pairs into placeholders with candidates and defaults", () => {
    const result = quickSplitQuery(
      "https://a.com/p?id=1&lang=zh-CN&flag",
      createEmptyDraft()
    )
    expect(result).toEqual({
      templateString: "https://a.com/p?id={id}&lang={lang}&flag",
      draft: {
        values: { id: ["1"], lang: ["zh-CN"] },
        defaults: { id: "1", lang: "zh-CN" }
      }
    })
  })

  it("returns null without a query string", () => {
    expect(quickSplitQuery("https://a.com", createEmptyDraft())).toBeNull()
  })
})

describe("draft helpers", () => {
  it("fixes a placeholder back to its default text", () => {
    const draft = { values: { id: ["1", "2"] }, defaults: { id: "2" } }
    expect(fixPlaceholderAsText("a={id}&b={id}", "id", draft)).toEqual({
      templateString: "a=2&b=2",
      draft: { values: {}, defaults: {} }
    })
    expect(fixPlaceholderAsText("{x}", "x", createEmptyDraft())).toBeNull()
  })

  it("keeps a sensible default when the default value is removed", () => {
    let draft = addDraftValue(createEmptyDraft(), "id", " 1 ")
    draft = addDraftValue(draft, "id", "2")
    draft = { ...draft, defaults: { id: "1" } }
    expect(removeDraftValue(draft, "id", "1")).toEqual({
      values: { id: ["2"] },
      defaults: { id: "2" }
    })
  })

  it("seeds a draft from stored values", () => {
    expect(
      draftFromStoredValues([
        { placeholderName: "id", values: ["1"], defaultValue: "1" },
        { placeholderName: "x", values: [] }
      ])
    ).toEqual({ values: { id: ["1"], x: [] }, defaults: { id: "1" } })
  })
})
