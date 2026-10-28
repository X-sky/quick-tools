#!/usr/bin/env node
/**
 * prepare-pdf-fonts.mjs
 *
 * 修正 satori 0.12 + opentype.js 1.4.0-beta 解析失败的 TTF 字体：
 *   - public/fonts/Arial Unicode.ttf — macOS fontd 输出的"DSIG 优先"TTF，
 *     旧版 opentype.js 在解析非 DSIG 表时会跑偏。
 *   - public/fonts/Courier New.ttf — 实际是 SFNSMono，variable font，
 *     opentype.js 在解析 fvar.axisSize=258 越界时崩溃。
 *
 * 修复策略：用 fonttools 把 DSIG 删掉 / fvar 拍平成 static instance，
 * 输出 `*.fixed.ttf`，satori 加载这些 fixed 版本即可。
 *
 * 用法：
 *   pnpm --filter @quick-tools/desktop prepare-fonts
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PUBLIC_FONTS = resolve(__dirname, "..", "public", "fonts")
const NODE_MODULES = resolve(__dirname, "..", "..", "..", "node_modules")

async function tryLoadFonttools() {
  // 尝试 node API（若有 @types/fonttools 失败时回退）
  const candidates = [
    resolve(NODE_MODULES, ".pnpm", "fonttools"),
    resolve(NODE_MODULES, "fonttools")
  ]
  for (const c of candidates) {
    const index = resolve(c, "..", "fonttools", "Lib", "__init__.py")
  }
  // 优先用命令行 fonttools（pyftsubset / pyftremove）；否则回退到子进程调用 python
  // 这里直接调 Python：
  return { usePython: true }
}

const JOBS = [
  {
    src: "Arial Unicode.ttf",
    script: `
from fontTools.ttLib import TTFont
import sys
src = sys.argv[1]
dst = sys.argv[2]
font = TTFont(src)
if "DSIG" in font:
    del font["DSIG"]
font.flavor = None
font.save(dst)
print(f"WROTE {dst}")
`
  },
  {
    src: "Courier New.ttf",
    script: `
from fontTools.ttLib import TTFont
import sys
src = sys.argv[1]
dst = sys.argv[2]
font = TTFont(src)
for tag in ("fvar", "gvar", "HVAR", "MVAR", "STAT"):
    if tag in font:
        del font[tag]
font.flavor = None
font.save(dst)
print(f"WROTE {dst}")
`
  }
]

async function runPython(script, src, dst) {
  const { spawn } = await import("node:child_process")
  return new Promise((res, rej) => {
    const p = spawn("python3", ["-c", script, src, dst], { stdio: "inherit" })
    p.on("exit", (code) => (code === 0 ? res() : rej(new Error("python exit " + code))))
  })
}

async function main() {
  const { usePython } = await tryLoadFonttools()
  if (!usePython) throw new Error("internal: non-python path not implemented")
  for (const job of JOBS) {
    const src = resolve(PUBLIC_FONTS, job.src)
    const dst = src + ".fixed.ttf"
    if (!existsSync(src)) {
      console.warn(`[fonts] skip missing source: ${job.src}`)
      continue
    }
    if (existsSync(dst) && statSync(dst).mtimeMs > statSync(src).mtimeMs) {
      console.log(`[fonts] up-to-date: ${job.src} → ${job.src}.fixed.ttf`)
      continue
    }
    console.log(`[fonts] preparing ${job.src}…`)
    await runPython(job.script, src, dst)
  }
  console.log("[fonts] done")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
