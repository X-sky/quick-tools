import { Resvg } from "@resvg/resvg-wasm"
import { decode, encode } from "fast-png"
import React from "react"
import satori from "satori"

import {
  CONTENT_WIDTH,
  PAGE_PADDING_X,
  PAGE_PADDING_Y,
  PAGE_WIDTH,
  SINGLE_PNG_MAX_BYTES,
  SINGLE_PNG_MAX_DIMENSION
} from "./render-constants"
import type { RenderPage, RendererAssets } from "./types"

function buildPageMarkup(page: RenderPage, index: number, total: number) {
  return `
    <div style="display:flex;flex-direction:column;justify-content:space-between;width:${PAGE_WIDTH}px;height:${page.height}px;padding-top:${PAGE_PADDING_Y}px;padding-right:${PAGE_PADDING_X}px;padding-bottom:${PAGE_PADDING_Y}px;padding-left:${PAGE_PADDING_X}px;box-sizing:border-box;background:#f6efe6;font-family:'Arial Unicode MS','PingFang SC','Hiragino Sans GB',sans-serif;">
      <div style="display:flex;flex-direction:column;width:${CONTENT_WIDTH}px;">
        ${page.html}
      </div>
      <div style="margin-top:26px;color:#8a6a4b;font-size:18px;line-height:1.4;text-align:right;">${index + 1} / ${total}</div>
    </div>
  `.trim()
}

function styleStringToObject(styleText: string) {
  return styleText
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((styles, entry) => {
      const [property, ...rest] = entry.split(":")

      if (!property || rest.length === 0) {
        return styles
      }

      const value = rest.join(":").trim()
      const key = property
        .trim()
        .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())

      styles[key] = value
      return styles
    }, {})
}

function toNumericProp(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : value
}

function domNodeToReact(node: ChildNode, key: string): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null
  }

  const element = node as HTMLElement
  const props: Record<string, unknown> = { key }

  for (const attribute of Array.from(element.attributes)) {
    if (attribute.name === "style") {
      props.style = styleStringToObject(attribute.value)
      continue
    }

    if (attribute.name === "class") {
      continue
    }

    if (attribute.name === "colspan") {
      props.colSpan = Number(attribute.value)
      continue
    }

    if (attribute.name === "rowspan") {
      props.rowSpan = Number(attribute.value)
      continue
    }

    if (attribute.name === "width" || attribute.name === "height") {
      props[attribute.name] = toNumericProp(attribute.value)
      continue
    }

    props[attribute.name] = attribute.value
  }

  const existingStyle = (props.style as Record<string, string> | undefined) ?? {}
  const hasMultipleChildren =
    Array.from(element.childNodes).filter((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        return Boolean(child.textContent?.trim())
      }

      return child.nodeType === Node.ELEMENT_NODE
    }).length > 1

  if (
    element.tagName.toLowerCase() === "div" &&
    hasMultipleChildren &&
    !existingStyle.display
  ) {
    props.style = {
      ...existingStyle,
      display: "flex",
      flexDirection: "column"
    }
  }

  const children = Array.from(element.childNodes).map((child, index) =>
    domNodeToReact(child, `${key}-${index}`)
  )

  return React.createElement(
    element.tagName.toLowerCase(),
    props,
    ...(children.length > 0 ? children : [])
  )
}

function htmlToSatoriNode(markup: string) {
  const doc = new DOMParser().parseFromString(markup, "text/html")
  const root = doc.body.firstElementChild

  if (!root) {
    return React.createElement("div", null)
  }

  return domNodeToReact(root, "root") as React.ReactElement
}

export async function renderPagePngBytes(
  page: RenderPage,
  index: number,
  total: number,
  assets: RendererAssets
) {
  const svg = await satori(htmlToSatoriNode(buildPageMarkup(page, index, total)), {
    width: PAGE_WIDTH,
    height: page.height,
    fonts: [
      {
        name: "Arial Unicode MS",
        data: assets.bodyFontBuffer,
        weight: 400,
        style: "normal"
      },
      {
        name: "Courier New",
        data: assets.monoFontBuffer,
        weight: 400,
        style: "normal"
      }
    ]
  })

  const resvg = new Resvg(svg, {
    background: "#f6efe6",
    font: {
      fontBuffers: [assets.bodyFontBytes, assets.monoFontBytes],
      defaultFontFamily: "Arial Unicode MS",
      monospaceFamily: "Courier New"
    }
  })

  return resvg.render().asPng()
}

export function canMergeIntoSinglePng(pagePngs: Uint8Array[]) {
  const decodedPages = pagePngs.map((bytes) => decode(bytes))
  const mergedWidth = decodedPages[0]?.width ?? 0
  const mergedHeight = decodedPages.reduce((sum, page) => sum + page.height, 0)
  const mergedBytes = mergedWidth * mergedHeight * 4

  return (
    mergedWidth <= SINGLE_PNG_MAX_DIMENSION &&
    mergedHeight <= SINGLE_PNG_MAX_DIMENSION &&
    mergedBytes <= SINGLE_PNG_MAX_BYTES
  )
}

export function mergePngPages(pagePngs: Uint8Array[]) {
  const decodedPages = pagePngs.map((bytes) => decode(bytes))
  const mergedWidth = decodedPages[0].width
  const mergedHeight = decodedPages.reduce((sum, page) => sum + page.height, 0)
  const data = new Uint8Array(mergedWidth * mergedHeight * 4)

  let offsetY = 0

  for (const page of decodedPages) {
    const rgba = page.data as Uint8Array

    for (let row = 0; row < page.height; row += 1) {
      const sourceStart = row * page.width * 4
      const sourceEnd = sourceStart + page.width * 4
      const targetStart = (offsetY + row) * mergedWidth * 4
      data.set(rgba.subarray(sourceStart, sourceEnd), targetStart)
    }

    offsetY += page.height
  }

  return encode({
    width: mergedWidth,
    height: mergedHeight,
    data,
    channels: 4,
    depth: 8
  })
}

export function bytesToObjectUrl(bytes: Uint8Array, mimeType: string) {
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }))
}

export async function downloadObjectUrl(url: string, filename: string) {
  await chrome.downloads.download({
    url,
    filename
  })

  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export function buildPageFilename(base: string, index: number, total: number) {
  return total > 1
    ? `${base}-p${String(index + 1).padStart(2, "0")}.png`
    : `${base}.png`
}
