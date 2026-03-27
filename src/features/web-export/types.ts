export type ExportFormat = "markdown" | "pdf" | "png"

export interface MarkdownExportSource {
  title: string
  url: string
  byline?: string
  excerpt?: string
  capturedAt: string
  markdown: string
  plainText: string
}

export interface RenderJob {
  source: MarkdownExportSource
  filenameBase: string
  format: Exclude<ExportFormat, "markdown">
  imageMode: "single_preferred"
}

export interface ExportStatus {
  state: "idle" | "running" | "success" | "error"
  message: string
  format?: ExportFormat
  title?: string
  updatedAt: string
}

export type BackgroundMessage =
  | { type: "get-render-job"; taskId: string }
  | { type: "render-job-progress"; taskId: string; message: string }
  | {
      type: "render-job-complete"
      taskId: string
      format: Exclude<ExportFormat, "markdown">
      title?: string
      summaryMessage?: string
    }
  | { type: "render-job-error"; taskId: string; error: string }
