import type { MarkdownExportSource } from "./types"

export function extractArticleInPage(): MarkdownExportSource {
  const getTextLength = (element: Element | null) =>
    element?.textContent?.replace(/\s+/g, " ").trim().length ?? 0

  const pickPrimaryContainer = (doc: Document) => {
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

  const stripNoise = (root: HTMLElement) => {
    root
      .querySelectorAll(
        "script, style, noscript, iframe, svg, canvas, form, button, input, aside, nav, footer, video, audio"
      )
      .forEach((node) => node.remove())
  }

  const syncImageSources = (originalRoot: HTMLElement, cloneRoot: HTMLElement) => {
    const originalImages = Array.from(originalRoot.querySelectorAll("img"))
    const clonedImages = Array.from(cloneRoot.querySelectorAll("img"))

    clonedImages.forEach((clonedImage, index) => {
      const originalImage = originalImages[index]

      if (!originalImage) {
        return
      }

      const resolvedSrc =
        originalImage.currentSrc || originalImage.getAttribute("src") || ""

      if (resolvedSrc) {
        clonedImage.setAttribute("src", resolvedSrc)
      }

      clonedImage.removeAttribute("srcset")
      clonedImage.removeAttribute("sizes")
      clonedImage.removeAttribute("loading")
      clonedImage.removeAttribute("decoding")
    })

    Array.from(cloneRoot.querySelectorAll("picture, source")).forEach((node) => {
      node.remove()
    })
  }

  const normalizeInlineText = (value: string) =>
    value.replace(/\s+/g, " ").trim()

  const serializeInline = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return normalizeInlineText(node.textContent || "")
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return ""
    }

    const element = node as HTMLElement
    const tag = element.tagName.toLowerCase()
    const children = Array.from(element.childNodes)
      .map((child) => serializeInline(child))
      .join("")
      .replace(/\s{2,}/g, " ")
      .trim()

    if (tag === "br") {
      return "\n"
    }

    if (tag === "code" && element.parentElement?.tagName.toLowerCase() !== "pre") {
      return children ? `\`${children}\`` : ""
    }

    if (tag === "strong" || tag === "b") {
      return children ? `**${children}**` : ""
    }

    if (tag === "em" || tag === "i") {
      return children ? `*${children}*` : ""
    }

    if (tag === "a") {
      const href = element.getAttribute("href")?.trim()

      if (!href) {
        return children
      }

      return `[${children || href}](${href})`
    }

    if (tag === "img") {
      const src = element.getAttribute("src")?.trim()
      const alt = element.getAttribute("alt")?.trim() || "image"
      return src ? `![${alt}](${src})` : ""
    }

    return children
  }

  const serializeListItem = (item: HTMLElement, ordered: boolean, index: number) => {
    const marker = ordered ? `${index + 1}. ` : "- "
    const blocks: string[] = []
    const inlineParts: string[] = []

    for (const child of Array.from(item.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement
        const tag = element.tagName.toLowerCase()

        if (tag === "ul" || tag === "ol" || tag === "pre" || tag === "blockquote") {
          const nested = serializeBlock(element)

          if (nested) {
            blocks.push(
              nested
                .split("\n")
                .map((line) => (line ? `  ${line}` : line))
                .join("\n")
            )
          }

          continue
        }
      }

      const inline = serializeInline(child)

      if (inline) {
        inlineParts.push(inline)
      }
    }

    const firstLine = `${marker}${inlineParts.join(" ").replace(/\s+/g, " ").trim()}`
    return [firstLine.trim(), ...blocks].filter(Boolean).join("\n")
  }

  const serializeBlock = (node: Element): string => {
    const element = node as HTMLElement
    const tag = element.tagName.toLowerCase()

    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag.slice(1))
      const text = Array.from(element.childNodes)
        .map((child) => serializeInline(child))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()

      return text ? `${"#".repeat(level)} ${text}` : ""
    }

    if (tag === "p") {
      return Array.from(element.childNodes)
        .map((child) => serializeInline(child))
        .join(" ")
        .replace(/\s+\n/g, "\n")
        .replace(/\s+/g, " ")
        .trim()
    }

    if (tag === "pre") {
      const code = element.querySelector("code")
      const rawText = code?.textContent || element.textContent || ""
      const languageClass =
        code?.className
          .split(/\s+/)
          .find((className) => className.startsWith("language-")) || ""
      const language = languageClass.replace(/^language-/, "")
      const fencedBody = rawText.replace(/\n+$/, "")

      return fencedBody ? `\`\`\`${language}\n${fencedBody}\n\`\`\`` : ""
    }

    if (tag === "blockquote") {
      const inner = Array.from(element.children)
        .map((child) => serializeBlock(child))
        .filter(Boolean)
        .join("\n\n")

      const content =
        inner ||
        Array.from(element.childNodes)
          .map((child) => serializeInline(child))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim()

      return content
        ? content
            .split("\n")
            .map((line) => `> ${line}`.trimEnd())
            .join("\n")
        : ""
    }

    if (tag === "ul" || tag === "ol") {
      const ordered = tag === "ol"
      return Array.from(element.children)
        .filter((child) => child.tagName.toLowerCase() === "li")
        .map((child, index) => serializeListItem(child as HTMLElement, ordered, index))
        .filter(Boolean)
        .join("\n")
    }

    if (tag === "img") {
      return serializeInline(element)
    }

    if (tag === "hr") {
      return "---"
    }

    const children = Array.from(element.children)
      .map((child) => serializeBlock(child))
      .filter(Boolean)

    if (children.length > 0) {
      return children.join("\n\n")
    }

    return Array.from(element.childNodes)
      .map((child) => serializeInline(child))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
  }

  const toMarkdown = (root: HTMLElement) =>
    Array.from(root.children)
      .map((child) => serializeBlock(child))
      .filter(Boolean)
      .join("\n\n")

  const primary = pickPrimaryContainer(document)
  const root = (primary ?? document.body) as HTMLElement | null

  if (!root) {
    return {
      title: document.title || "Untitled page",
      url: location.href,
      capturedAt: new Date().toISOString(),
      markdown: "",
      plainText: ""
    }
  }

  const clone = root.cloneNode(true) as HTMLElement

  stripNoise(clone)
  syncImageSources(root, clone)

  const plainText = clone.textContent?.replace(/\n\s+\n/g, "\n\n").trim() || ""
  const markdown = toMarkdown(clone)

  return {
    title: document.title || "Untitled page",
    url: location.href,
    capturedAt: new Date().toISOString(),
    markdown: markdown || plainText,
    plainText
  }
}
