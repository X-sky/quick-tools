import { initWasm } from "@resvg/resvg-wasm"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"

let initialized = false
export async function ensureResvgWasm(): Promise<void> {
  if (initialized) return
  const require = createRequire(import.meta.url)
  const wasmPath = require.resolve("@resvg/resvg-wasm/index_bg.wasm")
  const buf = readFileSync(wasmPath)
  await initWasm(buf)
  initialized = true
}
