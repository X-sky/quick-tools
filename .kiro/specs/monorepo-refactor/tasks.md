# Implementation Plan: Monorepo Refactor

## Overview

Refactor the Quick Tools browser extension from a single Plasmo project into a pnpm monorepo with Turborepo orchestration. Core business logic is extracted into platform-agnostic shared packages, a platform adapter layer provides dependency inversion, and the existing extension continues working identically. A Tauri 2.x desktop app shell is scaffolded to consume the same shared packages.

## Tasks

- [x] 1. Initialize monorepo workspace and build infrastructure
  - [x] 1.1 Create root workspace configuration files
    - Create `pnpm-workspace.yaml` declaring `packages/*` and `apps/*`
    - Update root `package.json` to set `"private": true`, remove Plasmo-specific scripts, add workspace-level `build`, `typecheck`, `lint`, and `test` scripts using `pnpm -r`
    - Create `turbo.json` with build/typecheck/lint/dev/test task definitions and `^build` dependency ordering
    - Create `tsconfig.base.json` with shared strict TypeScript settings for all packages to extend
    - Create `.eslintrc.base.js` with shared ESLint configuration
    - Ensure existing `.prettierrc` with `@ianvs/prettier-plugin-sort-imports` is preserved at root
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 7.1, 7.2, 7.4, 7.5, 8.1, 8.4_

  - [x] 1.2 Create shared Tailwind CSS preset
    - Create a root-level `tailwind.preset.js` with shared color palette, font, and spacing tokens
    - Both apps will extend this preset via their own `tailwind.config.js` `presets` array
    - _Requirements: 3.4_

- [x] 2. Implement @quick-tools/platform package
  - [x] 2.1 Scaffold platform package structure
    - Create `packages/platform/package.json` with name `@quick-tools/platform`, version `0.1.0`, type `module`, exports field, and scripts (build, typecheck, lint)
    - Create `packages/platform/tsconfig.json` extending `tsconfig.base.json`
    - Create `packages/platform/tsup.config.ts` for ESM+CJS output with dts
    - _Requirements: 6.2, 1.7, 2.5, 2.7_

  - [x] 2.2 Implement platform interfaces and types
    - Create `packages/platform/src/types.ts` with `HttpRequestOptions`, `HttpResponse`, `ExtractedContent`, `PlatformErrorCategory`, `PlatformError`, `PlatformResult<T>` types
    - Create `packages/platform/src/interfaces.ts` with `FileDownloader`, `ClipboardAccess`, `StorageAdapter`, `HttpClient`, `ContentExtractor`, and `PlatformProvider` interfaces
    - Create `packages/platform/src/errors.ts` with error category constants and helper functions for creating typed error results
    - Create `packages/platform/src/registry.ts` with `registerPlatform()` and `getPlatform()` functions
    - Create `packages/platform/src/index.ts` barrel export
    - _Requirements: 6.1, 6.2, 6.5, 6.6, 6.7_

  - [x] 2.3 Write property test for platform registry (Property 6)
    - **Property 6: Platform registry round-trip**
    - Verify that `registerPlatform(provider)` followed by `getPlatform()` returns the same object reference
    - Verify that `getPlatform()` before registration throws an error
    - **Validates: Requirements 6.7**

  - [x] 2.4 Write property test for platform error results (Property 7)
    - **Property 7: Platform error results are well-typed**
    - For any failed platform operation result, verify `ok: false` with `error.category` matching a valid `PlatformErrorCategory` and non-empty `error.message`
    - **Validates: Requirements 6.6**

