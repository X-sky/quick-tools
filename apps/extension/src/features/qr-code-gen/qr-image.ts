import { getPlatform } from "@quick-tools/platform"
import { qrImageFilename } from "@quick-tools/qr-code-gen"

import { getVisibleError } from "~platform/result"

/** Serialize a rendered QR <svg> at the requested pixel size. */
export function serializeQrSvg(svg: SVGSVGElement, size: number): string {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute("width", String(size))
  clone.setAttribute("height", String(size))
  clone.removeAttribute("class")
  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  }
  return new XMLSerializer().serializeToString(clone)
}

/** Rasterize a rendered QR <svg> into PNG bytes on a white background. */
export async function qrSvgToPng(
  svg: SVGSVGElement,
  size: number
): Promise<Uint8Array> {
  const svgData = serializeQrSvg(svg, size)
  const url = URL.createObjectURL(
    new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
  )
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("二维码图片加载失败"))
      img.src = url
    })
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("无法创建画布")
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, size, size)
    ctx.drawImage(img, 0, 0, size, size)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    )
    if (!blob) throw new Error("PNG 编码失败")
    return new Uint8Array(await blob.arrayBuffer())
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Save / copy actions shared by the free mode and template mode QR panels.
 * Each resolves to a user-facing message (null when the user cancelled).
 */
export async function saveQrPng(
  svg: SVGSVGElement,
  size: number,
  content: string,
  prefix = "qr"
): Promise<string | null> {
  try {
    const png = await qrSvgToPng(svg, size)
    const result = await getPlatform().fileDownloader.downloadWithDialog(
      png,
      qrImageFilename(content, "png", prefix),
      "image/png"
    )
    return result.ok ? "PNG 已保存" : getVisibleError(result)
  } catch {
    return "导出 PNG 失败"
  }
}

export async function saveQrSvg(
  svg: SVGSVGElement,
  size: number,
  content: string,
  prefix = "qr"
): Promise<string | null> {
  const result = await getPlatform().fileDownloader.downloadWithDialog(
    serializeQrSvg(svg, size),
    qrImageFilename(content, "svg", prefix),
    "image/svg+xml"
  )
  return result.ok ? "SVG 已保存" : getVisibleError(result)
}

export async function copyQrImage(
  svg: SVGSVGElement,
  size: number
): Promise<string> {
  try {
    const png = await qrSvgToPng(svg, size)
    const result = await getPlatform().clipboard.writeImage(png, "image/png")
    return result.ok ? "已复制到剪贴板" : "剪贴板写入失败，请检查权限"
  } catch {
    return "复制到剪贴板失败"
  }
}
