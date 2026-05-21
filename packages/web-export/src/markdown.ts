import type { MarkdownExportSource } from "./types"

export function buildMarkdownDocument(source: MarkdownExportSource): string {
  const lines = [
    `# ${source.title || "Untitled page"}`,
    "",
    `- Source: ${source.url}`,
    `- Captured At: ${source.capturedAt}`
  ]

  if (source.byline) {
    lines.push(`- Byline: ${source.byline}`)
  }

  if (source.excerpt) {
    lines.push("", `> ${source.excerpt}`)
  }

  lines.push("", source.markdown.trim() || source.plainText.trim())

  return lines.join("\n").trim() + "\n"
}
