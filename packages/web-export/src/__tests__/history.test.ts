import { describe, expect, it } from "vitest"

import {
  addExportHistoryItem,
  buildPageFilename,
  filterExportHistory,
  MAX_EXPORT_HISTORY,
  parseBatchUrls,
  removeExportHistoryItem
} from "../history"
import type { ExportHistoryItem } from "../history"

const item = (n: number, format: ExportHistoryItem["format"] = "pdf"): ExportHistoryItem => ({
  url: `https://a.com/${n}`,
  title: `Title ${n}`,
  format,
  timestamp: n,
  content: "# x"
})

describe("export history", () => {
  it("replaces a repeat export of the same url and format", () => {
    let h = addExportHistoryItem([], item(1))
    h = addExportHistoryItem(h, item(2))
    h = addExportHistoryItem(h, { ...item(1), timestamp: 9 })
    expect(h.map((i) => i.timestamp)).toEqual([9, 2])
    h = addExportHistoryItem(h, item(1, "png"))
    expect(h).toHaveLength(3)
  })

  it("caps the list", () => {
    let h: ExportHistoryItem[] = []
    for (let n = 0; n < MAX_EXPORT_HISTORY + 5; n++) h = addExportHistoryItem(h, item(n))
    expect(h).toHaveLength(MAX_EXPORT_HISTORY)
  })

  it("removes the exact item and filters by title or url", () => {
    const h = [item(1), item(2), item(12)]
    expect(removeExportHistoryItem(h, item(2)).map((i) => i.timestamp)).toEqual([1, 12])
    expect(filterExportHistory(h, "TITLE 1").map((i) => i.timestamp)).toEqual([1, 12])
    expect(filterExportHistory(h, "a.com/2")).toHaveLength(1)
  })
})

describe("parseBatchUrls / buildPageFilename", () => {
  it("skips blank lines and flags non-http lines", () => {
    expect(parseBatchUrls("https://a.com\n\n ftp://x \nhttp://b.com")).toEqual([
      { line: 1, content: "https://a.com", valid: true, error: undefined },
      {
        line: 3,
        content: "ftp://x",
        valid: false,
        error: "URL 格式无效，必须以 http:// 或 https:// 开头"
      },
      { line: 4, content: "http://b.com", valid: true, error: undefined }
    ])
  })

  it("numbers paged files only when there are several", () => {
    expect(buildPageFilename("doc", 0, 1)).toBe("doc.png")
    expect(buildPageFilename("doc", 2, 12)).toBe("doc-p03.png")
  })
})
