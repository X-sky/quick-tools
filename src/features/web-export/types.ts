export type ExportFormat = "markdown" | "pdf" | "png"

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

export type BackgroundMessage =
  | { type: "get-render-task"; taskId: string }
  | {
      type: "render-export-complete"
      taskId: string
      format: Exclude<ExportFormat, "markdown">
      title?: string
    }
  | { type: "render-export-error"; taskId: string; error: string }
