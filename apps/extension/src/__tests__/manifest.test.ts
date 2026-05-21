import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

/**
 * Integration tests for extension manifest configuration.
 * Verifies that the Plasmo manifest config in package.json contains
 * the correct permissions, host_permissions, and content_security_policy.
 *
 * **Validates: Requirements 4.9, 8.3**
 */
describe("Extension manifest configuration", () => {
  const packageJsonPath = resolve(__dirname, "../../package.json")
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"))
  const manifest = packageJson.manifest

  it("manifest field exists in package.json", () => {
    expect(manifest).toBeDefined()
  })

  describe("permissions", () => {
    it("contains contextMenus permission", () => {
      expect(manifest.permissions).toContain("contextMenus")
    })

    it("contains downloads permission", () => {
      expect(manifest.permissions).toContain("downloads")
    })

    it("contains scripting permission", () => {
      expect(manifest.permissions).toContain("scripting")
    })

    it("contains storage permission", () => {
      expect(manifest.permissions).toContain("storage")
    })

    it("contains tabs permission", () => {
      expect(manifest.permissions).toContain("tabs")
    })
  })

  describe("host_permissions", () => {
    it("contains http://*/* pattern", () => {
      expect(manifest.host_permissions).toContain("http://*/*")
    })

    it("contains https://*/* pattern", () => {
      expect(manifest.host_permissions).toContain("https://*/*")
    })
  })

  describe("content_security_policy", () => {
    it("extension_pages includes wasm-unsafe-eval", () => {
      expect(manifest.content_security_policy).toBeDefined()
      expect(manifest.content_security_policy.extension_pages).toBeDefined()
      expect(
        manifest.content_security_policy.extension_pages
      ).toContain("wasm-unsafe-eval")
    })
  })
})
