export type {
  ExportFormat,
  BinaryExportFormat,
  MarkdownExportSource,
  RenderJob,
  RenderBlock,
  RenderedDocument,
  ImageAssetState,
  PdfCaptureFormat,
  PdfCaptureProfile,
  RenderPage,
  PaginatedDomPage,
  PdfPageCapture,
  PngPreflight,
  RendererAssets
} from "@quick-tools/web-export"

export type PngDecision = "single" | "paged" | "pdf" | null

export interface ExportStatus {
  state: "idle" | "running" | "success" | "error"
  message: string
  format?: import("@quick-tools/web-export").ExportFormat
  title?: string
  updatedAt: string
}

export type BackgroundMessage =
  | { type: "get-render-job"; taskId: string }
  | { type: "render-job-progress"; taskId: string; message: string }
  | {
      type: "render-job-complete"
      taskId: string
      format: import("@quick-tools/web-export").BinaryExportFormat
      title?: string
      summaryMessage?: string
    }
  | { type: "render-job-error"; taskId: string; error: string }
