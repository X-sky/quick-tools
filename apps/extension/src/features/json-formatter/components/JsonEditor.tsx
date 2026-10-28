import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { json } from "@codemirror/lang-json"
import { foldKeymap } from "@codemirror/language"
import { StateEffect, StateField } from "@codemirror/state"
import { Decoration, EditorView, keymap } from "@codemirror/view"
import type { DiffLine } from "@quick-tools/json-formatter"
import {
  formatJson,
  minifyJson,
  parseJsonOrJsObject,
  sortJsonKeys
} from "@quick-tools/json-formatter"
import { getPlatform } from "@quick-tools/platform"
import CodeMirror from "@uiw/react-codemirror"
import React, { useEffect, useMemo, useRef, useState } from "react"

import {
  ClipboardIcon,
  CopyIcon,
  DownloadIcon,
  TrashIcon,
  UploadIcon
} from "~icons"
import { getVisibleError } from "~platform/result"

// 创建装饰效果
const setDiffMarks = StateEffect.define<DiffLine[]>()
const clearDiffMarks = StateEffect.define()

// 创建装饰字段
const createDiffField = () => {
  return StateField.define({
    create() {
      return Decoration.none
    },
    update(decorations, tr) {
      decorations = decorations.map(tr.changes)

      for (const effect of tr.effects) {
        if (effect.is(setDiffMarks)) {
          const diffLines = effect.value
          const decos: any[] = []

          diffLines.forEach((diff) => {
            if (
              diff.type !== "unchanged" &&
              diff.lineNumber <= tr.state.doc.lines
            ) {
              try {
                const line = tr.state.doc.line(diff.lineNumber)
                const lineDeco = Decoration.line({
                  attributes: {
                    class: `diff-line diff-${diff.type}`
                  }
                })
                decos.push(lineDeco.range(line.from))
              } catch (e) {
                // 忽略行号超出范围的错误
              }
            }
          })

          decorations = Decoration.set(decos)
        } else if (effect.is(clearDiffMarks)) {
          decorations = Decoration.none
        }
      }

      return decorations
    },
    provide: (f) => EditorView.decorations.from(f)
  })
}

interface JsonEditorProps {
  value: string
  onChange: (value: string) => void
  label: string
  onDiffChange?: () => void
}

export const JsonEditor = React.forwardRef<
  { applyDiff: (diffLines: DiffLine[]) => void; clearDiff: () => void },
  JsonEditorProps
