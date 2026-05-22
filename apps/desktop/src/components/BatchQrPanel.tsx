import { useState, useCallback, useRef } from "react"
import { QRCodeSVG } from "qrcode.react"
import { open } from "@tauri-apps/plugin-dialog"
import { writeFile } from "@tauri-apps/plugin-fs"

import { parseBatchContent } from "~/lib/batch-parser"
import type { BatchLineResult } from "~/lib/batch-parser"

export interface BatchQrItem {
  line: number
  content: string
  valid: boolean
  error?: string
}

interface BatchQrPanelProps {
  onBatchGenerate: (items: BatchQrItem[]) => void
  onBatchExport: (items: BatchQrItem[]) => void
}

interface ExportProgress {
  completed: number
  total: number
}

function sanitizeFilename(content: string): string {
  return content
    .slice(0, 20)
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, "_")
}

async function svgToPngBytes(
  svgElement: SVGSVGElement,
  size: number
): Promise<Uint8Array> {
  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(svgElement)
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
  const url = URL.createObjectURL(svgBlob)

  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      URL.revokeObjectURL(url)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create PNG blob"))
            return
          }
          blob.arrayBuffer().then((buffer) => {
            resolve(new Uint8Array(buffer))
          })
        },
        "image/png"
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to load SVG image"))
    }
    img.src = url
  })
}

export const BatchQrPanel = ({
  onBatchGenerate,
  onBatchExport
}: BatchQrPanelProps) => {
  const [batchText, setBatchText] = useState("")
  const [items, setItems] = useState<BatchLineResult[]>([])
  const [level] = useState<"L" | "M" | "Q" | "H">("M")
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  const handleGenerate = useCallback(() => {
    const parsed = parseBatchContent(batchText, level)
    setItems(parsed)
    onBatchGenerate(parsed)
  }, [batchText, level, onBatchGenerate])

  const handleExport = useCallback(async () => {
    const validItems = items.filter((item) => item.valid)
    if (validItems.length === 0) return

    const selectedDir = await open({
      directory: true,
      title: "选择导出文件夹"
    })

    if (!selectedDir) return

    setIsExporting(true)
    setExportProgress({ completed: 0, total: validItems.length })

    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i]!
      const filename = `qr-${i + 1}-${sanitizeFilename(item.content)}.png`
      const filePath = `${selectedDir}/${filename}`

      try {
        const container = document.createElement("div")
        container.style.position = "absolute"
        container.style.left = "-9999px"
        document.body.appendChild(container)

        const tempRoot = document.createElement("div")
        container.appendChild(tempRoot)

        const { createRoot } = await import("react-dom/client")
        const root = createRoot(tempRoot)

        await new Promise<void>((resolve) => {
          root.render(
            <QRCodeSVG value={item.content} size={256} level={level} />
          )
          setTimeout(resolve, 50)
        })

        const svgEl = tempRoot.querySelector("svg") as SVGSVGElement
        if (svgEl) {
          const pngBytes = await svgToPngBytes(svgEl, 256)
          await writeFile(filePath, pngBytes)
        }

        root.unmount()
        document.body.removeChild(container)
      } catch {
        // Continue processing remaining items on failure
      }

      setExportProgress({ completed: i + 1, total: validItems.length })
    }

    setIsExporting(false)
    setExportProgress(null)
    onBatchExport(items)
  }, [items, level, onBatchExport])

  const validCount = items.filter((item) => item.valid).length
  const invalidCount = items.filter((item) => !item.valid).length

  return (
    <div className="flex flex-col gap-4">
      {/* Multi-line text input */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          批量内容（每行一条）
        </label>
        <textarea
          value={batchText}
          onChange={(e) => setBatchText(e.target.value)}
          placeholder={"输入多行文本，每行生成一个二维码\n例如：\nhttps://example.com\nhello world\n12345"}
          rows={6}
          className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-400"
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleGenerate}
          disabled={!batchText.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600">
          批量生成
        </button>
        <button
          onClick={handleExport}
          disabled={validCount === 0 || isExporting}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
          批量导出
        </button>

        {items.length > 0 && (
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            共 {items.length} 条，有效 {validCount} 条
            {invalidCount > 0 && (
              <span className="text-red-500 dark:text-red-400">
                ，超限 {invalidCount} 条
              </span>
            )}
          </span>
        )}
      </div>

      {/* Export progress */}
      {exportProgress && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="text-sm text-blue-700 dark:text-blue-300">
            正在导出... {exportProgress.completed}/{exportProgress.total}
          </span>
          <div className="flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-blue-200 dark:bg-blue-800">
              <div
                className="h-full rounded-full bg-blue-600 transition-all dark:bg-blue-400"
                style={{
                  width: `${(exportProgress.completed / exportProgress.total) * 100}%`
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* QR code grid preview */}
      {items.length > 0 && (
        <div
          ref={gridRef}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <div
              key={item.line}
              className={`flex flex-col items-center gap-2 rounded-lg border p-3 ${
                item.valid
                  ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                  : "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20"
              }`}>
              {item.valid ? (
                <QRCodeSVG value={item.content} size={100} level={level} />
              ) : (
                <div className="flex h-[100px] w-[100px] items-center justify-center text-center">
                  <span className="text-xs text-red-600 dark:text-red-400">
                    超出容量
                  </span>
                </div>
              )}
              <p
                className={`w-full truncate text-center text-xs ${
                  item.valid
                    ? "text-gray-600 dark:text-gray-400"
                    : "text-red-600 dark:text-red-400"
                }`}
                title={item.content}>
                {item.content}
              </p>
              {item.error && (
                <p className="w-full truncate text-center text-xs text-red-500" title={item.error}>
                  {item.error}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
