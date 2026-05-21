import { describe, it, expect } from "vitest"

import {
  sanitizeFileName,
  formatTimestamp,
  buildFilenameBase,
  buildDownloadFilename
} from "../filename"
import type { MarkdownExportSource } from "../types"

describe("sanitizeFileName edge cases", () => {
  it("returns empty string for empty input", () => {
    expect(sanitizeFileName("")).toBe("")
  })

  it("returns empty string for input with only forbidden characters", () => {
    expect(sanitizeFileName("<>:\"/\\|?*")).toBe("")
  })
})

describe("buildFilenameBase hostname fallback", () => {
  it("uses hostname when title is empty", () => {
    const source: MarkdownExportSource = {
      title: "",
      url: "https://example.com/page",
      capturedAt: "2024-01-15T10:30:45Z",
      markdown: "",
      plainText: ""
    }
    const result = buildFilenameBase(source)
    expect(result).toContain("example.com")
  })

  it("uses 'web-export' fallback when both title and hostname are empty", () => {
    const source: MarkdownExportSource = {
      title: "",
      url: "",
      capturedAt: "2024-01-15T10:30:45Z",
      markdown: "",
      plainText: ""
    }
    const result = buildFilenameBase(source)
    expect(result).toContain("web-export")
  })
})

describe("maximum-length filename truncation", () => {
  it("truncates input longer than 120 characters to 120", () => {
    const longInput = "a".repeat(200)
    const result = sanitizeFileName(longInput)
    expect(result.length).toBe(120)
  })

  it("does not truncate input at exactly 120 characters", () => {
    const exactInput = "b".repeat(120)
    const result = sanitizeFileName(exactInput)
    expect(result.length).toBe(120)
  })

  it("does not truncate input shorter than 120 characters", () => {
    const shortInput = "c".repeat(50)
    const result = sanitizeFileName(shortInput)
    expect(result.length).toBe(50)
  })
})

describe("special characters in URLs", () => {
  it("handles URL with query params in buildFilenameBase", () => {
    const source: MarkdownExportSource = {
      title: "",
      url: "https://example.com/page?foo=bar&baz=qux",
      capturedAt: "2024-01-15T10:30:45Z",
      markdown: "",
      plainText: ""
    }
    const result = buildFilenameBase(source)
    expect(result).toContain("example.com")
  })

  it("handles URL with fragment in buildFilenameBase", () => {
    const source: MarkdownExportSource = {
      title: "",
      url: "https://example.com/page#section-1",
      capturedAt: "2024-01-15T10:30:45Z",
      markdown: "",
      plainText: ""
    }
    const result = buildFilenameBase(source)
    expect(result).toContain("example.com")
  })

  it("handles URL with special characters in path", () => {
    const source: MarkdownExportSource = {
      title: "",
      url: "https://example.com/path/with spaces/and<special>chars",
      capturedAt: "2024-01-15T10:30:45Z",
      markdown: "",
      plainText: ""
    }
    const result = buildFilenameBase(source)
    expect(result).toContain("example.com")
  })

  it("handles URL with port number", () => {
    const source: MarkdownExportSource = {
      title: "",
      url: "https://localhost:3000/page",
      capturedAt: "2024-01-15T10:30:45Z",
      markdown: "",
      plainText: ""
    }
    const result = buildFilenameBase(source)
    expect(result).toContain("localhost")
  })
})

describe("buildDownloadFilename extension mapping", () => {
  it("maps 'markdown' format to .md extension", () => {
    const result = buildDownloadFilename("my-file", "markdown")
    expect(result).toBe("my-file.md")
  })

  it("maps 'pdf' format to .pdf extension", () => {
    const result = buildDownloadFilename("my-file", "pdf")
    expect(result).toBe("my-file.pdf")
  })

  it("maps 'png' format to .png extension", () => {
    const result = buildDownloadFilename("my-file", "png")
    expect(result).toBe("my-file.png")
  })
})

describe("formatTimestamp", () => {
  it("produces YYYYMMDD-HHmmss format", () => {
    const date = new Date(2024, 0, 15, 10, 30, 45)
    const result = formatTimestamp(date)
    expect(result).toBe("20240115-103045")
  })

  it("zero-pads single-digit months and days", () => {
    const date = new Date(2024, 2, 5, 8, 5, 3)
    const result = formatTimestamp(date)
    expect(result).toBe("20240305-080503")
  })

  it("handles end-of-year date", () => {
    const date = new Date(2024, 11, 31, 23, 59, 59)
    const result = formatTimestamp(date)
    expect(result).toBe("20241231-235959")
  })
})
