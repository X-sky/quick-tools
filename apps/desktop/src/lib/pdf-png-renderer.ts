import { Resvg } from "@resvg/resvg-wasm"
import type { Token, Tokens } from "marked"
import { marked } from "marked"
import { PDFDocument } from "pdf-lib"
import satori from "satori"

import type { MarkdownExportSource } from "@quick-tools/web-export"

export interface RenderOptions {
  width: number
  pageSize?: "A4"
  fonts: {
    body: ArrayBuffer
    mono: ArrayBuffer
  }
}

type SatoriNode =
  | string
  | {
      type: string
      props: Record<string, unknown> & { children?: SatoriNode | SatoriNode[] }
    }

const A4_WIDTH_PX = 794
const A4_HEIGHT_PX = 1123
const PAGE_PADDING = 40
const HEADER_GAP = 24

// --- Markdown to Satori element tree ---

function tokenToNodes(tokens: Token[]): SatoriNode[] {
  const nodes: SatoriNode[] = []

  for (const token of tokens) {
    switch (token.type) {
      case "heading": {
        const heading = token as Tokens.Heading
        const tag = `h${heading.depth}` as string
        const fontSize =
          heading.depth === 1
            ? 28
            : heading.depth === 2
              ? 24
              : heading.depth === 3
                ? 20
                : heading.depth === 4
                  ? 18
                  : 16
        nodes.push({
          type: tag,
          props: {
            style: {
              fontSize,
              fontWeight: 700,
              marginTop: 16,
              marginBottom: 8,
              lineHeight: 1.3
            },
            children: tokenToNodes(heading.tokens || [])
          }
        })
        break
      }
      case "paragraph": {
        const para = token as Tokens.Paragraph
        nodes.push({
          type: "p",
          props: {
            style: {
              fontSize: 14,
              lineHeight: 1.7,
              marginBottom: 12
            },
            children: tokenToNodes(para.tokens || [])
          }
        })
        break
      }
      case "text": {
        const text = token as Tokens.Text
        if ("tokens" in text && text.tokens && text.tokens.length > 0) {
          nodes.push(...tokenToNodes(text.tokens))
        } else {
          nodes.push(text.text || "")
        }
        break
      }
      case "strong": {
        const strong = token as Tokens.Strong
        nodes.push({
          type: "span",
          props: {
            style: { fontWeight: 700 },
            children: tokenToNodes(strong.tokens || [])
          }
        })
        break
      }
      case "em": {
        const em = token as Tokens.Em
        nodes.push({
          type: "span",
          props: {
            style: { fontStyle: "italic" },
            children: tokenToNodes(em.tokens || [])
          }
        })
        break
      }
      case "codespan": {
        const codespan = token as Tokens.Codespan
        nodes.push({
          type: "span",
          props: {
            style: {
              fontFamily: "Mono",
              fontSize: 13,
              backgroundColor: "#f0f0f0",
              padding: "2px 4px",
              borderRadius: 3
            },
            children: codespan.text
          }
        })
        break
      }
      case "code": {
        const code = token as Tokens.Code
        nodes.push({
          type: "div",
          props: {
            style: {
              fontFamily: "Mono",
              fontSize: 12,
              lineHeight: 1.5,
              backgroundColor: "#f5f5f5",
              padding: 12,
              borderRadius: 4,
              marginBottom: 12,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all"
            },
            children: code.text
          }
        })
        break
      }
      case "blockquote": {
        const bq = token as Tokens.Blockquote
        nodes.push({
          type: "div",
          props: {
            style: {
              borderLeft: "3px solid #ddd",
              paddingLeft: 12,
              marginBottom: 12,
              color: "#666"
            },
            children: tokenToNodes(bq.tokens || [])
          }
        })
        break
      }
      case "list": {
        const list = token as Tokens.List
        const items = (list.items || []).map(
          (item: Tokens.ListItem, i: number) => ({
            type: "div",
            props: {
              style: {
                display: "flex",
                marginBottom: 4
              },
              children: [
                {
                  type: "span",
                  props: {
                    style: {
                      marginRight: 8,
                      minWidth: 16
                    },
                    children: list.ordered ? `${i + 1}.` : "•"
                  }
                },
                {
                  type: "span",
                  props: {
                    style: { flex: 1 },
                    children: tokenToNodes(item.tokens || [])
                  }
                }
              ]
            }
          })
        )
        nodes.push({
          type: "div",
          props: {
            style: { marginBottom: 12 },
            children: items
          }
        })
        break
      }
      case "link": {
        const link = token as Tokens.Link
        nodes.push({
          type: "span",
          props: {
            style: { color: "#2563eb" },
            children: tokenToNodes(link.tokens || [])
          }
        })
        break
      }
      case "image": {
        const img = token as Tokens.Image
        nodes.push({
          type: "div",
          props: {
            style: {
              marginBottom: 12,
              color: "#999",
              fontSize: 12
            },
            children: `[图片: ${img.text || img.href || ""}]`
          }
        })
        break
      }
      case "hr": {
        nodes.push({
          type: "div",
          props: {
            style: {
              borderBottom: "1px solid #e5e5e5",
              marginTop: 16,
              marginBottom: 16
            },
            children: ""
          }
        })
        break
      }
      case "space": {
        break
      }
      case "html": {
        // Skip raw HTML in satori rendering
        break
      }
      default: {
        if ("text" in token && typeof token.text === "string") {
          nodes.push(token.text)
        }
        break
      }
    }
  }

  return nodes
}

