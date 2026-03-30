import { PDFDocument } from "pdf-lib"

import { PDF_PAGE_WIDTH_PT } from "./render-constants"

export async function buildPdfBytes(pagePngs: Uint8Array[]) {
  const pdf = await PDFDocument.create()

  for (const pngBytes of pagePngs) {
    const embedded = await pdf.embedPng(pngBytes)
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
