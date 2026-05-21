import { describe, it, expect } from "vitest"

describe("Workspace integrity — package imports", () => {
  describe("@quick-tools/platform", () => {
    it("can be imported without browser globals", async () => {
      const platform = await import("@quick-tools/platform")
      expect(platform).toBeDefined()
    })

    it("exports registerPlatform", async () => {
      const { registerPlatform } = await import("@quick-tools/platform")
      expect(typeof registerPlatform).toBe("function")
    })

    it("exports getPlatform", async () => {
      const { getPlatform } = await import("@quick-tools/platform")
      expect(typeof getPlatform).toBe("function")
    })

    it("exports createSuccess", async () => {
      const { createSuccess } = await import("@quick-tools/platform")
      expect(typeof createSuccess).toBe("function")
    })

    it("exports createErrorResult", async () => {
      const { createErrorResult } = await import("@quick-tools/platform")
      expect(typeof createErrorResult).toBe("function")
    })
  })

  describe("@quick-tools/json-formatter", () => {
    it("can be imported without browser globals", async () => {
      const jsonFormatter = await import("@quick-tools/json-formatter")
      expect(jsonFormatter).toBeDefined()
    })

    it("exports parseJsonOrJsObject", async () => {
      const { parseJsonOrJsObject } = await import(
        "@quick-tools/json-formatter"
      )
      expect(typeof parseJsonOrJsObject).toBe("function")
    })

    it("exports formatJson", async () => {
      const { formatJson } = await import("@quick-tools/json-formatter")
      expect(typeof formatJson).toBe("function")
    })

    it("exports minifyJson", async () => {
      const { minifyJson } = await import("@quick-tools/json-formatter")
      expect(typeof minifyJson).toBe("function")
    })
  })

  describe("@quick-tools/qr-code-gen", () => {
    it("can be imported without browser globals", async () => {
      const qrCodeGen = await import("@quick-tools/qr-code-gen")
      expect(qrCodeGen).toBeDefined()
    })

    it("exports mergeHistory", async () => {
      const { mergeHistory } = await import("@quick-tools/qr-code-gen")
      expect(typeof mergeHistory).toBe("function")
    })

    it("exports exportHistoryData", async () => {
      const { exportHistoryData } = await import("@quick-tools/qr-code-gen")
      expect(typeof exportHistoryData).toBe("function")
    })

    it("exports parseHistoryImport", async () => {
      const { parseHistoryImport } = await import("@quick-tools/qr-code-gen")
      expect(typeof parseHistoryImport).toBe("function")
    })
  })

  describe("@quick-tools/web-export", () => {
    it("can be imported without browser globals", async () => {
      const webExport = await import("@quick-tools/web-export")
      expect(webExport).toBeDefined()
    })

    it("exports sanitizeFileName", async () => {
      const { sanitizeFileName } = await import("@quick-tools/web-export")
      expect(typeof sanitizeFileName).toBe("function")
    })

    it("exports buildMarkdownDocument", async () => {
      const { buildMarkdownDocument } = await import(
        "@quick-tools/web-export"
      )
      expect(typeof buildMarkdownDocument).toBe("function")
    })

    it("exports buildFilenameBase", async () => {
      const { buildFilenameBase } = await import("@quick-tools/web-export")
      expect(typeof buildFilenameBase).toBe("function")
    })

    it("exports buildDownloadFilename", async () => {
      const { buildDownloadFilename } = await import(
        "@quick-tools/web-export"
      )
      expect(typeof buildDownloadFilename).toBe("function")
    })
  })
})
