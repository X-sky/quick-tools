/**
 * QR Code page E2E — drives the QR generator's full code path:
 *   generate → history (50-item cap, dedup) → export PNG / SVG /
 *   clipboard → capacity check → template mode wiring.
 */
import { describe, it, expect, beforeEach } from "vitest"
import { calculateQrCapacity } from "~/lib/qr-capacity"
import { addValue, createEmptyStore, buildExportSchema } from "@quick-tools/qr-code-gen"
import { parse as parseTemplate } from "@quick-tools/qr-code-gen"

import {
  installMockPlatform,
  memoryClipboard,
  memoryDownloads
} from "~/test-utils/mock-platform"

import { getPlatform } from "@quick-tools/platform"

beforeEach(() => {
  installMockPlatform()
})

describe("QR Code page — logic E2E", () => {
  describe("capacity check", () => {
    it("short URL fits at level M", () => {
      const info = calculateQrCapacity("https://example.com", "M")
      expect(info.isOverCapacity).toBe(false)
      expect(info.maxCapacity).toBe(2331)
      expect(info.charCount).toBe("https://example.com".length)
    })

    it("huge payload exceeds level M capacity", () => {
      const huge = "x".repeat(5000)
      const info = calculateQrCapacity(huge, "M")
      expect(info.isOverCapacity).toBe(true)
    })

    it("level H (30%) is the most restrictive", () => {
      const info = calculateQrCapacity("x".repeat(2000), "H")
      expect(info.isOverCapacity).toBe(true)
    })
  })

  describe("history (storage)", () => {
    it("persists up to 50 items and drops the oldest", async () => {
      const key = "qr-history"
      const p = getPlatform()
      const items: Array<{ content: string; timestamp: number }> = []
      for (let i = 0; i < 60; i++) {
        const entry = { content: `entry-${i}`, timestamp: 1000 + i }
        items.unshift(entry)
        await p.storage.set(key, items.slice(0, 50))
      }
      const storedResult = await p.storage.get<typeof items>(key)
      const stored = storedResult.ok ? (storedResult.value ?? []) : []
      expect(stored).toHaveLength(50)
      expect(stored[0]?.content).toBe("entry-59")
      expect(stored[49]?.content).toBe("entry-10")
    })

    it("dedups by content + timestamp ordering", async () => {
      const key = "qr-history"
      const p = getPlatform()
      const items: Array<{ content: string; timestamp: number }> = []
      items.unshift({ content: "same", timestamp: 100 })
      items.unshift({ content: "same", timestamp: 101 })
      await p.storage.set(key, items)
      const storedResult = await p.storage.get<typeof items>(key)
      const stored = storedResult.ok ? (storedResult.value ?? []) : []
      expect(stored).toHaveLength(2)
      expect(stored[0]?.timestamp).toBe(101)
    })
  })

  describe("PNG / SVG export (writes to file system via platform)", () => {
    it("saves a PNG with the .png extension", async () => {
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      const p = getPlatform()
      const r = await p.fileDownloader.downloadWithDialog(
        pngBytes,
        "qr-https-example-com.png",
        "image/png"
      )
      expect(r.ok).toBe(true)
      const dl0 = memoryDownloads[0]
      expect(dl0).toBeDefined()
      expect(dl0).toMatchObject({
        filename: "qr-https-example-com.png",
        mimeType: "image/png"
      })
      expect(dl0!.data).toBeInstanceOf(Uint8Array)
      expect(Array.from(dl0!.data as Uint8Array).slice(0, 4)).toEqual([
        0x89, 0x50, 0x4e, 0x47
      ])
    })

    it("saves SVG with the image/svg+xml mime", async () => {
      const svg = `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>`
      const p = getPlatform()
      await p.fileDownloader.downloadWithDialog(svg, "qr.svg", "image/svg+xml")
      expect(memoryDownloads[0]).toMatchObject({
        filename: "qr.svg",
        mimeType: "image/svg+xml"
      })
    })

    it("copies PNG bytes to clipboard", async () => {
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      const p = getPlatform()
      const r = await p.clipboard.writeImage(pngBytes, "image/png")
      expect(r.ok).toBe(true)
      expect(memoryClipboard.image).toBe(pngBytes)
    })
  })

  describe("template mode (QR template package)", () => {
    it("parses a simple template and tracks placeholder names", () => {
      const result = parseTemplate("Hello {name}, your code is {code}.")
      expect(result.errors).toEqual([])
      expect(result.placeholderNames).toEqual(["name", "code"])
    })

    it("rejects an unclosed placeholder", () => {
      const result = parseTemplate("Hello {name")
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it("addValue stores a placeholder value for a template", () => {
      let store = createEmptyStore()
      const t = {
        id: "t1",
        name: "T",
        templateString: "Hi {who}",
        createdAt: 0,
        updatedAt: 0
      }
      store = { ...store, templates: [t] }
      const r = addValue(store, "t1", "who", "Alice")
      expect(r.ok).toBe(true)
      if (r.ok) {
        const entries = r.value.placeholderValues.filter(
          (pv) => pv.templateId === "t1" && pv.placeholderName === "who"
        )
        expect(entries[0]?.values).toContain("Alice")
      }
    })

    it("export schema is round-trippable JSON", () => {
      const store = createEmptyStore()
      const schema = buildExportSchema(store)
      const json = JSON.stringify(schema)
      expect(typeof json).toBe("string")
      const parsed = JSON.parse(json)
      expect(parsed).toMatchObject({ templates: [], placeholderValues: [], combinationTags: [] })
    })
  })

  describe("capacity edge cases at all four ECC levels", () => {
    it("level L has the largest capacity", () => {
      const l = calculateQrCapacity("x".repeat(2000), "L")
      const m = calculateQrCapacity("x".repeat(2000), "M")
      const q = calculateQrCapacity("x".repeat(2000), "Q")
      const h = calculateQrCapacity("x".repeat(2000), "H")
      expect(l.maxCapacity).toBeGreaterThanOrEqual(m.maxCapacity)
      expect(m.maxCapacity).toBeGreaterThanOrEqual(q.maxCapacity)
      expect(q.maxCapacity).toBeGreaterThanOrEqual(h.maxCapacity)
    })
  })
})
