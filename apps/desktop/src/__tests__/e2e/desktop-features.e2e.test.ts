/**
 * 端到端 smoke：模拟用户在 desktop 壳里点击"格式化 / 生成二维码 / 导出 PDF"时
 * 实际跑的代码路径。这层不依赖 Tauri / browser 运行时（node 环境 + vitest）。
 */
import { describe, it, expect, beforeAll } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import {
  formatJson,
  minifyJson,
  parseJsonOrJsObject
} from "@quick-tools/json-formatter"
import { calculateQrCapacity } from "~/lib/qr-capacity"
import { renderToPng, renderToPdf } from "~/lib/pdf-png-renderer"
import { ensureResvgWasm } from "~/test-utils/resvg-init"

const FONT_DIR = resolve(process.cwd(), "dist/fonts")

function loadFont(name: string): ArrayBuffer {
  const buf = readFileSync(resolve(FONT_DIR, name))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

beforeAll(async () => {
  await ensureResvgWasm()
}, 30_000)

describe("desktop shell - core features end-to-end", () => {
  it("JSON Formatter: parses JS-object syntax and produces formatted/minified output", () => {
    const sample = `// a comment line
{ name: "测试", list: [1, 2, 3,], nested: { ok: true, /* inner */ } }`
    const parsed = parseJsonOrJsObject(sample) as { name: string; list: number[]; nested: { ok: boolean } }

    expect(parsed.name).toBe("测试")
    expect(parsed.list).toEqual([1, 2, 3])
    expect(parsed.nested.ok).toBe(true)

    const formatted = formatJson(parsed)
    expect(formatted).toContain('"name": "测试"')
    expect(formatted).toContain('"list": [')
    expect(formatted.split("\n").length).toBeGreaterThan(3) // 多行格式化

    const minified = minifyJson(parsed)
    expect(minified).toBe('{"name":"测试","list":[1,2,3],"nested":{"ok":true}}')
  })

  it("JSON Formatter: rejects invalid input with a friendly error", () => {
    expect(() => parseJsonOrJsObject("{ bad: }")).toThrow()
  })

  it("QR Code: capacity check stays within bounds for typical inputs", () => {
    const info = calculateQrCapacity("https://example.com", "M")
    expect(info.charCount).toBe(19)
    expect(info.maxCapacity).toBe(2331)
    expect(info.isOverCapacity).toBe(false)

    const huge = "x".repeat(5000)
    const over = calculateQrCapacity(huge, "M")
    expect(over.isOverCapacity).toBe(true)
  })

  it("Web Export: PNG renderer produces a valid PNG for sample markdown", async () => {
    const markdown = `# 标题

这是一段 **加粗** 和 *斜体* 的内容。

- 列表项 1
- 列表项 2

\`\`\`
console.log("code")
\`\`\``
    const source = {
      title: "测试",
      url: "https://example.com",
      capturedAt: new Date().toISOString(),
      markdown,
      plainText: markdown
    }
    const pngBytes = await renderToPng(markdown, source, {
      width: 600,
      fonts: {
        body: loadFont("Arial Unicode.ttf.fixed.ttf"),
        mono: loadFont("Courier New.ttf.fixed.ttf")
      }
    })
    // PNG magic header: 89 50 4E 47
    expect(pngBytes.length).toBeGreaterThan(1000)
    expect(Array.from(pngBytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47])
  }, 30_000)

  it("Web Export: PDF renderer produces a multi-page PDF for long content", async () => {
    const md = Array.from({ length: 80 })
      .map((_, i) => `## 段落 ${i}\n\n这是一段填充文字，用于触发 PDF 分页。`.repeat(3))
      .join("\n\n")
    const source = {
      title: "长文",
      url: "https://example.com/long",
      capturedAt: new Date().toISOString(),
      markdown: md,
      plainText: md
    }
    const pdfBytes = await renderToPdf(md, source, {
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
  }, 30_000)
})
