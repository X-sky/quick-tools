import React, { useState } from "react"

import {
  formatJson,
  minifyJson,
  parseJsonOrJsObject
} from "@quick-tools/json-formatter"
import type { PlatformError } from "@quick-tools/platform"

export default function JsonFormatterPage() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState<PlatformError | null>(null)

  function handleFormat() {
    try {
      const parsed = parseJsonOrJsObject(input)
      setOutput(formatJson(parsed))
      setError(null)
    } catch (e) {
      setError({
        category: "unknown",
        message: e instanceof Error ? e.message : "格式化失败"
      })
    }
  }

  function handleMinify() {
    try {
      const parsed = parseJsonOrJsObject(input)
      setOutput(minifyJson(parsed))
      setError(null)
    } catch (e) {
      setError({
        category: "unknown",
        message: e instanceof Error ? e.message : "压缩失败"
      })
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        JSON Formatter
      </h2>
      <div className="flex gap-2">
        <button
          onClick={handleFormat}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
          格式化
        </button>
        <button
          onClick={handleMinify}
          className="rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700">
          压缩
        </button>
      </div>
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error.message}
        </div>
      )}
      <div className="grid flex-1 grid-cols-2 gap-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入 JSON 或 JS 对象..."
          className="resize-none rounded border border-gray-300 bg-white p-3 font-mono text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        />
        <textarea
          value={output}
          readOnly
          placeholder="格式化结果..."
          className="resize-none rounded border border-gray-300 bg-gray-50 p-3 font-mono text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        />
      </div>
    </div>
  )
}
