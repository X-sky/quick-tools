import type { ExtractedArticle } from "./types"

export function extractArticleInPage(): ExtractedArticle {
  const textLength = (element: Element | null) =>
    element?.textContent?.replace(/\s+/g, " ").trim().length ?? 0

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
    Array.from(document.querySelectorAll(selector))
  )

  const primary = candidates
    .filter((candidate, index, list) => list.indexOf(candidate) === index)
    .sort((left, right) => textLength(right) - textLength(left))[0]

  const root = primary ?? document.body
  const clone = root.cloneNode(true) as HTMLElement

  clone
    .querySelectorAll(
      "script, style, noscript, iframe, svg, canvas, form, button, input, aside, nav, footer, img, picture, video, audio, source"
    )
    .forEach((node) => node.remove())

  const contentHtml =
    clone.innerHTML?.trim() || "<p>No readable content found.</p>"
  const plainText = clone.textContent?.replace(/\n\s+\n/g, "\n\n").trim() || ""

  const markdown = Array.from(
    clone.querySelectorAll("h1, h2, h3, h4, h5, h6, p, li")
  )
    .map((node) => {
      const text = node.textContent?.trim()

      if (!text) {
        return ""
      }

      if (/^H[1-6]$/.test(node.tagName)) {
        const level = Number(node.tagName.slice(1))
        return `${"#".repeat(level)} ${text}`
      }

      if (node.tagName === "LI") {
        return `- ${text}`
      }

      return text
    })
    .filter(Boolean)
    .join("\n\n")

  return {
    title: document.title || "Untitled page",
    url: location.href,
    capturedAt: new Date().toISOString(),
    markdown: markdown || plainText,
    plainText,
    contentHtml
  }
}