- [x] 3. Implement @quick-tools/json-formatter package
  - [x] 3.1 Scaffold json-formatter package structure
    - Create `packages/json-formatter/package.json` with name `@quick-tools/json-formatter`, workspace dependency on `@quick-tools/platform`
    - Create `packages/json-formatter/tsconfig.json` and `packages/json-formatter/tsup.config.ts`
    - _Requirements: 2.7, 1.7_

  - [x] 3.2 Extract JSON parsing and formatting logic
    - Create `packages/json-formatter/src/parse.ts` — extract `parseJsObjectToJson` logic from `JsonEditor.tsx` as `parseJsonOrJsObject`, ensure no DOM/browser/React imports
    - Create `packages/json-formatter/src/format.ts` — implement `formatJson(value, indent?)` and `minifyJson(value)` functions
    - Create `packages/json-formatter/src/types.ts` for any shared types
    - Create `packages/json-formatter/src/index.ts` barrel export
    - Preserve Chinese error message `"无法解析为JSON或JS对象: {detail}"`
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.8, 8.2_

  - [x] 3.3 Write property test for JSON parse round-trip (Property 1)
    - **Property 1: JSON parse round-trip**
    - For any valid JSON value, `parseJsonOrJsObject(formatJson(value))` deeply equals the original value
    - Use `fast-check` arbitraries for JSON-compatible values
    - **Validates: Requirements 2.1, 2.6**

  - [x] 3.4 Write unit tests for json-formatter edge cases
    - Test JS object literal parsing (single quotes, unquoted keys, trailing commas, comments)
    - Test error messages are in Chinese
    - Test minification produces valid JSON
    - _Requirements: 2.1, 2.6, 8.2_

- [x] 4. Implement @quick-tools/qr-code-gen package
  - [x] 4.1 Scaffold qr-code-gen package structure
    - Create `packages/qr-code-gen/package.json` with name `@quick-tools/qr-code-gen`, workspace dependency on `@quick-tools/platform`
    - Create `packages/qr-code-gen/tsconfig.json` and `packages/qr-code-gen/tsup.config.ts`
    - _Requirements: 2.7, 1.7_

  - [x] 4.2 Extract QR code history and validation logic
    - Create `packages/qr-code-gen/src/types.ts` with `HistoryItem` interface
    - Create `packages/qr-code-gen/src/history.ts` — extract `mergeHistory`, `exportHistoryData` (JSON serialization without DOM), `parseHistoryImport` (JSON parsing with validation) from current `utils.ts`
    - Create `packages/qr-code-gen/src/validation.ts` — extract `isValidHistoryItem`
    - Create `packages/qr-code-gen/src/index.ts` barrel export
    - Ensure no DOM APIs (document, Blob, URL.createObjectURL) or browser extension APIs in the package
    - Preserve Chinese error messages: `"文件格式不正确，应为 JSON 数组"`, `"文件中没有找到有效的地址记录"`, `"文件内容不是有效的 JSON 格式"`, `"读取文件失败"`
    - _Requirements: 2.2, 2.4, 2.5, 2.6, 2.8, 8.2_

  - [x] 4.3 Write property test for history merge (Property 3)
    - **Property 3: History merge preserves uniqueness and ordering**
    - For any two lists of HistoryItem, verify merged result has unique content values, descending timestamp order, and length ≤ 50
    - **Validates: Requirements 2.2**

  - [x] 4.4 Write property test for history serialization round-trip (Property 4)
    - **Property 4: History serialization round-trip**
    - For any list of valid HistoryItem objects, `parseHistoryImport(exportHistoryData(items))` produces items with identical content, timestamp, and tags
    - **Validates: Requirements 2.2, 2.6**

- [x] 5. Implement @quick-tools/web-export package
  - [x] 5.1 Scaffold web-export package structure
    - Create `packages/web-export/package.json` with name `@quick-tools/web-export`, workspace dependency on `@quick-tools/platform`
    - Create `packages/web-export/tsconfig.json` and `packages/web-export/tsup.config.ts`
    - _Requirements: 2.7, 1.7_

  - [x] 5.2 Extract web-export core logic
    - Create `packages/web-export/src/filename.ts` — move `sanitizeFileName`, `formatTimestamp`, `buildFilenameBase`, `buildDownloadFilename` from current `utils.ts`
    - Create `packages/web-export/src/markdown.ts` — move `buildMarkdownDocument` from current `utils.ts`
    - Create `packages/web-export/src/types.ts` — move/re-export `ExportFormat`, `MarkdownExportSource`, `ExportStatus`, `RenderJob` and related types
    - Create `packages/web-export/src/pdf.ts` — extract PDF page composition logic from `pdf-export.ts`, abstract platform-specific operations behind `PlatformProvider` interfaces
    - Create `packages/web-export/src/png.ts` — extract PNG export logic from `image-export.ts`, abstract DOM-to-image capture behind interfaces
    - Create `packages/web-export/src/pagination.ts` — move pagination logic from current `pagination.ts`
    - Create `packages/web-export/src/index.ts` barrel export
    - Ensure no direct imports of `chrome.*`, DOM globals, or browser extension APIs; use `PlatformProvider` for platform-specific operations
    - Preserve Chinese error messages: `"当前页面没有可导出的正文内容。"`, `"当前页面属于浏览器受限页面…"`, `"当前页面正文提取失败。请在普通网页中重试。"`, `"未找到可导出的活动标签页。"`
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.8, 8.2_

  - [x] 5.3 Write property test for filename sanitization (Property 2)
    - **Property 2: Filename sanitization removes all forbidden characters**
    - For any input string, verify `sanitizeFileName` result contains no forbidden characters, has length ≤ 120, and no consecutive whitespace
    - **Validates: Requirements 2.3**

  - [x] 5.4 Write property test for markdown document structure (Property 5)
    - **Property 5: Markdown document structure invariants**
    - For any MarkdownExportSource with non-empty title and url, verify output starts with `# {title}`, contains `- Source: {url}`, contains `- Captured At: {capturedAt}`, and ends with newline
    - **Validates: Requirements 2.3, 2.6**

  - [x] 5.5 Write unit tests for web-export edge cases
    - Test empty title fallback, maximum-length filename truncation, special characters in URLs
    - Test `buildDownloadFilename` extension mapping
    - _Requirements: 2.3, 2.6_

