import { resolve } from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "~": resolve(import.meta.dirname, "./src"),
      "@quick-tools/platform": resolve(
        import.meta.dirname,
        "./packages/platform/src/index.ts"
      ),
      "@quick-tools/json-formatter": resolve(
        import.meta.dirname,
        "./packages/json-formatter/src/index.ts"
      ),
      "@quick-tools/qr-code-gen": resolve(
        import.meta.dirname,
        "./packages/qr-code-gen/src/index.ts"
      ),
      "@quick-tools/web-export": resolve(
        import.meta.dirname,
        "./packages/web-export/src/index.ts"
      )
    }
  },
  test: {
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/*.property.test.ts",
      "tests/**/*.test.ts"
    ]
  }
})
