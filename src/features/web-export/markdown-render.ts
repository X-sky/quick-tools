import { marked } from "marked"

import type { MarkdownExportSource } from "./types"

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
    `来源：<a href="${source.url}" style="color:#7c4f1d;text-decoration:none;">${source.url}</a>`,
    `抓取时间：${new Date(source.capturedAt).toLocaleString("zh-CN")}`
  ]

  if (source.byline) {
    meta.push(`作者：${source.byline}`)
  }

  const excerpt = source.excerpt?.trim()
    ? `<p style="display:flex;flex-direction:column;margin-top:18px;margin-right:0;margin-bottom:0;margin-left:0;color:#7a5e40;font-size:24px;line-height:1.65;">${escapeHtml(
        source.excerpt.trim()
      )}</p>`
    : ""

  return `
    <section style="display:flex;flex-direction:column;margin-top:0;margin-right:0;margin-bottom:32px;margin-left:0;padding-top:0;padding-right:0;padding-bottom:28px;padding-left:0;border-bottom:1px solid #d8c3ab;">
      <h1 style="display:flex;flex-direction:column;margin-top:0;margin-right:0;margin-bottom:14px;margin-left:0;font-size:54px;line-height:1.15;color:#2f2115;font-weight:700;">${escapeHtml(
        source.title || "Untitled page"
      )}</h1>
      <div style="display:flex;flex-direction:column;row-gap:12px;color:#8a6a4b;font-size:21px;line-height:1.5;">
        ${meta.map((item) => `<span>${item}</span>`).join("")}
      </div>
      ${excerpt}
    </section>
  `.trim()
}

function walkAndStyleHtml(html: string, baseUrl: string) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html")
  const root = doc.body.firstElementChild as HTMLElement | null

  if (!root) {
    return ""
  }

  const elements = Array.from(root.querySelectorAll("*"))

  for (const element of elements) {
    const tag = element.tagName.toLowerCase()

    if (tag === "a") {
      const href = element.getAttribute("href")

      if (href) {
        element.setAttribute("href", absolutizeUrl(href, baseUrl))
      }

      element.setAttribute(
        "style",
        "color:#7c4f1d;text-decoration:none;border-bottom:1px solid rgba(124,79,29,0.35);"
      )
    }

    if (tag === "p") {
      element.setAttribute(
        "style",
        "display:flex;flex-direction:column;margin:0;color:#2f2115;font-size:28px;line-height:1.75;"
      )
    }

    if (/^h[1-6]$/.test(tag)) {
      const size =
        tag === "h1"
          ? 48
          : tag === "h2"
            ? 42
            : tag === "h3"
              ? 36
              : tag === "h4"
                ? 32
                : tag === "h5"
                  ? 28
                  : 26

      element.setAttribute(
        "style",
        `display:flex;flex-direction:column;margin:0;color:#2f2115;font-size:${size}px;line-height:1.25;font-weight:700;`
      )
    }

    if (tag === "ul" || tag === "ol") {
      element.setAttribute(
        "style",
        "display:flex;flex-direction:column;margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;padding-top:0;padding-right:0;padding-bottom:0;padding-left:30px;color:#2f2115;font-size:28px;line-height:1.75;"
      )
    }

    if (tag === "li") {
      element.setAttribute("style", "display:flex;margin:0;")
    }

    if (tag === "blockquote") {
      element.setAttribute(
        "style",
        "display:flex;flex-direction:column;margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;padding-top:16px;padding-right:20px;padding-bottom:16px;padding-left:20px;border-left:6px solid #c89d72;background:#f5ebde;color:#5f4934;font-size:26px;line-height:1.75;border-radius:12px;"
      )
    }

    if (tag === "pre") {
      element.setAttribute(
        "style",
        "display:flex;flex-direction:column;margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;padding-top:18px;padding-right:22px;padding-bottom:18px;padding-left:22px;background:#23170f;color:#f8ead8;border-radius:18px;font-size:22px;line-height:1.7;white-space:pre-wrap;word-break:break-word;"
      )
    }

    if (tag === "code" && element.parentElement?.tagName.toLowerCase() !== "pre") {
      element.setAttribute(
        "style",
        "display:flex;padding-top:3px;padding-right:8px;padding-bottom:3px;padding-left:8px;background:#f2e7d9;color:#8c4818;border-radius:8px;font-size:0.92em;"
      )
    }

    if (tag === "pre" || element.parentElement?.tagName.toLowerCase() === "pre") {
      element.setAttribute(
        "style",
        `${
          element.getAttribute("style") ?? ""
        }font-family:'Courier New','Menlo','Monaco',monospace;`
      )
    }

    if (tag === "table") {
      element.setAttribute(
        "style",
        "display:flex;flex-direction:column;width:100%;margin:0;border-collapse:collapse;font-size:24px;line-height:1.6;border-radius:14px;overflow:hidden;"
      )
    }

    if (tag === "thead" || tag === "tbody" || tag === "tr") {
      element.setAttribute("style", "display:flex;width:100%;")
    }

    if (tag === "th" || tag === "td") {
      const isHeader = tag === "th"
      element.setAttribute(
        "style",
        `display:flex;flex:1;border:1px solid #d8c3ab;padding-top:14px;padding-right:16px;padding-bottom:14px;padding-left:16px;text-align:left;background:${isHeader ? "#efe0cf" : "#fffdf8"};color:#2f2115;`
      )
    }

    if (tag === "hr") {
      element.setAttribute(
        "style",
        "display:flex;margin:0;border:none;border-top:1px solid #d8c3ab;"
      )
    }

    if (tag === "img") {
      const src = element.getAttribute("src")

      if (src) {
        element.setAttribute("src", absolutizeUrl(src, baseUrl))
      }

      element.setAttribute(
        "style",
        "display:flex;max-width:100%;height:auto;margin-top:0;margin-right:auto;margin-bottom:0;margin-left:auto;border-radius:18px;"
      )
    }
  }

  return root.innerHTML.trim()
}

