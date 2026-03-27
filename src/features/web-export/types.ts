export type ExportFormat = "markdown" | "pdf" | "png"
export type ExportSizeTier = "short" | "medium" | "super_long"
export type ExportPngMode = "single" | "merge" | "paged" | "confirm"

export interface ExtractedArticle {
  title: string
  url: string
  byline?: string
  excerpt?: string
  capturedAt: string
  markdown: string
  plainText: string
  contentHtml: string
}

export interface ExportTask {
  article: ExtractedArticle
  filenameBase: string
  format: Exclude<ExportFormat, "markdown">
}

export interface ExportStatus {
  state: "idle" | "running" | "success" | "error"
  message: string
  format?: ExportFormat
  title?: string
  updatedAt: string
}

export interface ExportMetrics {
  contentWidth: number
  contentHeight: number
  pageCssHeight: number
  totalPages: number
  mergedWidth: number
  mergedHeight: number
  mergedBytes: number
}

export interface ExportStrategy {
  sizeTier: ExportSizeTier
  recommendedFormat: Exclude<ExportFormat, "markdown">
  pngMode: ExportPngMode
  reason: string[]
  summary: string
}

export type BackgroundMessage =
  | { type: "get-render-task"; taskId: string }
  | {
      type: "render-export-complete"
      taskId: string
      format: Exclude<ExportFormat, "markdown">
      title?: string
      summaryMessage?: string
    }
  | { type: "render-export-error"; taskId: string; error: string }