>(({ value, onChange, label, onDiffChange }, ref) => {
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [enableJsonMode, setEnableJsonMode] = useState<boolean>(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [editorHeight, setEditorHeight] = useState<number>(600)
  const internalEditorRef = useRef<EditorView | null>(null)

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.clientHeight
        if (height > 0) {
          setEditorHeight(height)
        }
      }
    }

    const timer = setTimeout(updateHeight, 0)
    const resizeObserver = new ResizeObserver(updateHeight)

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    window.addEventListener("resize", updateHeight)

    return () => {
      clearTimeout(timer)
      resizeObserver.disconnect()
      window.removeEventListener("resize", updateHeight)
    }
  }, [])

  // 暴露方法给父组件
  React.useImperativeHandle(ref, () => ({
    applyDiff: (diffLines: DiffLine[]) => {
      if (internalEditorRef.current) {
        internalEditorRef.current.dispatch({
          effects: [setDiffMarks.of(diffLines)]
        })
      }
    },
    clearDiff: () => {
      if (internalEditorRef.current) {
        internalEditorRef.current.dispatch({
          effects: [clearDiffMarks.of(null)]
        })
      }
    }
  }))

  const handleFormat = () => {
    try {
      const parsed = parseJsonOrJsObject(value)
      onChange(formatJson(parsed))
      setError(null)
      setEnableJsonMode(true)
      clearDiff()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON")
    }
  }

  const handleMinify = () => {
    try {
      const parsed = parseJsonOrJsObject(value)
      onChange(minifyJson(parsed))
      setError(null)
      setEnableJsonMode(true)
      clearDiff()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON")
    }
  }

  const handleSort = () => {
    try {
      const parsed = parseJsonOrJsObject(value)
      onChange(formatJson(sortJsonKeys(parsed)))
      setError(null)
      setEnableJsonMode(true)
      clearDiff()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON")
    }
  }

  const showNotice = (message: string) => {
    setNotice(message)
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = setTimeout(() => setNotice(null), 2000)
  }

  useEffect(
    () => () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    },
    []
  )

  const loadText = (text: string, name: string | null) => {
    onChange(text)
    setFileName(name)
    setError(null)
    setEnableJsonMode(false)
    clearDiff()
    onDiffChange?.()
  }

  const handleCopy = async () => {
    if (!value.trim()) {
      showNotice("没有可复制的内容")
      return
    }
    const result = await getPlatform().clipboard.writeText(value)
    showNotice(result.ok ? "已复制到剪贴板" : "剪贴板写入失败")
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        loadText(text, null)
        showNotice("已从剪贴板粘贴")
      } else {
        showNotice("剪贴板为空")
      }
    } catch {
      showNotice("读取剪贴板失败")
    }
  }

  const readFile = async (file: File) => {
    try {
      loadText(await file.text(), file.name)
      showNotice("文件已加载")
    } catch {
      showNotice("读取文件失败")
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file) void readFile(file)
  }

  const handleSave = async () => {
    if (!value.trim()) {
      showNotice("没有可保存的内容")
      return
    }
    const result = await getPlatform().fileDownloader.downloadWithDialog(
      value,
      fileName ?? "formatted.json",
      "application/json"
    )
    if (result.ok) {
      showNotice("文件已保存")
    } else {
      const message = getVisibleError(result)
      if (message) showNotice(message)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    e.preventDefault()
    e.stopPropagation()
    void readFile(file)
  }

  const handleClear = () => {
    onChange("")
    setFileName(null)
    setError(null)
    setEnableJsonMode(false)
    clearDiff()
  }

  const handleChange = (newValue: string) => {
    onChange(newValue)
    setError(null)
    if (enableJsonMode) {
      setEnableJsonMode(false)
    }
    clearDiff()
    if (onDiffChange) {
      onDiffChange()
    }
  }

  const clearDiff = () => {
    if (internalEditorRef.current) {
      internalEditorRef.current.dispatch({
        effects: [clearDiffMarks.of(null)]
      })
    }
  }

  const diffFieldExtension = useMemo(() => createDiffField(), [])
  const lightTheme = useMemo(
    () =>
      EditorView.theme({
        "&": {
          height: "100%",
          backgroundColor: "#ffffff",
          color: "#222222",
          display: "flex",
          flexDirection: "column"
        },
        ".cm-editor": {
          height: "100%",
          display: "flex",
          flexDirection: "column",
          flex: "1 1 auto",
          minHeight: "0"
        },
        ".cm-scroller": {
          flex: "1 1 auto",
          overflow: "auto",
          minHeight: "0",
          maxHeight: "100%"
        },
        ".cm-scroller::-webkit-scrollbar": {
          width: "8px",
          height: "8px"
        },
        ".cm-scroller::-webkit-scrollbar-track": {
          background: "#f7f7f7",
          borderRadius: "4px"
        },
        ".cm-scroller::-webkit-scrollbar-thumb": {
          background: "#d1d1d1",
          borderRadius: "4px"
        },
        ".cm-scroller::-webkit-scrollbar-thumb:hover": {
          background: "#b1b1b1"
        },
        ".cm-content": {
          padding: "20px",
          fontSize: "14px",
          lineHeight: "1.6"
        },
        ".cm-focused": {
          outline: "none"
        },
        ".cm-gutters": {
          backgroundColor: "#f7f7f7",
          border: "none",
          color: "#717171"
        },
        ".cm-lineNumbers": {
          color: "#717171",
          fontSize: "13px"
        },
        ".cm-foldGutter": {
          width: "28px",
          backgroundColor: "#f7f7f7"
        },
        ".cm-foldGutter .cm-gutterElement": {
          cursor: "pointer",
          transition: "background-color 0.2s ease"
        },
        ".cm-foldGutter .cm-gutterElement:hover": {
          backgroundColor: "#e8e8e8"
        },
        ".cm-activeLine": {
          backgroundColor: "#f7f7f7"
        },
        ".cm-activeLineGutter": {
          backgroundColor: "#f7f7f7"
        },
        ".cm-selectionBackground": {
          backgroundColor: "#e8f0fe"
        },
        // 差异行样式
        ".diff-line.diff-added": {
          backgroundColor: "#d4edda !important"
        },
        ".diff-line.diff-removed": {
          backgroundColor: "#f8d7da !important"
        },
        ".diff-line.diff-modified": {
          backgroundColor: "#fff3cd !important"
        },
        ".diff-line.diff-added .cm-line": {
          backgroundColor: "#d4edda"
        },
        ".diff-line.diff-removed .cm-line": {
          backgroundColor: "#f8d7da"
        },
        ".diff-line.diff-modified .cm-line": {
          backgroundColor: "#fff3cd"
        }
      }),
    []
  )

  const baseExtensions = useMemo(() => {
    const historyExtension = history()
    const keymapExtension = keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...foldKeymap
    ])
    return [historyExtension, EditorView.lineWrapping, keymapExtension]
  }, [])

  const extensions = useMemo(
    () => [
      ...(enableJsonMode ? [json()] : []),
      ...baseExtensions,
      lightTheme,
      diffFieldExtension
    ],
    [enableJsonMode, baseExtensions, lightTheme, diffFieldExtension]
  )

  return (
    <div className="plasmo-flex-1 plasmo-min-h-0 plasmo-flex plasmo-flex-col">
      {/* Error Message */}
      {error && (
        <div className="plasmo-mb-2 plasmo-px-4 plasmo-py-3 plasmo-bg-red-50 plasmo-border plasmo-border-red-200 plasmo-text-red-700 plasmo-text-sm plasmo-rounded-lg plasmo-shadow-sm">
          <div className="plasmo-font-medium">Invalid JSON</div>
          <div className="plasmo-mt-1 plasmo-text-red-600">{error}</div>
        </div>
      )}
      <div
        ref={containerRef}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) e.preventDefault()
        }}
        onDrop={handleDrop}
        className="plasmo-flex-1 plasmo-min-h-0 plasmo-bg-white plasmo-rounded-xl plasmo-shadow-lg plasmo-border plasmo-border-gray-200 plasmo-flex plasmo-flex-col plasmo-overflow-hidden">
        {/* Toolbar */}
        <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-px-4 plasmo-py-2 plasmo-bg-gray-50 plasmo-border-b plasmo-border-gray-200">
          <span className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-min-w-0 plasmo-text-sm plasmo-font-medium plasmo-text-gray-700">
            {label}
            {fileName && (
              <span
                title={fileName}
                className="plasmo-truncate plasmo-max-w-[160px] plasmo-text-xs plasmo-font-normal plasmo-text-gray-400">
                {fileName}
              </span>
            )}
            {notice && (
              <span className="plasmo-text-xs plasmo-font-normal plasmo-text-emerald-600">
                {notice}
              </span>
            )}
          </span>
          <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
            <button
              onClick={handleFormat}
              className="plasmo-px-3 plasmo-py-1.5 plasmo-bg-[#FF5A5F] plasmo-text-white plasmo-rounded-lg hover:plasmo-bg-[#FF6B70] plasmo-transition-all plasmo-text-xs plasmo-font-medium plasmo-shadow-sm hover:plasmo-shadow-md">
              Format
            </button>
            <button
              onClick={handleSort}
              className="plasmo-px-3 plasmo-py-1.5 plasmo-bg-white plasmo-text-gray-700 plasmo-border plasmo-border-gray-300 plasmo-rounded-lg hover:plasmo-bg-gray-50 hover:plasmo-border-gray-400 plasmo-transition-all plasmo-text-xs plasmo-font-medium plasmo-shadow-sm hover:plasmo-shadow-md">
              Sort
            </button>
            <button
              onClick={handleMinify}
              className="plasmo-px-3 plasmo-py-1.5 plasmo-bg-white plasmo-text-gray-700 plasmo-border plasmo-border-gray-300 plasmo-rounded-lg hover:plasmo-bg-gray-50 hover:plasmo-border-gray-400 plasmo-transition-all plasmo-text-xs plasmo-font-medium plasmo-shadow-sm hover:plasmo-shadow-md">
              Minify
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json,text/plain"
              onChange={handleFileInputChange}
              className="plasmo-hidden"
              aria-hidden="true"
              tabIndex={-1}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="plasmo-p-1.5 plasmo-text-gray-600 hover:plasmo-text-gray-900 hover:plasmo-bg-gray-100 plasmo-rounded-lg plasmo-transition-all plasmo-shadow-sm hover:plasmo-shadow-md"
              title="打开文件">
              <UploadIcon className="plasmo-w-4 plasmo-h-4" />
            </button>
            <button
              onClick={() => void handleSave()}
              className="plasmo-p-1.5 plasmo-text-gray-600 hover:plasmo-text-gray-900 hover:plasmo-bg-gray-100 plasmo-rounded-lg plasmo-transition-all plasmo-shadow-sm hover:plasmo-shadow-md"
              title="保存文件">
              <DownloadIcon className="plasmo-w-4 plasmo-h-4" />
            </button>
            <button
              onClick={() => void handlePaste()}
              className="plasmo-p-1.5 plasmo-text-gray-600 hover:plasmo-text-gray-900 hover:plasmo-bg-gray-100 plasmo-rounded-lg plasmo-transition-all plasmo-shadow-sm hover:plasmo-shadow-md"
              title="从剪贴板粘贴">
              <ClipboardIcon className="plasmo-w-4 plasmo-h-4" />
            </button>
            <button
              onClick={() => void handleCopy()}
              className="plasmo-p-1.5 plasmo-text-gray-600 hover:plasmo-text-gray-900 hover:plasmo-bg-gray-100 plasmo-rounded-lg plasmo-transition-all plasmo-shadow-sm hover:plasmo-shadow-md"
              title="Copy">
              <CopyIcon className="plasmo-w-4 plasmo-h-4" />
            </button>
            <button
              onClick={handleClear}
              className="plasmo-p-1.5 plasmo-text-gray-600 hover:plasmo-text-red-600 hover:plasmo-bg-red-50 plasmo-rounded-lg plasmo-transition-all plasmo-shadow-sm hover:plasmo-shadow-md"
              title="Clear">
              <TrashIcon className="plasmo-w-4 plasmo-h-4" />
            </button>
          </div>
        </div>
        <div className="plasmo-flex-1 plasmo-min-h-0 plasmo-w-full plasmo-overflow-hidden">
          <CodeMirror
            value={value}
            height={`${editorHeight}px`}
            extensions={extensions}
            onChange={handleChange}
            onCreateEditor={(view) => {
              internalEditorRef.current = view
            }}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              dropCursor: false,
              allowMultipleSelections: false
            }}
          />
        </div>
      </div>
    </div>
  )
})

JsonEditor.displayName = "JsonEditor"
