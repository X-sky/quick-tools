export type ExportFormat = "markdown" | "pdf" | "png"
export type BinaryExportFormat = Exclude<ExportFormat, "markdown">
export type PngDecision = "single" | "paged" | "pdf" | null

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
  format: BinaryExportFormat
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
      format: BinaryExportFormat
      title?: string
      summaryMessage?: string
    }
  | { type: "render-job-error"; taskId: string; error: string }

export type RenderBlock = {
  html: string
  height: number
}

export type RenderPage = {
  html: string
  height: number
}

export type PngPreflight = {
  shouldPrompt: boolean
  mergedWidth: number
  mergedHeight: number
  mergedBytes: number
}

export type RendererAssets = {
  bodyFontBytes: Uint8Array
  monoFontBytes: Uint8Array
  bodyFontBuffer: ArrayBuffer
  monoFontBuffer: ArrayBuffer
}
