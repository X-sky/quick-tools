import type { MarkdownExportSource } from "@quick-tools/web-export"
import { marked } from "marked"
import { useMemo } from "react"

interface MarkdownPreviewProps {
  source: MarkdownExportSource | null
  mode: "rendered" | "source"
  onModeChange: (mode: "rendered" | "source") => void
}

/** Same layout as the desktop MarkdownPreview: metadata, mode toggle, body. */
export function MarkdownPreview({ source, mode, onModeChange }: MarkdownPreviewProps) {
  const renderedHtml = useMemo(() => {
    const content = source?.markdown || source?.plainText || ""
    return content ? (marked.parse(content, { async: false }) as string) : ""
  }, [source])

  if (!source) {
    return (
      <div className="plasmo-flex plasmo-h-full plasmo-items-center plasmo-justify-center plasmo-text-sm plasmo-text-stone-400">
        输入 URL 并提取内容后，预览将显示在此处
      </div>
    )
  }

  return (
    <div className="plasmo-flex plasmo-h-full plasmo-flex-col">
      <div className="plasmo-shrink-0 plasmo-border-b plasmo-border-stone-200 plasmo-bg-stone-50 plasmo-px-4 plasmo-py-3">
        <h2 className="plasmo-truncate plasmo-text-base plasmo-font-semibold">
          {source.title || "Untitled"}
        </h2>
        <div className="plasmo-mt-1 plasmo-flex plasmo-flex-wrap plasmo-gap-x-4 plasmo-gap-y-1 plasmo-text-xs plasmo-text-stone-500">
          {source.byline && <span>作者: {source.byline}</span>}
          {source.excerpt && (
            <span className="plasmo-max-w-[300px] plasmo-truncate">摘要: {source.excerpt}</span>
          )}
          {source.capturedAt && <span>抓取时间: {source.capturedAt}</span>}
        </div>
      </div>
      <div className="plasmo-flex plasmo-shrink-0 plasmo-items-center plasmo-gap-1 plasmo-border-b plasmo-border-stone-200 plasmo-px-4 plasmo-py-2">
        {(["rendered", "source"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={`plasmo-rounded plasmo-px-3 plasmo-py-1 plasmo-text-sm ${
              mode === m
                ? "plasmo-bg-stone-700 plasmo-text-white"
                : "plasmo-bg-stone-100 plasmo-text-stone-700 hover:plasmo-bg-stone-200"
            }`}>
            {m === "rendered" ? "渲染预览" : "源码"}
          </button>
        ))}
      </div>
      <div className="plasmo-min-h-0 plasmo-flex-1 plasmo-overflow-auto">
        {mode === "rendered" ? (
          <div
            className="web-export-preview plasmo-p-4 plasmo-text-sm plasmo-leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        ) : (
          <pre className="plasmo-whitespace-pre-wrap plasmo-break-words plasmo-p-4 plasmo-font-mono plasmo-text-xs plasmo-text-stone-700">
            {source.markdown || source.plainText}
          </pre>
        )}
      </div>
    </div>
  )
}