- [x] 6. Checkpoint - Verify shared packages build and pass tests
  - Ensure all tests pass, ask the user if questions arise.
  - Run `pnpm build` and `pnpm typecheck` from root to verify all 4 packages compile
  - Verify no package imports `chrome.*`, `@tauri-apps/*`, `document`, `window`, or `navigator` directly

- [x] 7. Set up browser extension app
  - [x] 7.1 Scaffold apps/extension package
    - Create `apps/extension/package.json` with Plasmo 0.90.5 dependency, workspace dependencies on all `@quick-tools/*` packages
    - Move existing `tsconfig.json` to `apps/extension/tsconfig.json`, adjust paths
    - Create `apps/extension/tailwind.config.js` with `plasmo-` prefix, extending root preset
    - Move existing Plasmo manifest configuration to `apps/extension/package.json`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.8, 1.4_

  - [x] 7.2 Implement Chrome platform adapter
    - Create `apps/extension/src/platform/storage.ts` — implement `StorageAdapter` using `chrome.storage.local`
    - Create `apps/extension/src/platform/downloads.ts` — implement `FileDownloader` using `chrome.downloads`
    - Create `apps/extension/src/platform/clipboard.ts` — implement `ClipboardAccess` using `navigator.clipboard`
    - Create `apps/extension/src/platform/http.ts` — implement `HttpClient` using `fetch`
    - Create `apps/extension/src/platform/content-extractor.ts` — implement `ContentExtractor` using `chrome.scripting`
    - Create `apps/extension/src/platform/index.ts` — assemble `PlatformProvider` and call `registerPlatform()` on extension startup
    - _Requirements: 6.3, 6.5, 6.6_

  - [x] 7.3 Migrate extension UI components and entry points
    - Move existing UI components to `apps/extension/src/components/`
    - Update imports in components to use `@quick-tools/json-formatter`, `@quick-tools/qr-code-gen`, `@quick-tools/web-export` for business logic
    - Move `popup.tsx`, `background.ts`, sidepanel, options, devtools, and tab entry points to `apps/extension/src/`
    - Ensure `background.ts` calls `registerPlatform()` before handling messages
    - Preserve all existing message types: `get-render-job`, `render-job-progress`, `render-job-complete`, `render-job-error`
    - Preserve context menu structure: parent "导出网页正文" with Markdown/PDF/PNG children
    - _Requirements: 4.5, 4.6, 4.7, 4.9, 8.3, 8.5, 8.6_

  - [x] 7.4 Write integration tests for extension build output
    - Verify built manifest.json contains correct permissions, host_permissions, content_security_policy, background.service_worker, action.default_popup
    - _Requirements: 4.9, 8.3_

- [x] 8. Checkpoint - Verify extension builds and works identically
  - Ensure all tests pass, ask the user if questions arise.
  - Run `pnpm --filter extension build` and verify the output manifest matches pre-refactoring expectations
  - Verify all Chrome extension permissions are preserved: contextMenus, downloads, scripting, storage, tabs