function buildHeaderElement(source: MarkdownExportSource): SatoriNode {
  const metaItems: SatoriNode[] = [
    {
      type: "span",
      props: {
        style: { color: "#2563eb", fontSize: 12 },
        children: source.url
      }
    },
    {
      type: "span",
      props: {
        style: { color: "#888", fontSize: 12 },
        children: `抓取时间：${new Date(source.capturedAt).toLocaleString("zh-CN")}`
      }
    }
  ]

  if (source.byline) {
    metaItems.push({
      type: "span",
      props: {
        style: { color: "#888", fontSize: 12 },
        children: `作者：${source.byline}`
      }
    })
  }

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
        borderBottom: "1px solid #e5e5e5",
        paddingBottom: HEADER_GAP,
        marginBottom: HEADER_GAP
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              fontSize: 10,
              color: "#999",
              textTransform: "uppercase",
              letterSpacing: 1
            },
            children: "Web Export"
          }
        },
        {
          type: "div",
          props: {
            style: {
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1.3
            },
            children: source.title || "Untitled page"
          }
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 4
            },
            children: metaItems
          }
        }
      ]
    }
  }
}

function markdownToSatoriTree(
  markdown: string,
  source: MarkdownExportSource,
  width: number,
  includeHeader: boolean
): SatoriNode {
  const tokens = marked.lexer(markdown)
  const contentNodes = tokenToNodes(tokens)

  const children: SatoriNode[] = []
  if (includeHeader) {
    children.push(buildHeaderElement(source))
  }
  children.push(...contentNodes)

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: width - PAGE_PADDING * 2,
        padding: PAGE_PADDING,
        backgroundColor: "#ffffff",
        color: "#1a1a1a",
        fontFamily: "Body",
        fontSize: 14,
        lineHeight: 1.7
      },
      children
    }
  }
}

function buildPageTree(
  contentNodes: SatoriNode[],
  width: number,
  height: number,
  pageIndex: number,
  totalPages: number,
  source: MarkdownExportSource,
  includeHeader: boolean
): SatoriNode {
  const children: SatoriNode[] = []
  if (includeHeader) {
    children.push(buildHeaderElement(source))
  }
  children.push(...contentNodes)

  // Add page footer
  children.push({
    type: "div",
    props: {
      style: {
        position: "absolute",
        bottom: 20,
        left: PAGE_PADDING,
        right: PAGE_PADDING,
        textAlign: "center",
        fontSize: 10,
        color: "#999"
      },
      children: `${pageIndex + 1} / ${totalPages}`
    }
  })

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width,
        height,
        padding: PAGE_PADDING,
        backgroundColor: "#ffffff",
        color: "#1a1a1a",
        fontFamily: "Body",
        fontSize: 14,
        lineHeight: 1.7,
        position: "relative"
      },
      children
    }
  }
}

// --- Rendering functions ---

async function renderSvgToPng(svg: string): Promise<Uint8Array> {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "original" }
  })
  const rendered = resvg.render()
  return rendered.asPng()
}

