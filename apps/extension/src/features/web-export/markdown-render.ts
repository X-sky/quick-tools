import { marked } from "marked"

import type { MarkdownExportSource, RenderedDocument } from "./types"

marked.setOptions({
  gfm: true,
  breaks: false
})

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function absolutizeUrl(url: string, baseUrl: string) {
  try {
    return new URL(url, baseUrl).href
  } catch {
    return url
  }
}

function buildHeaderHtml(source: MarkdownExportSource) {
  const meta = [
    `<a href="${escapeHtml(source.url)}">${escapeHtml(source.url)}</a>`,
    `抓取时间：${escapeHtml(
      new Date(source.capturedAt).toLocaleString("zh-CN")
    )}`
  ]

  if (source.byline) {
    meta.push(`作者：${escapeHtml(source.byline)}`)
  }

  return `
    <header class="web-export-markdown__header" data-export-block="header">
      <div class="web-export-markdown__eyebrow">Web Export</div>
      <h1>${escapeHtml(source.title || "Untitled page")}</h1>
      <div class="web-export-markdown__meta">
        ${meta.map((item) => `<span>${item}</span>`).join("")}
      </div>
      ${
        source.excerpt?.trim()
          ? `<p class="web-export-markdown__excerpt">${escapeHtml(
              source.excerpt.trim()
            )}</p>`
          : ""
      }
    </header>
  `.trim()
}

function normalizeDocumentHtml(html: string, baseUrl: string) {
  const doc = new DOMParser().parseFromString(html, "text/html")
  const root = doc.body.firstElementChild as HTMLElement | null

  if (!root) {
    return ""
  }

  root.querySelectorAll("a").forEach((link) => {
    const href = link.getAttribute("href")

    if (!href) {
      return
    }

    link.setAttribute("href", absolutizeUrl(href, baseUrl))
  })

  root.querySelectorAll("img").forEach((image) => {
    const src = image.getAttribute("src")

    if (src) {
      image.setAttribute("src", absolutizeUrl(src, baseUrl))
    }

    image.removeAttribute("srcset")
    image.removeAttribute("sizes")
    image.removeAttribute("loading")
    image.removeAttribute("decoding")
  })

  root.querySelectorAll("table").forEach((table) => {
    table.setAttribute("data-export-block", "table")
  })

  root.querySelectorAll("pre").forEach((pre) => {
    pre.setAttribute("data-export-block", "pre")
  })

  root.querySelectorAll("ul, ol").forEach((list) => {
    list.setAttribute("data-export-block", "list")
  })

  root
    .querySelectorAll(
      "p, blockquote, hr, h1, h2, h3, h4, h5, h6, figure, img"
    )
    .forEach((node) => {
      if (!node.getAttribute("data-export-block")) {
        node.setAttribute("data-export-block", node.tagName.toLowerCase())
      }
    })

  return root.outerHTML
}

async function blobToDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Failed to read binary blob"))
    reader.readAsDataURL(blob)
  })
}

function supportsInlineDataUrl(mimeType: string) {
  return [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/svg+xml",
    "image/webp"
  ].includes(mimeType.toLowerCase())
}

async function loadImageDimensions(src: string) {
  return await new Promise<{ width: number; height: number } | null>(
    (resolve) => {
      const image = new Image()

      image.onload = () => {
        resolve(
          image.naturalWidth > 0 && image.naturalHeight > 0
            ? { width: image.naturalWidth, height: image.naturalHeight }
            : null
        )
      }

      image.onerror = () => resolve(null)
      image.src = src
    }
  )
}

function buildImagePlaceholder(doc: Document) {
  const figure = doc.createElement("figure")
  figure.className = "web-export-markdown__image-placeholder"
  figure.setAttribute("data-export-block", "image")
  figure.innerHTML = `<div>图片未能成功嵌入导出结果</div>`
  return figure
}

async function inlineImagesInDocument(html: string, baseUrl: string) {
  const doc = new DOMParser().parseFromString(html, "text/html")
  const root = doc.body.firstElementChild as HTMLElement | null

  if (!root) {
    return { html: "", failed: 0 }
  }

  let failed = 0
  const images = Array.from(root.querySelectorAll("img"))

  await Promise.all(
    images.map(async (image) => {
      const rawSrc = image.getAttribute("src")?.trim()

      if (!rawSrc) {
        image.replaceWith(buildImagePlaceholder(doc))
        failed += 1
        return
      }

      const src = absolutizeUrl(rawSrc, baseUrl)

      try {
        const response = await fetch(src, { credentials: "include" })

        if (!response.ok) {
          throw new Error(`Image request failed with ${response.status}`)
        }

        const blob = await response.blob()
        let resolvedSrc = src

        if (supportsInlineDataUrl(blob.type || "")) {
          resolvedSrc = await blobToDataUrl(blob)
        }

        const dimensions = await loadImageDimensions(resolvedSrc)

        if (!dimensions) {
          throw new Error("Image size cannot be determined")
        }

        image.setAttribute("src", resolvedSrc)
        image.setAttribute("width", String(dimensions.width))
        image.setAttribute("height", String(dimensions.height))
        image.setAttribute("data-export-block", "image")
      } catch {
        image.replaceWith(buildImagePlaceholder(doc))
        failed += 1
      }
    })
  )

  return {
    html: root.outerHTML,
    failed
  }
}

export async function buildRenderedDocument(
  source: MarkdownExportSource
): Promise<RenderedDocument> {
  const markdownHtml = marked.parse(source.markdown || source.plainText || "")
  const documentHtml = `
    <article class="web-export-markdown">
      ${buildHeaderHtml(source)}
      <section class="web-export-markdown__body">
        ${markdownHtml}
      </section>
    </article>
  `.trim()

  const normalizedHtml = normalizeDocumentHtml(documentHtml, source.url)
  const prepared = await inlineImagesInDocument(normalizedHtml, source.url)

  return {
    html: prepared.html,
    imageFailures: prepared.failed
  }
}
