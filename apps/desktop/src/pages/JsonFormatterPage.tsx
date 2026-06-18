import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  formatJson,
  minifyJson,
  parseJsonOrJsObject
} from "@quick-tools/json-formatter"
import { getPlatform } from "@quick-tools/platform"
import type { Diagnostic } from "@codemirror/lint"
import { readTextFile } from "@tauri-apps/plugin-fs"
import {
  BracketsCurly,
  ArrowsInLineHorizontal,
  GitDiff,
  FolderOpen,
  FloppyDisk,
  Copy,
  ClipboardText
} from "@phosphor-icons/react"

import { CodeMirrorEditor } from "~/components/CodeMirrorEditor"
import { DiffViewer } from "~/components/DiffViewer"
import { ResizableSplitPane } from "~/components/ResizableSplitPane"
import { Toast } from "~/components/Toast"
import type { CommandAction } from "~/components/shell/CommandBar"
import { useDebounce } from "~/hooks/useDebounce"
import { useToast } from "~/hooks/useToast"
import { openJsonFile } from "~/platform/file-opener"
import type { PageShellProps } from "~/types/page-shell"

type EditorMode = "format" | "diff"

export default function JsonFormatterPage({
  onActionsChange,
  onStatusChange,
  onToast
}: PageShellProps = {}) {
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

  // Unified notify: prefer shell toast, fall back to local toast.
  const notify = useCallback(
    (
      message: string,
      type: "success" | "error" | "warning" | "info"
    ) => {
      if (onToast) {
        onToast({ type, title: message })
      } else {
        showToast(message, type === "warning" ? "info" : type)
      }
    },
    [onToast, showToast]
  )

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
      notify("Formatted successfully", "success")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "格式化失败"
      setError(msg)
      notify(msg, "error")
    }
  }, [input, notify])

  // Minify action
  const handleMinify = useCallback(() => {
    if (!input.trim()) return
    try {
      const parsed = parseJsonOrJsObject(input)
      const minified = minifyJson(parsed)
      setOutput(minified)
      setError(null)
      notify("Minified successfully", "success")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "压缩失败"
      setError(msg)
      notify(msg, "error")
    }
  }, [input, notify])

  // Toggle diff mode
  const handleToggleDiff = useCallback(() => {
    setMode((prev) => {
      if (prev === "format") {
        setDiffLeft(input)
        setDiffRight(output)
        return "diff"
      }
      return "format"
    })
  }, [input, output])

  // Open file
  const handleOpenFile = useCallback(async () => {
    const result = await openJsonFile()
    if (result.ok) {
      setInput(result.value)
      setFilePath(null)
      notify("文件已加载", "success")
    } else if (result.error.category !== "cancelled") {
      notify(result.error.message, "error")
    }
  }, [notify])

  // Save file
  const handleSaveFile = useCallback(async () => {
    const content = output || input
    if (!content.trim()) {
      notify("没有可保存的内容", "info")
      return
    }
    const platform = getPlatform()
    const result = await platform.fileDownloader.downloadWithDialog(
      content,
      "formatted.json",
      "application/json"
    )
    if (result.ok) {
      notify("文件已保存", "success")
    } else if (result.error.category !== "cancelled") {
      notify(result.error.message, "error")
    }
  }, [output, input, notify])

  // Copy result
  const handleCopyResult = useCallback(async () => {
    const content = output || input
    if (!content.trim()) {
      notify("没有可复制的内容", "info")
      return
    }
    const platform = getPlatform()
    const result = await platform.clipboard.writeText(content)
    if (result.ok) {
      notify("已复制到剪贴板", "success")
    } else {
      notify("剪贴板写入失败", "error")
    }
  }, [output, input, notify])

  // Paste from clipboard
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setInput(text)
        notify("已从剪贴板粘贴", "success")
      } else {
        notify("剪贴板为空", "info")
      }
    } catch {
      notify("读取剪贴板失败", "error")
    }
  }, [notify])

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
          notify("文件已加载", "success")
        } catch {
          notify("读取文件失败", "error")
        }
      } else {
        // Fallback: use FileReader for web-style file reading
        const reader = new FileReader()
        reader.onload = (event) => {
          const content = event.target?.result
          if (typeof content === "string") {
            setInput(content)
            setFilePath(file.name)
            notify("文件已加载", "success")
          }
        }
        reader.onerror = () => {
          notify("读取文件失败", "error")
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
  }, [notify])

  // ─── Expose CommandBar actions to the shell ───────────────────────────────

  const hasContent = input.trim().length > 0

  const commandActions: CommandAction[] = useMemo(
    () => [
      {
        id: "json-format",
        icon: BracketsCurly,
        label: "格式化",
        shortcut: "⌘⇧F",
        group: "primary",
        disabled: !hasContent,
        onExecute: handleFormat
      },
      {
        id: "json-minify",
        icon: ArrowsInLineHorizontal,
        label: "压缩",
        shortcut: "⌘⇧M",
        group: "primary",
        disabled: !hasContent,
        onExecute: handleMinify
      },
      {
        id: "json-diff",
        icon: GitDiff,
        label: mode === "diff" ? "退出对比" : "Diff 对比",
        group: "primary",
        disabled: false,
        onExecute: handleToggleDiff
      },
      {
        id: "json-open",
        icon: FolderOpen,
        label: "打开文件",
        shortcut: "⌘O",
        group: "file",
        disabled: false,
        onExecute: () => {
          void handleOpenFile()
        }
      },
      {
        id: "json-save",
        icon: FloppyDisk,
        label: "保存文件",
        shortcut: "⌘S",
        group: "file",
        disabled: !hasContent,
        onExecute: () => {
          void handleSaveFile()
        }
      },
      {
        id: "json-copy",
        icon: Copy,
        label: "复制结果",
        group: "auxiliary",
        disabled: !hasContent,
        onExecute: () => {
          void handleCopyResult()
        }
      },
      {
        id: "json-paste",
        icon: ClipboardText,
        label: "从剪贴板粘贴",
        group: "auxiliary",
        disabled: false,
        onExecute: () => {
          void handlePasteFromClipboard()
        }
      }
    ],
    [
      hasContent,
      mode,
      handleFormat,
      handleMinify,
      handleToggleDiff,
      handleOpenFile,
      handleSaveFile,
      handleCopyResult,
      handlePasteFromClipboard
    ]
  )

  useEffect(() => {
    onActionsChange?.(commandActions)
  }, [commandActions, onActionsChange])

  // ─── Expose StatusStrip data to the shell ─────────────────────────────────

  const lineCount = useMemo(
    () => (input ? input.split("\n").length : 0),
    [input]
  )

  useEffect(() => {
    onStatusChange?.({
      diagnostics: {
        errors: error ? 1 : 0,
        warnings: 0
      },
      filePath: filePath ?? undefined,
      stats: {
        chars: input.length,
        lines: lineCount,
        encoding: "UTF-8"
      }
    })
  }, [error, filePath, input.length, lineCount, onStatusChange])

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="flex h-full flex-col">
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

      {/* Local Toast — only used when not wired to shell toast */}
      {!onToast && toast && (
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
