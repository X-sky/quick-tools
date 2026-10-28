/**
 * Web Export page E2E — exercises the extraction → filename → format
 * (MD / PNG / PDF) pipeline and batch folder write path, end-to-end
 * through the platform mock.
 */
import { describe, it, expect, beforeEach } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import {
  buildMarkdownDocument,
  buildFilenameBase,
  buildDownloadFilename,
  sanitizeFileName,
  type MarkdownExportSource
} from "@quick-tools/web-export"
import { parseBatchUrls } from "~/lib/batch-parser"

import {
  installMockPlatform,
  memoryDownloads,
  memoryHttpHandlers
} from "~/test-utils/mock-platform"

import { getPlatform } from "@quick-tools/platform"
import { ensureResvgWasm } from "~/test-utils/resvg-init"

const FONT_DIR = resolve(process.cwd(), "dist/fonts")

function loadFont(name: string): ArrayBuffer {
  const buf = readFileSync(resolve(FONT_DIR, name))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

const SAMPLE_SOURCE: MarkdownExportSource = {
  title: "Sample Article",
  url: "https://example.com/sample",
  capturedAt: "2026-01-01T00:00:00.000Z",
  byline: "Jane Doe",
  excerpt: "An excerpt.",
  markdown: "# Heading\n\nFirst paragraph with **bold** text.\n\n- one\n- two",
  plainText: "Heading First paragraph with bold text. one two"
}

beforeEach(() => {
  installMockPlatform()
})

describe("Web Export — page logic E2E", () => {
  describe("filename / markdown document", () => {
    it("sanitizes path-unsafe characters", () => {
      expect(sanitizeFileName("a/b\\c:d*e?f")).toBe("a b c d e f")
    })

    it("builds a filename base from the page title", () => {
      const base = buildFilenameBase(SAMPLE_SOURCE)
      // Title is sanitized and the timestamp from capturedAt is appended.
      expect(base).toContain("Sample Article")
      expect(base).toMatch(/-\d{8}-\d{6}$/)
    })

    it("falls back to hostname when title is empty", () => {
      const noTitle: MarkdownExportSource = { ...SAMPLE_SOURCE, title: "" }
      const base = buildFilenameBase(noTitle)
      expect(base).toMatch(/example\.com/)
    })

    it("falls back to 'web-export' when both title and url are empty", () => {
      const bare: MarkdownExportSource = {
        ...SAMPLE_SOURCE,
        title: "",
        url: ""
      }
      const base = buildFilenameBase(bare)
      expect(base).toMatch(/^web-export-/)
    })

    it("appends a timestamp + extension", () => {
      const base = buildFilenameBase(SAMPLE_SOURCE)
      const md = buildDownloadFilename(base, "markdown")
      const pdf = buildDownloadFilename(base, "pdf")
      const png = buildDownloadFilename(base, "png")
      expect(md).toMatch(/\.md$/)
      expect(pdf).toMatch(/\.pdf$/)
      expect(png).toMatch(/\.png$/)
    })

    it("Markdown document includes title, source, and body", () => {
      const md = buildMarkdownDocument(SAMPLE_SOURCE)
      expect(md).toContain("# Sample Article")
      expect(md).toContain("- Source: https://example.com/sample")
      expect(md).toContain("- Byline: Jane Doe")
      expect(md).toContain("> An excerpt.")
      expect(md).toContain("**bold**")
    })
  })

  describe("batch URL parsing", () => {
    it("splits lines, trims, and flags invalid URLs", () => {
      const results = parseBatchUrls("https://a.com\n\nnot-a-url\nhttps://b.com")
      expect(results.find((r) => r.content === "https://a.com")?.valid).toBe(true)
      expect(results.find((r) => r.content === "https://b.com")?.valid).toBe(true)
      expect(results.find((r) => r.content === "not-a-url")?.valid).toBe(false)
    })

    it("skips empty lines", () => {
      const results = parseBatchUrls("\n\nhttps://only.com\n\n")
      expect(results).toHaveLength(1)
    })
  })

  describe("extraction (URL → Markdown source)", () => {
    it("extracts title and body from HTML", async () => {
      memoryHttpHandlers.set("https://example.com/sample", async () => ({
        status: 200,
        headers: {},
        body: `<!doctype html><html><head><title>Sample Article</title></head>
        <body><article>
          <h1>Sample Article</h1>
          <p>First paragraph with <strong>bold</strong> text.</p>
          <ul><li>one</li><li>two</li></ul>
        </article></body></html>`
      }))
      const p = getPlatform()
      const r = await p.contentExtractor.extractFromUrl(
        "https://example.com/sample"
      )
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.value.title).toBe("Sample Article")
        expect(r.value.plainText).toContain("bold")
        expect(r.value.plainText).toContain("one")
      }
    })

    it("returns network error for 404", async () => {
      memoryHttpHandlers.set("https://example.com/missing", async () => ({
        status: 404,
        headers: {},
        body: ""
      }))
      const p = getPlatform()
      const r = await p.contentExtractor.extractFromUrl(
        "https://example.com/missing"
      )
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.category).toBe("network")
    })
  })

  describe("export PNG (renderer → file system via platform)", () => {
    it("renders a PNG and writes it to the platform", async () => {
      await ensureResvgWasm()
      const { renderToPng } = await import("~/lib/pdf-png-renderer")
      const pngBytes = await renderToPng(
        SAMPLE_SOURCE.markdown,
        SAMPLE_SOURCE,
        {
          width: 800,
          fonts: {
            body: loadFont("Arial Unicode.ttf.fixed.ttf"),
            mono: loadFont("Courier New.ttf.fixed.ttf")
          }
        }
      )
      expect(pngBytes.length).toBeGreaterThan(100)
      // PNG magic header
      expect(Array.from(pngBytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47])

      const p = getPlatform()
      const filename = buildDownloadFilename(
        buildFilenameBase(SAMPLE_SOURCE),
        "png"
      )
      await p.fileDownloader.downloadWithDialog(
        pngBytes,
        filename,
        "image/png"
      )
      expect(memoryDownloads[0]).toMatchObject({
        filename,
        mimeType: "image/png",
        usedDialog: true
      })
    }, 30000)
  })

  describe("export PDF (renderer → file system via platform)", () => {
    it("renders a multi-page PDF for long content", async () => {
      await ensureResvgWasm()
      const { renderToPdf } = await import("~/lib/pdf-png-renderer")
      const longMd = Array.from({ length: 80 })
        .map((_, i) => `## 段落 ${i}\n\n这是一段填充文字，用于触发 PDF 分页。`.repeat(3))
        .join("\n\n")
      const source: MarkdownExportSource = {
        ...SAMPLE_SOURCE,
        markdown: longMd,
        plainText: longMd
      }
      const pdfBytes = await renderToPdf(longMd, source, {
        width: 794,
        pageSize: "A4",
        fonts: {
          body: loadFont("Arial Unicode.ttf.fixed.ttf"),
          mono: loadFont("Courier New.ttf.fixed.ttf")
        }
      })
      expect(pdfBytes.length).toBeGreaterThan(2000)
      const header = new TextDecoder().decode(pdfBytes.slice(0, 5))
      expect(header).toBe("%PDF-")

      const p = getPlatform()
      const filename = buildDownloadFilename(
        buildFilenameBase(source),
        "pdf"
      )
      await p.fileDownloader.downloadWithDialog(
        pdfBytes,
        filename,
        "application/pdf"
      )
      expect(memoryDownloads[0]).toMatchObject({
        filename,
        mimeType: "application/pdf"
      })
    }, 30000)
  })

  describe("Markdown export (text only)", () => {
    it("saves a .md file with the right mime", async () => {
      const md = buildMarkdownDocument(SAMPLE_SOURCE)
      const p = getPlatform()
      const filename = buildDownloadFilename(
        buildFilenameBase(SAMPLE_SOURCE),
        "markdown"
      )
      await p.fileDownloader.downloadWithDialog(
        md,
        filename,
        "text/markdown"
      )
      expect(memoryDownloads[0]).toMatchObject({
        filename,
        mimeType: "text/markdown"
      })
    })
  })

  describe("batch folder write (simulates batch export loop)", () => {
    it("writes N files for N URLs", async () => {
      // Pretend two URLs; each succeeds
      memoryHttpHandlers.set("https://a.example", async () => ({
        status: 200,
        headers: {},
        body: `<html><head><title>A</title></head><body><p>a body</p></body></html>`
      }))
      memoryHttpHandlers.set("https://b.example", async () => ({
        status: 200,
        headers: {},
        body: `<html><head><title>B</title></head><body><p>b body</p></body></html>`
      }))
      const p = getPlatform()
      const urls = ["https://a.example", "https://b.example"]
      const results: Array<{ url: string; ok: boolean }> = []
      for (const url of urls) {
        const r = await p.contentExtractor.extractFromUrl(url)
        if (r.ok) {
          const filename = `${buildFilenameBase(r.value)}.md`
          const md = buildMarkdownDocument(r.value)
          await p.fileDownloader.downloadWithDialog(
            md,
            filename,
            "text/markdown"
          )
          results.push({ url, ok: true })
        } else {
          results.push({ url, ok: false })
        }
      }
      expect(results).toHaveLength(2)
      expect(memoryDownloads).toHaveLength(2)
      // buildFilenameBase uses the page <title>, not the hostname.
      // Our HTML fixtures set <title>A</title> and <title>B</title>.
      expect(memoryDownloads[0]?.filename).toMatch(/^A-/)
      expect(memoryDownloads[0]?.filename).toMatch(/\.md$/)
      expect(memoryDownloads[1]?.filename).toMatch(/^B-/)
      expect(memoryDownloads[1]?.filename).toMatch(/\.md$/)
    })

    it("continues past a failed URL and records the error", async () => {
      memoryHttpHandlers.set("https://ok.example", async () => ({
        status: 200,
        headers: {},
        body: `<html><head><title>OK</title></head><body>ok</body></html>`
      }))
      // https://bad.example is intentionally not registered → not-found
      const p = getPlatform()
      const urls = ["https://ok.example", "https://bad.example"]
      const results: Array<{ url: string; ok: boolean; error?: string }> = []
      for (const url of urls) {
        const r = await p.contentExtractor.extractFromUrl(url)
        if (r.ok) {
          results.push({ url, ok: true })
        } else {
          results.push({ url, ok: false, error: r.error.message })
        }
      }
      expect(results[0]?.ok).toBe(true)
      expect(results[1]?.ok).toBe(false)
      expect(results[1]?.error).toContain("No mock handler")
    })
  })
})
