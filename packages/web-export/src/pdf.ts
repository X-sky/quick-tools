import type { PdfCaptureProfile, PdfPageCapture, RenderPage } from "./types"

/**
 * Layout constants for PDF page composition.
 */
export const PDF_PAGE_WIDTH_PT = 595.28

/**
 * Interface for platform-specific PDF document assembly.
 * The app layer provides an implementation that uses a PDF library
 * (e.g., pdf-lib) to embed images and produce the final PDF bytes.
 */
export interface PdfAssembler {
  create(): Promise<void>
  addPage(capture: PdfPageCapture, pageWidthPt: number): Promise<void>
  save(): Promise<Uint8Array>
}

/**
 * Interface for platform-specific page image capture.
 * The app layer provides an implementation that renders DOM nodes
 * to image bytes (e.g., using html-to-image).
 */
export interface PdfPageRenderer {
  capturePageImage(
    page: RenderPage,
    index: number,
    total: number,
    profile: PdfCaptureProfile
  ): Promise<PdfPageCapture>
}

/**
 * Determines the capture profile for a given page based on its kind.
 * Table pages use higher resolution PNG; default pages use JPEG.
 */
export function getPdfCaptureProfile(page: RenderPage): PdfCaptureProfile {
  if (page.pageKind === "table") {
    return {
      pixelRatio: 1.9,
      format: "png"
    }
  }

  return {
    pixelRatio: 1.35,
    quality: 0.82,
    format: "jpeg"
  }
}

/**
 * Computes the PDF page height in points given the image dimensions
 * and the target page width.
 */
export function computePdfPageHeight(
  imageWidth: number,
  imageHeight: number,
  pageWidthPt: number
): number {
  return (imageHeight * pageWidthPt) / imageWidth
}

/**
 * Orchestrates PDF generation from rendered pages.
 * Uses the provided assembler and renderer abstractions to avoid
 * direct dependency on DOM or specific PDF libraries.
 */
export async function buildPdfFromPages(
  pages: RenderPage[],
  renderer: PdfPageRenderer,
  assembler: PdfAssembler
): Promise<Uint8Array> {
  await assembler.create()

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!
    const profile = getPdfCaptureProfile(page)
    const capture = await renderer.capturePageImage(page, i, pages.length, profile)
    await assembler.addPage(capture, PDF_PAGE_WIDTH_PT)
  }

  return await assembler.save()
}
