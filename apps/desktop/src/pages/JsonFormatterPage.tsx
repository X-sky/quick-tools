import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  formatJson,
  minifyJson,
  parseJsonOrJsObject
} from "@quick-tools/json-formatter"
import { getPlatform } from "@quick-tools/platform"
import type { Diagnostic } from "@codemirror/lint"
import { readTextFile } from "@tauri-apps/plugin-fs"

import { CodeMirrorEditor } from "~/components/CodeMirrorEditor"
import { DiffViewer } from "~/components/DiffViewer"
import { ResizableSplitPane } from "~/components/ResizableSplitPane"
import { Toast } from "~/components/Toast"
import { useDebounce } from "~/hooks/useDebounce"
import { useToast } from "~/hooks/useToast"
import { openJsonFile } from "~/platform/file-opener"

type EditorMode = "format" | "diff"

export default function JsonFormatterPage() {
  const [mode, setMode] = useState<EditorMode>("format")
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [diffLeft, setDiffLeft] = useState("")
  const [diffRight, setDiffRight] = useState("")
  const [filePath, setFilePath] = useState<string | null>(null)

  const { toast, showToast, hideToast } = useToast()
  const containerRef = useRef<HTMLDivElement>(null)

  const debouncedInput = useDebounce(input, 300)

  // Auto-format on debounced input change
  useEffect(() => {
    if (mode !== "format") return
    if (!debouncedInput.trim()) {
      setOutput("")
      setError(null)
      return
    }
    try {
      const parsed = parseJsonOrJsObject(debouncedInput)
      setOutput(formatJson(parsed))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "格式化失败")
    }
  }, [debouncedInput, mode])

  // Compute diagnostics for the input editor
  const diagnostics: Diagnostic[] = useMemo(() => {
    if (!input.trim()) return []
    try {
      JSON.parse(input)
      return []
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      const text = input
      const docLength = text.length

      // Try to extract position from error message
      const lineColMatch = message.match(/at line (\d+) column (\d+)/)
      const posMatch = message.match(/at position (\d+)/)

      let from = 0
      let to = Math.min(1, docLength)

      if (lineColMatch && lineColMatch[1] && lineColMatch[2]) {
        const line = parseInt(lineColMatch[1], 10)
        const col = parseInt(lineColMatch[2], 10)
        // Convert line/col to offset
        const lines = text.split("\n")
        let offset = 0
        for (let i = 0; i < Math.min(line - 1, lines.length); i++) {
          offset += (lines[i]?.length ?? 0) + 1
        }
        offset += Math.max(0, col - 1)
        from = Math.max(0, Math.min(offset, docLength))
        to = Math.max(from, Math.min(from + 1, docLength))
      } else if (posMatch && posMatch[1]) {
        from = Math.max(0, Math.min(parseInt(posMatch[1], 10), docLength))
        to = Math.max(from, Math.min(from + 1, docLength))
      }

      return [{ from, to, severity: "error", message }]
    }
  }, [input])

  // Format action
  const handleFormat = useCallback(() => {
    if (!input.trim()) return
    try {
      const parsed = parseJsonOrJsObject(input)
      const formatted = formatJson(parsed)
      setOutput(formatted)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "格式化失败")
    }
  }, [input])

  // Minify action
  const handleMinify = useCallback(() => {
    if (!input.trim()) return
    try {
      const parsed = parseJsonOrJsObject(input)
      const minified = minifyJson(parsed)
      setOutput(minified)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "压缩失败")
    }
  }, [input])

  // Toggle diff mode
  const handleToggleDiff = useCallback(() => {
    if (mode === "format") {
      setMode("diff")
      setDiffLeft(input)
      setDiffRight(output)
    } else {
      setMode("format")
    }
  }, [mode, input, output])

  // Open file
  const handleOpenFile = useCallback(async () => {
    const result = await openJsonFile()
    if (result.ok) {
      setInput(result.value)
      setFilePath(null)
      showToast("文件已加载", "success")
    } else if (result.error.category !== "cancelled") {
      showToast(result.error.message, "error")
    }
  }, [showToast])

  // Save file
  const handleSaveFile = useCallback(async () => {
    const content = output || input
    if (!content.trim()) {
      showToast("没有可保存的内容", "info")
      return
    }
    const platform = getPlatform()
    const result = await platform.fileDownloader.downloadWithDialog(
      content,
      "formatted.json",
      "application/json"
    )
    if (result.ok) {
      showToast("文件已保存", "success")
    } else if (result.error.category !== "cancelled") {
      showToast(result.error.message, "error")
    }
  }, [output, input, showToast])

  // Copy result
  const handleCopyResult = useCallback(async () => {
    const content = output || input
    if (!content.trim()) {
      showToast("没有可复制的内容", "info")
      return
    }
    const platform = getPlatform()
    const result = await platform.clipboard.writeText(content)
    if (result.ok) {
      showToast("已复制到剪贴板", "success")
    } else {
      showToast("剪贴板写入失败", "error")
    }
  }, [output, input, showToast])

  // Paste from clipboard
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setInput(text)
        showToast("已从剪贴板粘贴", "success")
      } else {
        showToast("剪贴板为空", "info")
      }
    } catch {
      showToast("读取剪贴板失败", "error")
    }
  }, [showToast])

  // Ctrl+S / Cmd+S shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        void handleSaveFile()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleSaveFile])

  // File drag and drop
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return

      const file = files[0]
      if (!file) return

      // In Tauri, we can get the file path from the drop event
      // and use readTextFile to read it
      const path = (file as unknown as { path?: string }).path
      if (path) {
        try {
          const content = await readTextFile(path)
          setInput(content)
          setFilePath(path)
          showToast("文件已加载", "success")
        } catch {
          showToast("读取文件失败", "error")
        }
      } else {
        // Fallback: use FileReader for web-style file reading
        const reader = new FileReader()
        reader.onload = (event) => {
          const content = event.target?.result
          if (typeof content === "string") {
            setInput(content)
            setFilePath(file.name)
            showToast("文件已加载", "success")
          }
        }
        reader.onerror = () => {
          showToast("读取文件失败", "error")
        }
        reader.readAsText(file)
      }
    }

    container.addEventListener("dragover", handleDragOver)
    container.addEventListener("drop", handleDrop)
    return () => {
      container.removeEventListener("dragover", handleDragOver)
      container.removeEventListener("drop", handleDrop)
    }
  }, [showToast])

  // Character count
  const charCount = input.length

  return (
    <div ref={containerRef} className="flex h-full flex-col">
      {/* Top Toolbar */}
      <div className="flex flex-shrink-0 items-center gap-1.5 border-b border-stone-200 bg-white px-4 py-2.5 dark:border-stone-800 dark:bg-stone-900">
        <div className="toolbar">
          <button onClick={handleFormat} className="toolbar-btn-primary">
            格式化
          </button>
          <button onClick={handleMinify} className="toolbar-btn">
            压缩
          </button>
          <div className="toolbar-divider" />
          <button
            onClick={handleToggleDiff}
            className={mode === "diff" ? "toolbar-btn-primary" : "toolbar-btn"}>
            {mode === "diff" ? "退出对比" : "Diff 对比"}
          </button>
        </div>

        <div className="mx-2 h-4 w-px bg-stone-200 dark:bg-stone-700" />

        <div className="toolbar">
          <button onClick={handleOpenFile} className="toolbar-btn">
            📂 打开
          </button>
          <button onClick={handleSaveFile} className="toolbar-btn">
            💾 保存
          </button>
          <div className="toolbar-divider" />
          <button onClick={handleCopyResult} className="toolbar-btn">
            📋 复制
          </button>
          <button onClick={handlePasteFromClipboard} className="toolbar-btn">
            📥 粘贴
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="min-h-0 flex-1">
        {mode === "format" ? (
          <ResizableSplitPane
            left={
              <CodeMirrorEditor
                value={input}
                onChange={setInput}
                language="json"
                diagnostics={diagnostics}
                placeholder="输入 JSON 或 JS 对象..."
              />
            }
            right={
              <CodeMirrorEditor
                value={output}
                readOnly
                language="json"
                placeholder="格式化结果..."
              />
            }
          />
        ) : (
          <DiffViewer left={diffLeft} right={diffRight} />
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="status-bar">
        {error && (
          <span className="text-rose-600 dark:text-rose-400">
            ⚠ {error}
          </span>
        )}
        {filePath && (
          <span className="truncate" title={filePath}>
            📄 {filePath}
          </span>
        )}
        <span className="ml-auto font-mono">
          {charCount} 字符
        </span>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}
    </div>
  )
}