function wrapRenderBlockHtml(html: string) {
  return `<section style="display:flex;flex-direction:column;width:100%;margin-top:0;margin-right:0;margin-bottom:24px;margin-left:0;">${html}</section>`
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
    "image/svg+xml"
  ].includes(mimeType.toLowerCase())
}

async function loadImageDimensions(src: string) {
  return await new Promise<{ width: number; height: number } | null>(
    (resolve) => {
      const image = new Image()

      image.onload = () => {
        resolve(
          image.naturalWidth > 0 && image.naturalHeight > 0
            ? {
                width: image.naturalWidth,
                height: image.naturalHeight
              }
            : null
        )
      }

      image.onerror = () => resolve(null)
      image.src = src
    }
  )
}

function buildImagePlaceholder(doc: Document) {
  const placeholder = doc.createElement("div")
  placeholder.setAttribute(
    "style",
    "display:flex;justify-content:center;margin-top:18px;margin-right:0;margin-bottom:18px;margin-left:0;padding-top:18px;padding-right:20px;padding-bottom:18px;padding-left:20px;border:1px dashed #d8c3ab;border-radius:18px;background:#fbf4ea;color:#8a6a4b;font-size:22px;line-height:1.6;text-align:center;"
  )
  placeholder.textContent = "图片未能成功嵌入导出结果"
  return placeholder
}

async function inlineImagesInHtml(html: string, baseUrl: string) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html")
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
        const response = await fetch(src, {
          credentials: "include"
        })

        if (!response.ok) {
          throw new Error(`Image request failed with ${response.status}`)
        }

        const blob = await response.blob()
        let resolvedSrc = src

        if (supportsInlineDataUrl(blob.type || "")) {
          const dataUrl = await blobToDataUrl(blob)
          resolvedSrc = dataUrl
        }

        const dimensions = await loadImageDimensions(resolvedSrc)

        if (!dimensions) {
          throw new Error("Image size cannot be determined")
        }

        image.setAttribute("src", resolvedSrc)
        image.setAttribute("width", String(dimensions.width))
        image.setAttribute("height", String(dimensions.height))
      } catch {
        image.replaceWith(buildImagePlaceholder(doc))
        failed += 1
      }
    })
  )

  return {
    html: root.innerHTML.trim(),
    failed
  }
}

export async function buildRenderBlocks(source: MarkdownExportSource) {
  const tokens = marked.lexer(source.markdown || source.plainText || "")
  const htmlBlocks = tokens
    .filter((token) => token.type !== "space")
    .map((token) => marked.parser([token]))
    .map((html) => walkAndStyleHtml(html, source.url))
    .map((html) => wrapRenderBlockHtml(html))
    .filter(Boolean)

  const normalizedBlocks = [buildHeaderHtml(source), ...htmlBlocks]
  const preparedBlocks = await Promise.all(
    normalizedBlocks.map(async (html) => {
      const prepared = await inlineImagesInHtml(html, source.url)
      return {
        html: prepared.html,
        imageFailures: prepared.failed
      }
    })
  )

  return {
    blocks: preparedBlocks.map((block) => block.html),
    imageFailures: preparedBlocks.reduce(
      (total, block) => total + block.imageFailures,
      0
    )
  }
}