export async function renderToPng(
  markdown: string,
  source: MarkdownExportSource,
  options: RenderOptions
): Promise<Uint8Array> {
  const width = options.width || 800

  const tree = markdownToSatoriTree(markdown, source, width, true)

  const svg = await satori(tree as React.ReactNode, {
    width,
    fonts: [
      {
        name: "Body",
        data: options.fonts.body,
        weight: 400,
        style: "normal"
      },
      {
        name: "Body",
        data: options.fonts.body,
        weight: 700,
        style: "normal"
      },
      {
        name: "Mono",
        data: options.fonts.mono,
        weight: 400,
        style: "normal"
      }
    ]
  })

  return renderSvgToPng(svg)
}

export async function renderToPdf(
  markdown: string,
  source: MarkdownExportSource,
  options: RenderOptions
): Promise<Uint8Array> {
  const width = A4_WIDTH_PX
  const height = A4_HEIGHT_PX
  const contentHeight = height - PAGE_PADDING * 2 - 40 // reserve footer space

  // Parse markdown tokens and convert to nodes
  const tokens = marked.lexer(markdown)
  const allNodes = tokenToNodes(tokens)

  // Simple pagination: split nodes into pages based on estimated height
  const pages: SatoriNode[][] = []
  let currentPage: SatoriNode[] = []
  let currentHeight = 0
  const firstPageHeaderHeight = 120 // approximate header height

  for (let i = 0; i < allNodes.length; i++) {
    const node = allNodes[i]!
    const nodeHeight = estimateNodeHeight(node)
    const maxHeight =
      pages.length === 0
        ? contentHeight - firstPageHeaderHeight
        : contentHeight

    if (currentHeight + nodeHeight > maxHeight && currentPage.length > 0) {
      pages.push(currentPage)
      currentPage = [node]
      currentHeight = nodeHeight
    } else {
      currentPage.push(node)
      currentHeight += nodeHeight
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage)
  }

  // Ensure at least one page
  if (pages.length === 0) {
    pages.push([])
  }

  const totalPages = pages.length
  const pdf = await PDFDocument.create()

  const fonts = [
    {
      name: "Body",
      data: options.fonts.body,
      weight: 400 as const,
      style: "normal" as const
    },
    {
      name: "Body",
      data: options.fonts.body,
      weight: 700 as const,
      style: "normal" as const
    },
    {
      name: "Mono",
      data: options.fonts.mono,
      weight: 400 as const,
      style: "normal" as const
    }
  ]

  for (let i = 0; i < totalPages; i++) {
    const pageNodes = pages[i]!
    const pageTree = buildPageTree(
      pageNodes,
      width,
      height,
      i,
      totalPages,
      source,
      i === 0 // only first page has header
    )

    const svg = await satori(pageTree as React.ReactNode, {
      width,
      height,
      fonts
    })

    const pngBytes = await renderSvgToPng(svg)
    const pngImage = await pdf.embedPng(pngBytes)

    // A4 in points: 595.28 x 841.89
    const pageWidthPt = 595.28
    const pageHeightPt = 841.89
    const page = pdf.addPage([pageWidthPt, pageHeightPt])

    page.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: pageWidthPt,
      height: pageHeightPt
    })
  }

  return pdf.save()
}

// --- Height estimation for pagination ---

function estimateNodeHeight(node: SatoriNode): number {
  if (typeof node === "string") {
    // Rough estimate: 20px per line, ~60 chars per line at 14px font
    const lines = Math.max(1, Math.ceil(node.length / 60))
    return lines * 20
  }

  if (!node || !node.props) return 20

  const style = (node.props.style as Record<string, unknown>) || {}
  const fontSize = (style.fontSize as number) || 14
  const marginBottom = (style.marginBottom as number) || 0
  const marginTop = (style.marginTop as number) || 0
  const padding = (style.padding as number) || 0

  let baseHeight = fontSize * 1.7 + marginBottom + marginTop + padding * 2

  const children = node.props.children
  if (Array.isArray(children)) {
    let childrenHeight = 0
    for (const child of children) {
      childrenHeight += estimateNodeHeight(child as SatoriNode)
    }
    baseHeight = Math.max(baseHeight, childrenHeight + marginBottom + marginTop)
  } else if (typeof children === "string") {
    const lines = Math.max(1, Math.ceil(children.length / 60))
    baseHeight = Math.max(baseHeight, lines * (fontSize * 1.7) + marginBottom)
  }

  return baseHeight
}
