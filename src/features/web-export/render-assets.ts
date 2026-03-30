import { initWasm } from "@resvg/resvg-wasm"

import bodyFontUrl from "data-url:../../assets/fonts/Arial Unicode.ttf"
import monoFontUrl from "data-url:../../assets/fonts/Courier New.ttf"
import resvgWasmUrl from "data-url:../../assets/resvg-index_bg.wasm"

import type { RendererAssets } from "./types"

let rendererAssetsPromise: Promise<RendererAssets> | null = null

async function loadBinaryAsset(url: string) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to load asset: ${url}`)
  }

  return new Uint8Array(await response.arrayBuffer())
}

function toExactArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  )
}

export async function getRendererAssets() {
  if (!rendererAssetsPromise) {
    rendererAssetsPromise = (async () => {
      const [wasmBinary, bodyFont, monoFont] = await Promise.all([
        loadBinaryAsset(resvgWasmUrl),
        loadBinaryAsset(bodyFontUrl),
        loadBinaryAsset(monoFontUrl)
      ])

      await initWasm(wasmBinary)

      return {
        bodyFontBytes: bodyFont,
        monoFontBytes: monoFont,
        bodyFontBuffer: toExactArrayBuffer(bodyFont),
        monoFontBuffer: toExactArrayBuffer(monoFont)
      }
    })()
  }

  return rendererAssetsPromise
}
