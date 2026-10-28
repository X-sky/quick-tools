import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { calculateQrCapacity } from "../capacity"
import {
  addTagToHistoryItem,
  collectHistoryTags,
  filterHistoryItems,
  historyExportFilename,
  MAX_HISTORY_ITEMS,
  qrImageFilename,
  removeHistoryItem,
  removeTagFromHistoryItem,
  upsertHistoryItem
} from "../history-ops"
import type { HistoryItem } from "../types"

describe("upsertHistoryItem", () => {
  it("moves an existing entry to the top and keeps its tags", () => {
    const history: HistoryItem[] = [
      { content: "a", timestamp: 2, tags: [] },
      { content: "b", timestamp: 1, tags: ["work"] }
    ]
    const next = upsertHistoryItem(history, " b ", { timestamp: 3 })
    expect(next).toEqual([
      { content: "b", timestamp: 3, tags: ["work"] },
      { content: "a", timestamp: 2, tags: [] }
    ])
  })

  it("ignores blank content", () => {
    expect(upsertHistoryItem([], "   ")).toEqual([])
  })

  it("never exceeds the cap and never holds duplicates", () => {
    fc.assert(
      fc.property(fc.array(fc.string({ maxLength: 3 }), { maxLength: 120 }), (inputs) => {
        let history: HistoryItem[] = []
        for (const input of inputs) history = upsertHistoryItem(history, input)
        expect(history.length).toBeLessThanOrEqual(MAX_HISTORY_ITEMS)
        const contents = history.map((h) => h.content)
        expect(new Set(contents).size).toBe(contents.length)
      })
    )
  })
})

describe("tags and filters", () => {
  const history: HistoryItem[] = [
    { content: "Hello", timestamp: 3, tags: ["x"] },
    { content: "world", timestamp: 2, tags: [] },
    { content: "help", timestamp: 1 }
  ]

  it("adds, dedupes and removes tags", () => {
    let next = addTagToHistoryItem(history, "world", " y ")
    next = addTagToHistoryItem(next, "world", "y")
    expect(next[1]!.tags).toEqual(["y"])
    next = removeTagFromHistoryItem(next, "world", "y")
    expect(next[1]!.tags).toEqual([])
  })

  it("collects sorted distinct tags", () => {
    const tagged = addTagToHistoryItem(history, "help", "a")
    expect(collectHistoryTags(tagged)).toEqual(["a", "x"])
  })

  it("combines tag and case-insensitive query filters", () => {
    expect(filterHistoryItems(history, { query: "HEL" }).map((h) => h.content)).toEqual([
      "Hello",
      "help"
    ])
    expect(
      filterHistoryItems(history, { query: "hel", tag: "x" }).map((h) => h.content)
    ).toEqual(["Hello"])
    expect(filterHistoryItems(history, {})).toHaveLength(3)
  })

  it("removes by content", () => {
    expect(removeHistoryItem(history, "world").map((h) => h.content)).toEqual([
      "Hello",
      "help"
    ])
  })
})

describe("file names and capacity", () => {
  it("builds stable export and image file names", () => {
    expect(historyExportFilename(new Date(2026, 0, 5))).toBe(
      "qrcode-history-2026-01-05.json"
    )
    expect(qrImageFilename("https://a.b/c d", "png")).toBe("qr-https___a_b_c_d.png")
    expect(qrImageFilename("你好", "svg", "qr-template")).toBe("qr-template-你好.svg")
  })

  it("measures UTF-8 bytes against the level limit", () => {
    expect(calculateQrCapacity("你", "M").charCount).toBe(3)
    expect(calculateQrCapacity("a".repeat(2332), "M").isOverCapacity).toBe(true)
    expect(calculateQrCapacity("a".repeat(2332), "L").isOverCapacity).toBe(false)
  })
})
