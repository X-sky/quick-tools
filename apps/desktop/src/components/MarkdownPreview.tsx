import type { MarkdownExportSource } from "@quick-tools/web-export"
import { marked } from "marked"
import { useMemo } from "react"

import { CodeMirrorEditor } from "./CodeMirrorEditor"

export interface MarkdownPreviewProps {
  source: MarkdownExportSource | null
  mode: "rendered" | "source"
  onModeChange: (mode: "rendered" | "source") => void
}

export function MarkdownPreview({
  source,
  mode,
  onModeChange
}: MarkdownPreviewProps) {
  const renderedHtml = useMemo(() => {
    if (!source) return ""
    const content = source.markdown || source.plainText || ""
    if (!content) return ""
    return marked.parse(content) as string
  }, [source])

  if (!source) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <p>输入 URL 并提取内容后，预览将显示在此处</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Metadata header */}
      <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h2 className="truncate text-base font-semibold text-gray-900">
          {source.title || "Untitled"}
        </h2>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          {source.byline && (
            <span>作者: {source.byline}</span>
          )}
          {source.excerpt && (
            <span className="max-w-[300px] truncate">
              摘要: {source.excerpt}
            </span>
          )}
          {source.capturedAt && (
            <span>抓取时间: {source.capturedAt}</span>
          )}
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 px-4 py-2">
        <button
          type="button"
          className={`rounded px-3 py-1 text-sm transition-colors ${
            mode === "rendered"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => onModeChange("rendered")}
        >
          渲染预览
        </button>
        <button
          type="button"
          className={`rounded px-3 py-1 text-sm transition-colors ${
            mode === "source"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => onModeChange("source")}
        >
          源码
        </button>
      </div>

      {/* Content area */}
      <div className="min-h-0 flex-1 overflow-auto">
        {mode === "rendered" ? (
          <div
            className="prose prose-sm max-w-none p-4"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        ) : (
          <CodeMirrorEditor
            value={source.markdown || source.plainText || ""}
            readOnly
            language="markdown"
          />
        )}
      </div>
    </div>
  )
}
