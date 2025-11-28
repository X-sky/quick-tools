import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { json } from "@codemirror/lang-json"
import { foldKeymap } from "@codemirror/language"
import { EditorView, keymap } from "@codemirror/view"
import CodeMirror from "@uiw/react-codemirror"
import React, { useEffect, useRef, useState } from "react"

import { CopyIcon, TrashIcon } from "~icons"

export const JsonFormatter = () => {
  const [jsonText, setJsonText] = useState(`{
  "message": "Paste your JSON here"
}`)
  const [error, setError] = useState<string | null>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const [editorHeight, setEditorHeight] = useState<number>(600)

  useEffect(() => {
    const updateHeight = () => {
      if (editorContainerRef.current) {
        const height = editorContainerRef.current.clientHeight
        if (height > 0) {
          setEditorHeight(height)
        }
      }
    }

    // 使用 setTimeout 确保 DOM 已渲染
    const timer = setTimeout(updateHeight, 0)

    const resizeObserver = new ResizeObserver(updateHeight)
    if (editorContainerRef.current) {
      resizeObserver.observe(editorContainerRef.current)
    }

    window.addEventListener("resize", updateHeight)

    return () => {
      clearTimeout(timer)
      resizeObserver.disconnect()
      window.removeEventListener("resize", updateHeight)
    }
  }, [])

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonText)
      const formatted = JSON.stringify(parsed, null, 2)
      setJsonText(formatted)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON")
    }
  }

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(jsonText)
      const minified = JSON.stringify(parsed, null, 0)
      setJsonText(minified)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON")
    }
  }

  const handleCopy = async () => {
    if (jsonText) {
      try {
        await navigator.clipboard.writeText(jsonText)
      } catch (e) {
        console.error("Failed to copy", e)
      }
    }
  }

  const handleClear = () => {
    setJsonText("")
    setError(null)
  }

  const handleChange = (value: string) => {
    setJsonText(value)
    setError(null)
  }

  const lightTheme = EditorView.theme({
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
    }
  })

  const extensions = [
    json(),
    history(),
    EditorView.lineWrapping,
    keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap]),
    lightTheme
  ]

  return (
    <div className="plasmo-h-full plasmo-min-h-screen plasmo-flex plasmo-flex-col plasmo-bg-gray-50">
      {/* Header */}
      <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-px-6 plasmo-py-5 plasmo-bg-white plasmo-border-b plasmo-border-gray-200 plasmo-shadow-sm">
        <div>
          <h1 className="plasmo-text-2xl plasmo-font-semibold plasmo-text-gray-900 plasmo-tracking-tight">
            JSON Formatter
          </h1>
          <p className="plasmo-text-sm plasmo-text-gray-500 plasmo-mt-1">
            Format, validate, and beautify your JSON
          </p>
        </div>
        <div className="plasmo-flex plasmo-items-center plasmo-gap-3">
          <button
            onClick={handleFormat}
            className="plasmo-px-5 plasmo-py-2.5 plasmo-bg-[#FF5A5F] plasmo-text-white plasmo-rounded-lg hover:plasmo-bg-[#FF6B70] plasmo-transition-all plasmo-text-sm plasmo-font-medium plasmo-shadow-sm hover:plasmo-shadow-md plasmo-transform hover:plasmo-scale-[1.02]">
            Format
          </button>
          <button
            onClick={handleMinify}
            className="plasmo-px-5 plasmo-py-2.5 plasmo-bg-white plasmo-text-gray-700 plasmo-border plasmo-border-gray-300 plasmo-rounded-lg hover:plasmo-bg-gray-50 hover:plasmo-border-gray-400 plasmo-transition-all plasmo-text-sm plasmo-font-medium plasmo-shadow-sm hover:plasmo-shadow-md">
            Minify
          </button>
          <button
            onClick={handleCopy}
            className="plasmo-p-2.5 plasmo-text-gray-600 hover:plasmo-text-gray-900 hover:plasmo-bg-gray-100 plasmo-rounded-lg plasmo-transition-all plasmo-shadow-sm hover:plasmo-shadow-md"
            title="Copy">
            <CopyIcon className="plasmo-w-5 plasmo-h-5" />
          </button>
          <button
            onClick={handleClear}
            className="plasmo-p-2.5 plasmo-text-gray-600 hover:plasmo-text-red-600 hover:plasmo-bg-red-50 plasmo-rounded-lg plasmo-transition-all plasmo-shadow-sm hover:plasmo-shadow-md"
            title="Clear">
            <TrashIcon className="plasmo-w-5 plasmo-h-5" />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="plasmo-mx-6 plasmo-mt-4 plasmo-px-4 plasmo-py-3 plasmo-bg-red-50 plasmo-border plasmo-border-red-200 plasmo-text-red-700 plasmo-text-sm plasmo-rounded-lg plasmo-shadow-sm">
          <div className="plasmo-font-medium">Invalid JSON</div>
          <div className="plasmo-mt-1 plasmo-text-red-600">{error}</div>
        </div>
      )}

      {/* Editor Container */}
      <div
        ref={editorContainerRef}
        className="plasmo-flex-1 plasmo-min-h-0 plasmo-m-6 plasmo-mt-4 plasmo-mb-6 plasmo-bg-white plasmo-rounded-xl plasmo-shadow-lg plasmo-border plasmo-border-gray-200 plasmo-flex plasmo-flex-col plasmo-overflow-hidden">
        <div className="plasmo-flex-1 plasmo-min-h-0 plasmo-w-full plasmo-overflow-hidden">
          <CodeMirror
            value={jsonText}
            height={`${editorHeight}px`}
            extensions={extensions}
            onChange={handleChange}
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
}
