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
  // 默认禁用 JSON 模式，允许用户输入 JavaScript 对象字面量等非标准格式
  // 只有在成功格式化后才启用 JSON 语言支持
  const [enableJsonMode, setEnableJsonMode] = useState<boolean>(false)

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

  const handleFormat = () => {
    try {
      const parsed = parseJsObjectToJson(jsonText)
      const formatted = JSON.stringify(parsed, null, 2)
      setJsonText(formatted)
      setError(null)
      // 格式化成功后启用 JSON 语言支持
      setEnableJsonMode(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON")
    }
  }

  const handleMinify = () => {
    try {
      const parsed = parseJsObjectToJson(jsonText)
      const minified = JSON.stringify(parsed, null, 0)
      setJsonText(minified)
      setError(null)
      // 压缩成功后启用 JSON 语言支持
      setEnableJsonMode(true)
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
    // 清空内容时禁用 JSON 模式
    setEnableJsonMode(false)
  }

  const handleChange = (value: string) => {
    setJsonText(value)
    setError(null)
    // 用户修改内容时禁用 JSON 模式，避免 JS 对象字面量语法报错
    if (enableJsonMode) {
      setEnableJsonMode(false)
    }
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

  // 动态添加 JSON 语言支持
  // 只在格式化后启用 JSON 模式，避免在输入 JavaScript 对象字面量时报语法错误
  // format功能会直接处理编辑器内的字符串，支持JavaScript对象字面量语法
  const extensions = [
    ...(enableJsonMode ? [json()] : []),
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
