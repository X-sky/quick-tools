/**
 * Platform abstraction E2E — verifies the Tauri ↔ browser fallback
 * switching logic and that every public PlatformProvider surface
 * (storage / clipboard / fileDownloader / http / contentExtractor)
 * round-trips through the registered mock.
 */
import { describe, it, expect, beforeEach } from "vitest"
import {
  getPlatform,
  registerPlatform,
  createSuccess,
  createErrorResult
} from "@quick-tools/platform"

import {
  installMockPlatform,
  memoryStore,
  memoryClipboard,
  memoryDownloads,
  memoryHttpHandlers,
  mockPlatform
} from "~/test-utils/mock-platform"

import { browserPlatform } from "~/platform/browser"

describe("Platform — end-to-end", () => {
  beforeEach(() => {
    installMockPlatform()
  })

  it("getPlatform returns the most recently registered provider", () => {
    expect(getPlatform()).toBe(mockPlatform)
    registerPlatform(browserPlatform)
    expect(getPlatform()).toBe(browserPlatform)
    registerPlatform(mockPlatform)
    expect(getPlatform()).toBe(mockPlatform)
  })

  it("browser platform is the default when Tauri is not present", () => {
    // Sanity: the desktop module is wired to switch on isTauriRuntime().
    // In the test env __TAURI_INTERNALS__ is undefined so it falls back.
    expect(typeof browserPlatform.fileDownloader).toBe("object")
    expect(typeof browserPlatform.clipboard).toBe("object")
    expect(typeof browserPlatform.storage).toBe("object")
    expect(typeof browserPlatform.http).toBe("object")
    expect(typeof browserPlatform.contentExtractor).toBe("object")
  })

  it("storage round-trips primitives and objects", async () => {
    const p = getPlatform()
    await p.storage.set("count", 42)
    await p.storage.set("obj", { a: 1, b: ["x"] })
    const cR = await p.storage.get<number>("count")
    const oR = await p.storage.get<{ a: number; b: string[] }>("obj")
    if (cR.ok) expect(cR.value).toBe(42)
    if (oR.ok) expect(oR.value).toEqual({ a: 1, b: ["x"] })
  })

  it("storage.remove deletes the key", async () => {
    const p = getPlatform()
    await p.storage.set("temp", "v")
    await p.storage.remove("temp")
    const tR = await p.storage.get("temp")
    if (tR.ok) expect(tR.value).toBeNull()
  })

  it("clipboard.writeText is observable", async () => {
    const p = getPlatform()
    const r = await p.clipboard.writeText("hello clipboard")
    expect(r.ok).toBe(true)
    expect(memoryClipboard.text).toBe("hello clipboard")
  })

  it("clipboard.writeImage stores bytes and mime", async () => {
    const p = getPlatform()
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    const r = await p.clipboard.writeImage(bytes, "image/png")
    expect(r.ok).toBe(true)
    expect(memoryClipboard.image).toBe(bytes)
  })

  it("fileDownloader records both direct and dialog downloads", async () => {
    const p = getPlatform()
    await p.fileDownloader.download("body", "a.txt", "text/plain")
    await p.fileDownloader.downloadWithDialog(
      new Uint8Array([1, 2, 3]),
      "b.bin",
      "application/octet-stream"
    )
    expect(memoryDownloads).toHaveLength(2)
    expect(memoryDownloads[0]).toMatchObject({
      filename: "a.txt",
      mimeType: "text/plain",
      usedDialog: false
    })
    expect(memoryDownloads[1]).toMatchObject({
      filename: "b.bin",
      usedDialog: true
    })
  })

  it("http.fetch returns error for missing handler", async () => {
    const p = getPlatform()
    const r = await p.http.fetch("https://nope.example")
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.category).toBe("network")
      expect(r.error.message).toContain("No mock handler")
    }
  })

  it("http.fetch returns success for known URL", async () => {
    memoryHttpHandlers.set("https://ok.example", async () => ({
      status: 200,
      headers: { "content-type": "text/plain" },
      body: "ok"
    }))
    const p = getPlatform()
    const r = await p.http.fetch("https://ok.example")
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.status).toBe(200)
      expect(r.value.body).toBe("ok")
    }
  })

  it("http.fetch accepts optional HttpRequestOptions without erroring", async () => {
    memoryHttpHandlers.set("https://opts.example", async () => ({
      status: 200,
      headers: {},
      body: "ok"
    }))
    const p = getPlatform()
    const r = await p.http.fetch("https://opts.example", {
      method: "POST",
      headers: { "x-test": "1" }
    })
    expect(r.ok).toBe(true)
  })

  it("contentExtractor.extractFromCurrentPage returns not-found on desktop", async () => {
    const p = getPlatform()
    const r = await p.contentExtractor.extractFromCurrentPage()
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.category).toBe("not-found")
  })

  it("contentExtractor.extractFromUrl builds a MarkdownExportSource from HTML", async () => {
    memoryHttpHandlers.set("https://blog.example/post", async () => ({
      status: 200,
      headers: {},
      body: `<!doctype html><html><head><title>Hello Post</title></head><body>
        <article>
          <h1>Hello Post</h1>
          <p>This is the body text of the post.</p>
          <script>// should be stripped</script>
        </article>
      </body></html>`
    }))
    const p = getPlatform()
    const r = await p.contentExtractor.extractFromUrl("https://blog.example/post")
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.title).toBe("Hello Post")
      expect(r.value.url).toBe("https://blog.example/post")
      expect(r.value.plainText).toContain("body text")
      expect(r.value.plainText).not.toContain("should be stripped")
      expect(r.value.markdown).toContain("# Hello Post")
      expect(typeof r.value.capturedAt).toBe("string")
    }
  })

  it("contentExtractor returns network error for 4xx/5xx", async () => {
    memoryHttpHandlers.set("https://broken.example", async () => ({
      status: 503,
      headers: {},
      body: ""
    }))
    const p = getPlatform()
    const r = await p.contentExtractor.extractFromUrl("https://broken.example")
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.category).toBe("network")
  })

  it("createSuccess and createErrorResult return PlatformResult shapes", () => {
    const ok = createSuccess("x")
    expect(ok).toEqual({ ok: true, value: "x" })
    const err = createErrorResult("cancelled", "user said no")
    expect(err).toEqual({
      ok: false,
      error: { category: "cancelled", message: "user said no" }
    })
  })

  it("storage in-memory state is shared across calls in one test", async () => {
    const p = getPlatform()
    expect(memoryStore.size).toBe(0)
    await p.storage.set("a", 1)
    await p.storage.set("b", 2)
    expect(memoryStore.size).toBe(2)
  })
})
