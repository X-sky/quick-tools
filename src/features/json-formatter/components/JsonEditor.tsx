import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { json } from "@codemirror/lang-json"
import { foldKeymap } from "@codemirror/language"
import { StateEffect, StateField } from "@codemirror/state"
import { Decoration, EditorView, keymap } from "@codemirror/view"
import CodeMirror from "@uiw/react-codemirror"
import React, { useEffect, useMemo, useRef, useState } from "react"

import { CopyIcon, TrashIcon } from "~icons"

interface DiffLine {
  lineNumber: number
  type: "added" | "removed" | "modified" | "unchanged"
}

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

/**
 * 将JavaScript对象字面量转换为JSON格式
 * 支持单引号、不带引号的属性名等JS对象语法
 * 使用字符串替换方式，避免使用eval/Function以符合CSP策略
 */
const parseJsObjectToJson = (text: string): any => {
  try {
    // 先尝试标准的JSON.parse
    return JSON.parse(text)
  } catch {
    // 如果失败，尝试将JS对象字面量转换为JSON格式
    try {
      let converted = text.trim()

      // 1. 移除单行注释 (// ...)
      converted = converted.replace(/\/\/.*$/gm, "")

      // 2. 移除多行注释 (/* ... */)
      converted = converted.replace(/\/\*[\s\S]*?\*\//g, "")

      // 3. 处理字符串：先提取所有字符串（单引号和双引号），用占位符替换
      const stringPlaceholders: string[] = []

      // 更准确的字符串匹配：处理转义字符
      const stringRegex = /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g
      converted = converted.replace(stringRegex, (match) => {
        const placeholder = `__STR_${stringPlaceholders.length}__`
        stringPlaceholders.push(match)
        return placeholder
      })

      // 4. 将单引号字符串转换为双引号格式
      for (let i = 0; i < stringPlaceholders.length; i++) {
        const str = stringPlaceholders[i]
        if (str.startsWith("'")) {
          // 单引号字符串：提取内容，转义双引号和反斜杠，然后用双引号包裹
          const content = str.slice(1, -1)
          // 处理转义：先转义反斜杠，再转义双引号
          const escaped = content
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r")
            .replace(/\t/g, "\\t")
          stringPlaceholders[i] = `"${escaped}"`
        }
        // 双引号字符串保持不变
      }

      // 5. 处理不带引号的属性名（对象键）
      // 使用更精确的正则表达式：匹配对象属性名 pattern
      // 匹配：{key: 或 ,key: 或 { key: 或 , key: 或换行后的 key:
      converted = converted.replace(
        /([{,]\s*|^\s*|\n\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g,
        (match, prefix, key) => {
          // 确保不是占位符
          if (key.startsWith("__STR_") && key.endsWith("__")) {
            return match
          }
          // 检查前缀，确保是在对象上下文中
          const trimmedPrefix = prefix.trim()
          if (
            trimmedPrefix === "" ||
            trimmedPrefix === "," ||
            trimmedPrefix === "{" ||
            trimmedPrefix === "\n" ||
            /^\s*$/.test(trimmedPrefix)
          ) {
            return `${prefix}"${key}":`
          }
          return match
        }
      )

      // 6. 移除尾随逗号（在对象或数组的最后一个元素后）
      converted = converted.replace(/,(\s*[}\]])/g, "$1")

      // 7. 恢复字符串占位符（倒序恢复，避免占位符文本被误替换）
      for (let i = stringPlaceholders.length - 1; i >= 0; i--) {
        const placeholder = `__STR_${i}__`
        // 使用全局替换，转义特殊字符
        const escapedPlaceholder = placeholder.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        )
        converted = converted.replace(
          new RegExp(escapedPlaceholder, "g"),
          stringPlaceholders[i]
        )
      }

      // 8. 清理多余的空白行
      converted = converted.replace(/\n\s*\n/g, "\n").trim()

      // 9. 尝试解析转换后的JSON
      const parsed = JSON.parse(converted)

      // 验证解析结果是对象或数组
      if (typeof parsed === "object" && parsed !== null) {
        return parsed
      }
      throw new Error("解析结果不是有效的对象或数组")
    } catch (e) {
      throw new Error(
        e instanceof Error
          ? `无法解析为JSON或JS对象: ${e.message}`
          : "无法解析为JSON或JS对象"
      )
    }
  }
}

const sortJsonByKey = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonByKey(item))
  }
  if (value && typeof value === "object") {
    const sortedEntries = Object.entries(value as Record<string, unknown>)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, val]) => [key, sortJsonByKey(val)])
    return Object.fromEntries(sortedEntries)
  }
  return value
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
      const parsed = parseJsObjectToJson(value)
      const formatted = JSON.stringify(parsed, null, 2)
      onChange(formatted)
      setError(null)
      setEnableJsonMode(true)
      clearDiff()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON")
    }
  }

  const handleMinify = () => {
    try {
      const parsed = parseJsObjectToJson(value)
      const minified = JSON.stringify(parsed, null, 0)
      onChange(minified)
      setError(null)
      setEnableJsonMode(true)
      clearDiff()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON")
    }
  }

  const handleSort = () => {
    try {
      const parsed = parseJsObjectToJson(value)
      const sorted = sortJsonByKey(parsed)
      const formatted = JSON.stringify(sorted, null, 2)
      onChange(formatted)
      setError(null)
      setEnableJsonMode(true)
      clearDiff()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON")
    }
  }

  const handleCopy = async () => {
    if (value) {
      try {
        await navigator.clipboard.writeText(value)
      } catch (e) {
        console.error("Failed to copy", e)
      }
    }
  }

  const handleClear = () => {
    onChange("")
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
        className="plasmo-flex-1 plasmo-min-h-0 plasmo-bg-white plasmo-rounded-xl plasmo-shadow-lg plasmo-border plasmo-border-gray-200 plasmo-flex plasmo-flex-col plasmo-overflow-hidden">
        {/* Toolbar */}
        <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-px-4 plasmo-py-2 plasmo-bg-gray-50 plasmo-border-b plasmo-border-gray-200">
          <span className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-700">
            {label}
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
            <button
              onClick={handleCopy}
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