- [x] 9. Set up desktop app shell
  - [x] 9.1 Scaffold apps/desktop package with Tauri 2.x
    - Create `apps/desktop/package.json` with workspace dependencies on all `@quick-tools/*` packages, React 18, Tailwind CSS
    - Create `apps/desktop/tsconfig.json` extending root base
    - Create `apps/desktop/tailwind.config.js` (no prefix) extending root preset
    - Create `apps/desktop/src-tauri/Cargo.toml` with Tauri 2.x dependencies
    - Create `apps/desktop/src-tauri/tauri.conf.json` with window config (1024×768 default, 800×600 minimum)
    - Create `apps/desktop/src-tauri/src/main.rs` with Tauri app initialization
    - _Requirements: 5.1, 5.3_

  - [x] 9.2 Implement Tauri platform adapter
    - Create `apps/desktop/src/platform/storage.ts` — implement `StorageAdapter` using Tauri store plugin or local file
    - Create `apps/desktop/src/platform/file-system.ts` — implement `FileDownloader` using Tauri file dialog and fs APIs
    - Create `apps/desktop/src/platform/clipboard.ts` — implement `ClipboardAccess` using Tauri clipboard plugin
    - Create `apps/desktop/src/platform/http.ts` — implement `HttpClient` using Tauri HTTP plugin with 30s timeout
    - Create `apps/desktop/src/platform/content-extractor.ts` — implement `ContentExtractor` using HTTP fetch + Readability parsing
    - Create `apps/desktop/src/platform/index.ts` — assemble `PlatformProvider` and call `registerPlatform()`
    - _Requirements: 5.2, 5.4, 5.5, 5.7, 6.4_

  - [x] 9.3 Create desktop app shell with navigation
    - Create `apps/desktop/src/main.tsx` — app entry point, register platform before rendering
    - Create `apps/desktop/src/App.tsx` — layout with sidebar navigation between JSON formatter, QR code generator, and web export
    - Create placeholder page components for each feature that import from shared packages
    - Handle error states: HTTP timeout display (Req 5.6), file save cancel (Req 5.8)
    - _Requirements: 5.3, 5.6, 5.8, 3.1, 3.2, 3.3_

- [x] 10. Final wiring and workspace validation
  - [x] 10.1 Configure workspace dependency resolution
    - Verify all `workspace:*` references resolve correctly via `pnpm install`
    - Ensure Turborepo builds packages before apps (`^build` dependency)
    - Verify `pnpm -r build` succeeds with correct ordering: platform → json-formatter/qr-code-gen/web-export → extension/desktop
    - _Requirements: 1.4, 1.5, 1.6, 1.8, 7.2, 7.3_

  - [x] 10.2 Clean up root and remove migrated source files
    - Remove `src/` directory from root (now lives in apps/extension and packages)
    - Remove root-level Plasmo-specific config files that have been moved to apps/extension
    - Update `.gitignore` for new monorepo structure (dist dirs in packages, build dirs in apps)
    - Verify root `pnpm install` creates all workspace symlinks without errors
    - _Requirements: 1.2, 1.8_

  - [x] 10.3 Write smoke tests for workspace integrity
    - Verify each package can be imported independently without browser globals
    - Verify `pnpm -r typecheck` passes across all packages
    - Verify `pnpm -r lint` passes across all packages
    - _Requirements: 2.8, 8.5_

- [x] 11. Final checkpoint - Full monorepo validation
  - Ensure all tests pass, ask the user if questions arise.
  - Run `pnpm build` from root — all packages and apps should build successfully
  - Run `pnpm test` from root — all property tests and unit tests should pass
  - Verify extension build output is functionally equivalent to pre-refactoring

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using `fast-check`
- Unit tests validate specific examples and edge cases
- The existing browser extension must continue working identically — this is the primary backward compatibility constraint
- TypeScript is used throughout (design specifies TypeScript explicitly)
- `tsup` builds all shared packages; Plasmo builds the extension; Tauri builds the desktop app

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "3.1", "4.1", "5.1"] },
    { "id": 3, "tasks": ["3.2", "4.2", "5.2"] },
    { "id": 4, "tasks": ["3.3", "3.4", "4.3", "4.4", "5.3", "5.4", "5.5"] },
    { "id": 5, "tasks": ["7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "9.1"] },
    { "id": 7, "tasks": ["7.4", "9.2"] },
    { "id": 8, "tasks": ["9.3"] },
    { "id": 9, "tasks": ["10.1", "10.2"] },
    { "id": 10, "tasks": ["10.3"] }
  ]
}
```
