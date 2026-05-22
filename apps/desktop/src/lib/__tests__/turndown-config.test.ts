import { describe, it, expect } from "vitest"
import { createTurndownService } from "../turndown-config"

describe("createTurndownService", () => {
  it("returns a TurndownService instance", () => {
    const service = createTurndownService()
    expect(service).toBeDefined()
    expect(typeof service.turndown).toBe("function")
  })

  it("converts headings with atx style", () => {
    const service = createTurndownService()
    const md = service.turndown("<h1>Title</h1>")
    expect(md).toBe("# Title")
  })

  it("converts h2-h6 headings correctly", () => {
    const service = createTurndownService()
    expect(service.turndown("<h2>Sub</h2>")).toBe("## Sub")
    expect(service.turndown("<h3>Sub3</h3>")).toBe("### Sub3")
  })

  it("converts code blocks with fenced style", () => {
    const service = createTurndownService()
    const html = "<pre><code>const x = 1</code></pre>"
    const md = service.turndown(html)
    expect(md).toContain("```")
    expect(md).toContain("const x = 1")
  })

  it("converts unordered lists with - marker", () => {
    const service = createTurndownService()
    const html = "<ul><li>one</li><li>two</li></ul>"
    const md = service.turndown(html)
    expect(md).toMatch(/^-\s+one/m)
    expect(md).toMatch(/^-\s+two/m)
  })

  it("converts links to markdown format", () => {
    const service = createTurndownService()
    const html = '<a href="https://example.com">Example</a>'
    const md = service.turndown(html)
    expect(md).toBe("[Example](https://example.com)")
  })

  it("converts images to markdown format", () => {
    const service = createTurndownService()
    const html = '<img alt="logo" src="https://example.com/logo.png">'
    const md = service.turndown(html)
    expect(md).toBe("![logo](https://example.com/logo.png)")
  })

  it("supports GFM tables", () => {
    const service = createTurndownService()
    const html = `
      <table>
        <thead><tr><th>Name</th><th>Age</th></tr></thead>
        <tbody><tr><td>Alice</td><td>30</td></tr></tbody>
      </table>
    `
    const md = service.turndown(html)
    expect(md).toContain("Name")
    expect(md).toContain("Age")
    expect(md).toContain("|")
  })

  it("supports GFM strikethrough", () => {
    const service = createTurndownService()
    const html = "<del>deleted</del>"
    const md = service.turndown(html)
    expect(md).toMatch(/~+deleted~+/)
  })

  it("supports GFM task lists", () => {
    const service = createTurndownService()
    const html = `
      <ul>
        <li><input type="checkbox" checked> Done</li>
        <li><input type="checkbox"> Todo</li>
      </ul>
    `
    const md = service.turndown(html)
    expect(md).toContain("[x]")
    expect(md).toContain("[ ]")
  })
})
