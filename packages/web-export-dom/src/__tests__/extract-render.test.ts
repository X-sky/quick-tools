import { describe, expect, it } from "vitest"

import { exportArticle, describeExportResult } from "../export"
import { extractFromHtml, ExtractionError } from "../extract"
import { buildRenderedDocument } from "../render-document"
import { ensureThemeStyles } from "../theme"

const ARTICLE_HTML = `<!doctype html>
<html><head><title>Page title</title>
<meta name="author" content="Ada"></head>
<body>
  <nav>menu menu menu</nav>
  <article>
    <h1>Hello export</h1>
    <p>${"This is a long paragraph with enough words for Readability. ".repeat(12)}</p>
    <p>See <a href="/docs/intro">the docs</a> and the picture below.</p>
    <img src="img/cat.png" alt="cat">
    <table><thead><tr><th>A</th><th>B</th></tr></thead>
      <tbody><tr><td>1</td><td>2</td></tr></tbody></table>
    <pre><code>const x = 1</code></pre>
  </article>
</body></html>`

describe("extractFromHtml", () => {
  it("produces GFM markdown with absolute links and metadata", () => {
    const source = extractFromHtml(ARTICLE_HTML, "https://example.com/post/1", {
      capturedAt: "2026-01-01T00:00:00.000Z"
    })
    expect(source.url).toBe("https://example.com/post/1")
    expect(source.capturedAt).toBe("2026-01-01T00:00:00.000Z")
    expect(source.title).toBeTruthy()
    expect(source.markdown).toContain("https://example.com/docs/intro")
    expect(source.markdown).toContain("| A | B |")
    expect(source.markdown).toContain("```")
    expect(source.plainText).toContain("long paragraph")
  })

  it("throws a user-facing error when there is no article", () => {
    expect(() =>
      extractFromHtml("<html><body></body></html>", "https://e.com")
    ).toThrow(ExtractionError)
  })
})

describe("buildRenderedDocument", () => {
  const source = {
    title: "T",
    url: "https://example.com/a/",
    byline: "Ada",
    excerpt: "short",
    capturedAt: "2026-01-01T00:00:00.000Z",
    markdown:
      "Para [rel](b.html)\n\n![x](i.png)\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```\ncode\n```",
    plainText: ""
  }

  it("marks export blocks, absolutizes links and records image failures", async () => {
    const rendered = await buildRenderedDocument(source, async () => {
      throw new Error("offline")
    })
    expect(rendered.imageFailures).toBe(1)
    expect(rendered.html).toContain('href="https://example.com/a/b.html"')
    expect(rendered.html).toContain('data-export-block="table"')
    expect(rendered.html).toContain('data-export-block="pre"')
    expect(rendered.html).toContain("图片未能成功嵌入导出结果")
    expect(rendered.html).toContain("作者：Ada")
    expect(rendered.html).toContain("web-export-markdown__excerpt")
  })
})

describe("exportArticle (markdown) and theme", () => {
  it("exports a markdown file with the shared filename rule", async () => {
    const result = await exportArticle(
      {
        title: "My: Post",
        url: "https://e.com",
        capturedAt: "2026-01-02T03:04:05.000Z",
        markdown: "# Hi",
        plainText: "Hi"
      },
      "markdown"
    )
    expect(result.files).toHaveLength(1)
    expect(result.files[0]!.filename).toMatch(/^My Post-\d{8}-\d{6}\.md$/)
    expect(new TextDecoder().decode(result.files[0]!.bytes)).toContain("# Hi")
    expect(describeExportResult(result)).toBe("Markdown 已导出。")
  })

  it("injects the theme stylesheet once", () => {
    ensureThemeStyles()
    ensureThemeStyles()
    expect(document.querySelectorAll("#quick-tools-web-export-theme")).toHaveLength(1)
  })
})
