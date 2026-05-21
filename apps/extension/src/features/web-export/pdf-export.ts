import { PDFDocument } from "pdf-lib"

import { PDF_PAGE_WIDTH_PT } from "./render-constants"
import type { PdfPageCapture } from "./types"

export async function buildPdfBytes(pageCaptures: PdfPageCapture[]) {
  const pdf = await PDFDocument.create()

  for (const capture of pageCaptures) {
    const embedded =
      capture.format === "jpeg"
        ? await pdf.embedJpg(capture.bytes)
        : await pdf.embedPng(capture.bytes)
    const pageWidth = PDF_PAGE_WIDTH_PT
    const pageHeight = (embedded.height * pageWidth) / embedded.width
    const page = pdf.addPage([pageWidth, pageHeight])

    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight
    })
  }

  return await pdf.save()
}
