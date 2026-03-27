import { Readability } from "@mozilla/readability"
import TurndownService from "turndown"

import type { ExtractedArticle } from "../types"

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-"
})

function cleanDocument(doc: Document) {
  doc
    .querySelectorAll(
      "script, style, noscript, iframe, svg, canvas, form, button, input, aside, nav, footer"
    )
    .forEach((node) => node.remove())
}

function getTextLength(element: Element | null) {
  return element?.textContent?.replace(/\s+/g, " ").trim().length ?? 0
}

function pickPrimaryContainer(doc: Document) {
  const selectors = [
    "article",
    "main",
    "[role='main']",
    ".article-content",
    ".post-content",
    ".entry-content",
    ".content",
    "#content"
  ]

  const candidates = selectors.flatMap((selector) =>
    Array.from(doc.querySelectorAll(selector))
  )

  return candidates
    .filter((candidate, index, list) => list.indexOf(candidate) === index)
    .sort((left, right) => getTextLength(right) - getTextLength(left))[0]
}

function buildScopedDocument(source: Document, primary: Element | null) {
  const clone = source.cloneNode(true) as Document

  if (!primary) {
    cleanDocument(clone)
    return clone
  }

  clone.body.innerHTML = ""
  clone.body.appendChild(primary.cloneNode(true))
  cleanDocument(clone)

  return clone
}

function runReadability(doc: Document) {
  try {
    return new Readability(doc).parse()
  } catch (error) {
    console.warn("Readability failed", error)
    return null
  }
}

function htmlToPlainText(html: string) {
  const container = document.createElement("div")
  container.innerHTML = html

  return container.textContent?.replace(/\s+\n/g, "\n").trim() ?? ""
}

function fallbackMarkdown(plainText: string) {
  return plainText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join("\n\n")
}

export function extractCurrentPage(): ExtractedArticle {
  const primary = pickPrimaryContainer(document)
  const scoped = buildScopedDocument(document, primary)
  const full = buildScopedDocument(document, null)

  const parsed = runReadability(scoped) ?? runReadability(full)
  const contentHtml =
    parsed?.content ??
    primary?.innerHTML ??
    document.body?.innerHTML ??
    "<p>No readable content found.</p>"
  const plainText = htmlToPlainText(contentHtml)
  const markdown = turndownService.turndown(contentHtml).trim()

  return {
    title: parsed?.title?.trim() || document.title || "Untitled page",
    url: location.href,
    byline: parsed?.byline?.trim() || undefined,
    excerpt: parsed?.excerpt?.trim() || undefined,
    capturedAt: new Date().toISOString(),
    markdown: markdown || fallbackMarkdown(plainText),
    plainText,
    contentHtml
  }
}
