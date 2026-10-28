// @quick-tools/web-export-dom — DOM-based extraction and rendering shared by
// the extension pages and the desktop webview.
export { extractFromHtml, createTurndownService, ExtractionError } from "./extract"
export {
  buildRenderedDocument,
  defaultImageFetcher
} from "./render-document"
export type { ImageFetcher } from "./render-document"
export { paginateRenderedDocument, getPngPreflight } from "./paginate"
export {
  renderPagePngBytes,
  capturePageForPdf,
  getPdfCaptureProfile,
  canMergeIntoSinglePng,
  mergePngPages
} from "./capture"
export { buildPdfBytes } from "./pdf"
export { MARKDOWN_THEME_CSS, ensureThemeStyles } from "./theme"
export {
  exportArticle,
  renderArticlePng,
  describeExportResult,
  ExportCancelledError
} from "./export"
export type {
  ExportFile,
  ExportOptions,
  ExportResult,
  OversizedPngChoice
} from "./export"
export * from "./constants"
