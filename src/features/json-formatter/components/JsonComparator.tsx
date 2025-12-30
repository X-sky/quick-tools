import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { json } from "@codemirror/lang-json"
import { foldKeymap } from "@codemirror/language"
import { StateEffect, StateField } from "@codemirror/state"
import { Decoration, EditorView, keymap } from "@codemirror/view"
import CodeMirror from "@uiw/react-codemirror"
import React, { useCallback, useEffect, useRef, useState } from "react"

import { CompareIcon, CopyIcon, TrashIcon } from "~icons"

interface DiffLine {
  lineNumber: number
  type: "added" | "removed" | "modified" | "unchanged"
}

interface DiffResult {
  left: DiffLine[]
  right: DiffLine[]
}

/**
 * 逐行比对两个 JSON 字符串
 * 使用简单的逐行比对算法，标记新增、删除、修改和未改变的行
 */
const compareJsonLines = (leftText: string, rightText: string): DiffResult => {
  const leftLines = leftText.split("\n")
  const rightLines = rightText.split("\n")

  const leftDiff: DiffLine[] = []
  const rightDiff: DiffLine[] = []

  const maxLen = Math.max(leftLines.length, rightLines.length)

  for (let i = 0; i < maxLen; i++) {
    const leftLine = i < leftLines.length ? leftLines[i] : null
    const rightLine = i < rightLines.length ? rightLines[i] : null

    if (leftLine === null && rightLine !== null) {
      // 左侧缺失，右侧新增
      rightDiff.push({ lineNumber: i + 1, type: "added" })
    } else if (leftLine !== null && rightLine === null) {
      // 右侧缺失，左侧删除
      leftDiff.push({ lineNumber: i + 1, type: "removed" })
    } else if (leftLine !== null && rightLine !== null) {
      // 比较两行内容
      const leftTrimmed = leftLine.trim()
      const rightTrimmed = rightLine.trim()

      if (leftTrimmed === rightTrimmed) {
        // 相同行
        leftDiff.push({ lineNumber: i + 1, type: "unchanged" })
        rightDiff.push({ lineNumber: i + 1, type: "unchanged" })
      } else {
        // 不同行，标记为修改
        leftDiff.push({ lineNumber: i + 1, type: "modified" })
        rightDiff.push({ lineNumber: i + 1, type: "modified" })
      }
    }
  }

  return { left: leftDiff, right: rightDiff }
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

export const JsonComparator = () => {
  const [leftText, setLeftText] = useState(`{
  "message": "Paste your JSON here"
}`)
  const [rightText, setRightText] = useState(`{
  "message": "Paste your JSON here"
}`)
  const [leftError, setLeftError] = useState<string | null>(null)
  const [rightError, setRightError] = useState<string | null>(null)
  const [leftEnableJsonMode, setLeftEnableJsonMode] = useState<boolean>(false)
  const [rightEnableJsonMode, setRightEnableJsonMode] = useState<boolean>(false)
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
  const [isComparing, setIsComparing] = useState(false)

  const leftEditorRef = useRef<EditorView | null>(null)
  const rightEditorRef = useRef<EditorView | null>(null)
  const leftContainerRef = useRef<HTMLDivElement>(null)
  const rightContainerRef = useRef<HTMLDivElement>(null)
  const [leftEditorHeight, setLeftEditorHeight] = useState<number>(600)
  const [rightEditorHeight, setRightEditorHeight] = useState<number>(600)

  useEffect(() => {
    const updateLeftHeight = () => {
      if (leftContainerRef.current) {
        const height = leftContainerRef.current.clientHeight
        if (height > 0) {
          setLeftEditorHeight(height)
        }
      }
    }

    const updateRightHeight = () => {
      if (rightContainerRef.current) {
        const height = rightContainerRef.current.clientHeight
        if (height > 0) {
          setRightEditorHeight(height)
        }
      }
    }

    const timer1 = setTimeout(updateLeftHeight, 0)
    const timer2 = setTimeout(updateRightHeight, 0)

    const resizeObserver1 = new ResizeObserver(updateLeftHeight)
    const resizeObserver2 = new ResizeObserver(updateRightHeight)

    if (leftContainerRef.current) {
      resizeObserver1.observe(leftContainerRef.current)
    }
    if (rightContainerRef.current) {
      resizeObserver2.observe(rightContainerRef.current)
    }

    window.addEventListener("resize", updateLeftHeight)
    window.addEventListener("resize", updateRightHeight)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      resizeObserver1.disconnect()
      resizeObserver2.disconnect()
      window.removeEventListener("resize", updateLeftHeight)
      window.removeEventListener("resize", updateRightHeight)
    }
  }, [])

  const handleCompare = useCallback(() => {
    setIsComparing(true)
    const result = compareJsonLines(leftText, rightText)
    setDiffResult(result)

    // 应用装饰到编辑器
    setTimeout(() => {
      if (leftEditorRef.current && result.left) {
        leftEditorRef.current.dispatch({
          effects: [setDiffMarks.of(result.left)]
        })
      }

      if (rightEditorRef.current && result.right) {
        rightEditorRef.current.dispatch({
          effects: [setDiffMarks.of(result.right)]
        })
      }
      setIsComparing(false)
    }, 100)
  }, [leftText, rightText])

  // 左侧编辑器操作
  const handleLeftFormat = () => {
    try {
      const parsed = parseJsObjectToJson(leftText)
      const formatted = JSON.stringify(parsed, null, 2)
      setLeftText(formatted)
      setLeftError(null)
      setLeftEnableJsonMode(true)
      // 清除比对装饰
      if (leftEditorRef.current) {
        leftEditorRef.current.dispatch({
          effects: [clearDiffMarks.of(null)]
        })
      }
    } catch (e) {
      setLeftError(e instanceof Error ? e.message : "Invalid JSON")
    }
  }

  const handleLeftMinify = () => {
    try {
      const parsed = parseJsObjectToJson(leftText)
      const minified = JSON.stringify(parsed, null, 0)
      setLeftText(minified)
      setLeftError(null)
      setLeftEnableJsonMode(true)
      // 清除比对装饰
      if (leftEditorRef.current) {
        leftEditorRef.current.dispatch({
          effects: [clearDiffMarks.of(null)]
        })
      }
    } catch (e) {
      setLeftError(e instanceof Error ? e.message : "Invalid JSON")
    }
  }

  const handleLeftCopy = async () => {
    if (leftText) {
      try {
        await navigator.clipboard.writeText(leftText)
      } catch (e) {
        console.error("Failed to copy", e)
      }
    }
  }

  const handleLeftClear = () => {
    setLeftText("")
    setLeftError(null)
    setLeftEnableJsonMode(false)
    // 清除比对装饰
    if (leftEditorRef.current) {
      leftEditorRef.current.dispatch({
        effects: [clearDiffMarks.of(null)]
      })
    }
  }

  const handleLeftChange = (value: string) => {
    setLeftText(value)
    setLeftError(null)
    setDiffResult(null)
    if (leftEnableJsonMode) {
      setLeftEnableJsonMode(false)
    }
    // 清除装饰
    if (leftEditorRef.current) {
      leftEditorRef.current.dispatch({
        effects: [clearDiffMarks.of(null)]
      })
    }
  }

  // 右侧编辑器操作
  const handleRightFormat = () => {
    try {
      const parsed = parseJsObjectToJson(rightText)
      const formatted = JSON.stringify(parsed, null, 2)
      setRightText(formatted)
      setRightError(null)
      setRightEnableJsonMode(true)
      // 清除比对装饰
      if (rightEditorRef.current) {
        rightEditorRef.current.dispatch({
          effects: [clearDiffMarks.of(null)]
        })
      }
    } catch (e) {
      setRightError(e instanceof Error ? e.message : "Invalid JSON")
    }
  }

  const handleRightMinify = () => {
    try {
      const parsed = parseJsObjectToJson(rightText)
      const minified = JSON.stringify(parsed, null, 0)
      setRightText(minified)
      setRightError(null)
      setRightEnableJsonMode(true)
      // 清除比对装饰
      if (rightEditorRef.current) {
        rightEditorRef.current.dispatch({
          effects: [clearDiffMarks.of(null)]
        })
      }
    } catch (e) {
      setRightError(e instanceof Error ? e.message : "Invalid JSON")
    }
  }

  const handleRightCopy = async () => {
    if (rightText) {
      try {
        await navigator.clipboard.writeText(rightText)
      } catch (e) {
        console.error("Failed to copy", e)
      }
    }
  }

  const handleRightClear = () => {
    setRightText("")
    setRightError(null)
    setRightEnableJsonMode(false)
    // 清除比对装饰
    if (rightEditorRef.current) {
      rightEditorRef.current.dispatch({
        effects: [clearDiffMarks.of(null)]
      })
    }
  }

  const handleRightChange = (value: string) => {
    setRightText(value)
    setRightError(null)
    setDiffResult(null)
    if (rightEnableJsonMode) {
      setRightEnableJsonMode(false)
    }
    // 清除装饰
    if (rightEditorRef.current) {
      rightEditorRef.current.dispatch({
        effects: [clearDiffMarks.of(null)]
      })
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
  })

  const leftExtensions = [
    ...(leftEnableJsonMode ? [json()] : []),
    history(),
    EditorView.lineWrapping,
    keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap]),
    lightTheme,
    createDiffField()
  ]

  const rightExtensions = [
    ...(rightEnableJsonMode ? [json()] : []),
    history(),
    EditorView.lineWrapping,
    keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap]),
    lightTheme,
    createDiffField()
  ]

  return (
    <div className="plasmo-h-full plasmo-min-h-screen plasmo-flex plasmo-flex-col plasmo-bg-gray-50">
      {/* Header */}
      <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-px-6 plasmo-py-5 plasmo-bg-white plasmo-border-b plasmo-border-gray-200 plasmo-shadow-sm">
        <div>
          <h1 className="plasmo-text-2xl plasmo-font-semibold plasmo-text-gray-900 plasmo-tracking-tight">
            JSON Formatter & Comparator
          </h1>
          <p className="plasmo-text-sm plasmo-text-gray-500 plasmo-mt-1">
            Format, validate, and compare JSON files
          </p>
        </div>
        <button
          onClick={handleCompare}
          disabled={isComparing}
          className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-px-5 plasmo-py-2.5 plasmo-bg-[#FF5A5F] plasmo-text-white plasmo-rounded-lg hover:plasmo-bg-[#FF6B70] disabled:plasmo-opacity-50 disabled:plasmo-cursor-not-allowed plasmo-transition-all plasmo-text-sm plasmo-font-medium plasmo-shadow-sm hover:plasmo-shadow-md plasmo-transform hover:plasmo-scale-[1.02]">
          <CompareIcon className="plasmo-w-5 plasmo-h-5" />
          {isComparing ? "Comparing..." : "Compare"}
        </button>
      </div>

      {/* Editor Container */}
      <div className="plasmo-flex-1 plasmo-min-h-0 plasmo-m-6 plasmo-mt-4 plasmo-mb-6 plasmo-flex plasmo-gap-4 plasmo-overflow-hidden">
        {/* Left Editor */}
        <div className="plasmo-flex-1 plasmo-min-h-0 plasmo-flex plasmo-flex-col">
          {/* Left Error Message */}
          {leftError && (
            <div className="plasmo-mb-2 plasmo-px-4 plasmo-py-3 plasmo-bg-red-50 plasmo-border plasmo-border-red-200 plasmo-text-red-700 plasmo-text-sm plasmo-rounded-lg plasmo-shadow-sm">
              <div className="plasmo-font-medium">Invalid JSON</div>
              <div className="plasmo-mt-1 plasmo-text-red-600">{leftError}</div>
            </div>
          )}
          <div
            ref={leftContainerRef}
            className="plasmo-flex-1 plasmo-min-h-0 plasmo-bg-white plasmo-rounded-xl plasmo-shadow-lg plasmo-border plasmo-border-gray-200 plasmo-flex plasmo-flex-col plasmo-overflow-hidden">
            {/* Left Toolbar */}
            <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-px-4 plasmo-py-2 plasmo-bg-gray-50 plasmo-border-b plasmo-border-gray-200">
              <span className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-700">
                Left
              </span>
              <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
                <button
                  onClick={handleLeftFormat}
                  className="plasmo-px-3 plasmo-py-1.5 plasmo-bg-[#FF5A5F] plasmo-text-white plasmo-rounded-lg hover:plasmo-bg-[#FF6B70] plasmo-transition-all plasmo-text-xs plasmo-font-medium plasmo-shadow-sm hover:plasmo-shadow-md">
                  Format
                </button>
                <button
                  onClick={handleLeftMinify}
                  className="plasmo-px-3 plasmo-py-1.5 plasmo-bg-white plasmo-text-gray-700 plasmo-border plasmo-border-gray-300 plasmo-rounded-lg hover:plasmo-bg-gray-50 hover:plasmo-border-gray-400 plasmo-transition-all plasmo-text-xs plasmo-font-medium plasmo-shadow-sm hover:plasmo-shadow-md">
                  Minify
                </button>
                <button
                  onClick={handleLeftCopy}
                  className="plasmo-p-1.5 plasmo-text-gray-600 hover:plasmo-text-gray-900 hover:plasmo-bg-gray-100 plasmo-rounded-lg plasmo-transition-all plasmo-shadow-sm hover:plasmo-shadow-md"
                  title="Copy">
                  <CopyIcon className="plasmo-w-4 plasmo-h-4" />
                </button>
                <button
                  onClick={handleLeftClear}
                  className="plasmo-p-1.5 plasmo-text-gray-600 hover:plasmo-text-red-600 hover:plasmo-bg-red-50 plasmo-rounded-lg plasmo-transition-all plasmo-shadow-sm hover:plasmo-shadow-md"
                  title="Clear">
                  <TrashIcon className="plasmo-w-4 plasmo-h-4" />
                </button>
              </div>
            </div>
            <div className="plasmo-flex-1 plasmo-min-h-0 plasmo-w-full plasmo-overflow-hidden">
              <CodeMirror
                value={leftText}
                height={`${leftEditorHeight}px`}
                extensions={leftExtensions}
                onChange={handleLeftChange}
                onCreateEditor={(view) => {
                  leftEditorRef.current = view
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

        {/* Right Editor */}
        <div className="plasmo-flex-1 plasmo-min-h-0 plasmo-flex plasmo-flex-col">
          {/* Right Error Message */}
          {rightError && (
            <div className="plasmo-mb-2 plasmo-px-4 plasmo-py-3 plasmo-bg-red-50 plasmo-border plasmo-border-red-200 plasmo-text-red-700 plasmo-text-sm plasmo-rounded-lg plasmo-shadow-sm">
              <div className="plasmo-font-medium">Invalid JSON</div>
              <div className="plasmo-mt-1 plasmo-text-red-600">
                {rightError}
              </div>
            </div>
          )}
          <div
            ref={rightContainerRef}
            className="plasmo-flex-1 plasmo-min-h-0 plasmo-bg-white plasmo-rounded-xl plasmo-shadow-lg plasmo-border plasmo-border-gray-200 plasmo-flex plasmo-flex-col plasmo-overflow-hidden">
            {/* Right Toolbar */}
            <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-px-4 plasmo-py-2 plasmo-bg-gray-50 plasmo-border-b plasmo-border-gray-200">
              <span className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-700">
                Right
              </span>
              <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
                <button
                  onClick={handleRightFormat}
                  className="plasmo-px-3 plasmo-py-1.5 plasmo-bg-[#FF5A5F] plasmo-text-white plasmo-rounded-lg hover:plasmo-bg-[#FF6B70] plasmo-transition-all plasmo-text-xs plasmo-font-medium plasmo-shadow-sm hover:plasmo-shadow-md">
                  Format
                </button>
                <button
                  onClick={handleRightMinify}
                  className="plasmo-px-3 plasmo-py-1.5 plasmo-bg-white plasmo-text-gray-700 plasmo-border plasmo-border-gray-300 plasmo-rounded-lg hover:plasmo-bg-gray-50 hover:plasmo-border-gray-400 plasmo-transition-all plasmo-text-xs plasmo-font-medium plasmo-shadow-sm hover:plasmo-shadow-md">
                  Minify
                </button>
                <button
                  onClick={handleRightCopy}
                  className="plasmo-p-1.5 plasmo-text-gray-600 hover:plasmo-text-gray-900 hover:plasmo-bg-gray-100 plasmo-rounded-lg plasmo-transition-all plasmo-shadow-sm hover:plasmo-shadow-md"
                  title="Copy">
                  <CopyIcon className="plasmo-w-4 plasmo-h-4" />
                </button>
                <button
                  onClick={handleRightClear}
                  className="plasmo-p-1.5 plasmo-text-gray-600 hover:plasmo-text-red-600 hover:plasmo-bg-red-50 plasmo-rounded-lg plasmo-transition-all plasmo-shadow-sm hover:plasmo-shadow-md"
                  title="Clear">
                  <TrashIcon className="plasmo-w-4 plasmo-h-4" />
                </button>
              </div>
            </div>
            <div className="plasmo-flex-1 plasmo-min-h-0 plasmo-w-full plasmo-overflow-hidden">
              <CodeMirror
                value={rightText}
                height={`${rightEditorHeight}px`}
                extensions={rightExtensions}
                onChange={handleRightChange}
                onCreateEditor={(view) => {
                  rightEditorRef.current = view
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
      </div>
    </div>
  )
}
