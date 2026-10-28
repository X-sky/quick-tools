import react from "@vitejs/plugin-react"
import { resolve } from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "~": resolve(__dirname, "./src")
    }
  },
  test: {
    globals: true,
    // E2E tests opt in to jsdom via `// @vitest-environment jsdom` at the top of the file.
    environment: "node",
    include: ["src/**/*.{test,spec,property.test}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "src-tauri"],
    setupFiles: ["./src/test-utils/setup.ts"]
  }
})
