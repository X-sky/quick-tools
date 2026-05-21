# Implementation Plan: QR Template Generator

## Overview

在现有 Popup 二维码功能中集成"模板模式"。通过模式切换开关在同一 UI 中提供模板化二维码生成能力。实现采用独立 React Context + localStorage 键隔离策略，不修改现有 `QrCodeProvider` 和 `qrcode-history` 数据流。

## Tasks

- [x] 1. Define data models and utility types
  - [x] 1.1 Create template data model types
    - Create `src/features/qr-code-gen/template/types.ts`
    - Define `Template`, `PlaceholderValueEntry`, `CombinationTag`, `TemplateStore` interfaces
    - Define `Result<T>`, `RecallResult`, `ExportSchema` types
    - Define `Segment`, `ParseError`, `ParseResult` interfaces for the parser
    - _Requirements: 2.1, 3.2, 4.1, 4.2, 6.1, 8.1, 9.2_

- [x] 2. Implement Template Parser and Renderer (pure functions)
  - [x] 2.1 Implement Template_Parser `parse` function
    - Create `src/features/qr-code-gen/template/parser.ts`
    - Implement `parse(templateString: string): ParseResult` that recognizes `{name}` tokens, `{{`/`}}` escapes
    - Handle error cases: `{}` (empty name), unclosed `{`, invalid characters in name
    - Return partial segment list + all errors (continue scanning after each error)
    - Produce deduplicated placeholder name list in first-occurrence order
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11_

  - [x] 2.2 Implement Template_Pretty_Printer `print` function
    - Add `print(segments: Segment[]): string` to `parser.ts`
    - Escape literal `{` as `{{` and literal `}` as `}}`
    - _Requirements: 4.12_

  - [x] 2.3 Implement Template_Renderer `render` function
    - Create `src/features/qr-code-gen/template/renderer.ts`
    - Implement `render(templateString: string, values: Record<string, string>): string`
    - Substitute placeholder tokens with values verbatim (no re-parsing of substituted result)
    - Handle placeholder-free templates (decode escaped braces only)
    - _Requirements: 7.1, 7.2, 10.2_

  - [x] 2.4 Write property test for parser round-trip (print → parse)
    - **Property 1: Parser and Pretty Printer Round-Trip**
    - **Validates: Requirements 4.12, 4.4, 4.5**

  - [x] 2.5 Write property test for template string round-trip (parse → print)
    - **Property 2: Template_String Round-Trip**
    - **Validates: Requirements 4.1, 4.2, 4.12**

  - [x] 2.6 Write property test for substitution fidelity
    - **Property 3: Substitution Fidelity**
    - **Validates: Requirements 7.1, 10.2**

  - [x] 2.7 Write property test for substitution idempotence on placeholder-free templates
    - **Property 4: Substitution Idempotence**
    - **Validates: Requirements 7.2**

- [x] 3. Implement Template Store persistence layer
  - [x] 3.1 Implement storage read/write with backup recovery
    - Create `src/features/qr-code-gen/template/storage.ts`
    - Implement `loadStore(): TemplateStore` — read from `qrcode-template-store`, handle corrupt JSON (backup to `.bak` key, return empty store)
    - Implement `saveStore(store: TemplateStore): void` — single `localStorage.setItem` atomic write
    - _Requirements: 2.1, 10.1, 10.5, 10.6_

  - [x] 3.2 Implement placeholder value list operations
    - Add `addValue`, `deleteValue`, `reorderValues` functions to `storage.ts`
    - Enforce deduplication (silent no-op on duplicate add), empty-value rejection
    - Retain orphaned placeholder value lists when template string changes (for later reuse)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 3.3 Write property test for placeholder value set operations
    - **Property 8: Placeholder_Value Set Operations**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.5, 6.6**

- [x] 4. Implement Import/Export Service
  - [x] 4.1 Implement export and import logic
    - Create `src/features/qr-code-gen/template/import-export.ts`
    - Implement `exportToFile(store: TemplateStore): void` — generate JSON file named `qrcode-templates-YYYY-MM-DD.json` with `version: 1`
    - Implement `validateExportSchema(data: unknown): data is ExportSchema`
    - Implement `mergeStores(local: TemplateStore, imported: ExportSchema): TemplateStore` — merge by ID for templates (keep newer `updatedAt`), union for values, merge by `(templateId, name)` for tags (keep newer `createdAt`)
    - Implement `importFromJson(json: string, currentStore: TemplateStore): ImportResult` — validate, merge, report counts
    - Handle error cases: invalid JSON, wrong schema, version too new
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_

  - [x] 4.2 Write property test for import/export round-trip
    - **Property 5: Import and Export Round-Trip**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**

  - [x] 4.3 Write property test for merge idempotence
    - **Property 6: Merge Idempotence on Repeat Import**
    - **Validates: Requirements 9.4, 9.5, 9.6**

- [x] 5. Checkpoint - Ensure pure logic modules compile
  - Ensure all pure function modules (`types.ts`, `parser.ts`, `renderer.ts`, `storage.ts`, `import-export.ts`) compile without errors via `tsc --noEmit`, ask the user if questions arise.

- [x] 6. Implement TemplateProvider context
  - [x] 6.1 Create TemplateProvider with full state management
    - Create `src/features/qr-code-gen/template/context.tsx`
    - Implement `TemplateProvider` wrapping all template state: store, active template, selections (transient)
    - Implement template CRUD: `createTemplate`, `updateTemplate`, `deleteTemplate` with validation (empty name, empty string, duplicate name, parser errors)
    - Implement placeholder value management: `addPlaceholderValue`, `deletePlaceholderValue`, `reorderPlaceholderValues`
    - Implement combination tag operations: `saveCombinationTag`, `deleteCombinationTag`, `recallCombinationTag`
    - Implement `exportAll` and `importFromFile` delegating to import-export module
    - Implement `selections` state (transient, not persisted) and `setSelection`/`clearSelections`
    - On delete template: cascade remove placeholder values and combination tags for that template
    - On recall tag with missing candidate value: re-add value to candidate list
    - On recall tag with stale placeholder: partial recall + warning
    - Expose `useTemplate()` hook
    - _Requirements: 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 5.4, 5.5, 6.1, 6.2, 6.3, 6.5, 6.6, 8.1, 8.2, 8.3, 8.5, 8.6, 8.7, 8.8_

  - [x] 6.2 Write property test for combination tag recall fidelity
    - **Property 7: Combination_Tag Recall Fidelity**
    - **Validates: Requirements 8.1, 8.2**

- [x] 7. Implement ModeSwitch component and modify QrCodeGen entry
  - [x] 7.1 Create ModeSwitch component
    - Create `src/features/qr-code-gen/components/ModeSwitch.tsx`
    - Render segmented control (two-segment button) for "自由" / "模板" modes
    - Accept `mode` and `onModeChange` props
    - Style with Tailwind `plasmo-` prefix classes
    - _Requirements: 1.1_

  - [x] 7.2 Modify QrCodeGen index to integrate mode switching
    - Modify `src/features/qr-code-gen/index.tsx`
    - Add `useState<"free" | "template">("free")` for mode state (not persisted)
    - Wrap content with `TemplateProvider`
    - Use `display: none` / `display: contents` to hide/show mode UIs (preserve Free_Mode state)
    - Place ModeSwitch above existing content
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 10.4_

- [x] 8. Implement Template Mode UI components
  - [x] 8.1 Create TemplateManager component
    - Create `src/features/qr-code-gen/template/components/TemplateManager.tsx`
    - Display template list ordered by `updatedAt` descending
    - Provide create form (name + template string input with live parser error feedback)
    - Provide edit flow for existing templates (name and template string)
    - Provide delete with confirmation
    - Show validation error messages in Chinese
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 8.2 Create PlaceholderEditor component
    - Create `src/features/qr-code-gen/template/components/PlaceholderEditor.tsx`
    - Display template string as read-only preview with placeholder tokens visually highlighted
    - Render one selector/input per placeholder with candidate values from store
    - Support custom value input (active for current render without persisting)
    - Provide "保存为候选值" button to persist custom value
    - Show Final_String as read-only label
    - Show messages when placeholders lack values or selections are incomplete
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 8.3 Create CombinationTagPanel component
    - Create `src/features/qr-code-gen/template/components/CombinationTagPanel.tsx`
    - Display saved combination tags for active template ordered by `createdAt` descending
    - Provide save form (tag name input)
    - Handle duplicate name confirmation dialog ("组合标签名称已存在，是否覆盖？")
    - Provide recall (click tag → restore selections → re-render QR)
    - Provide delete
    - Show warning on stale placeholder recall
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x] 8.4 Create TemplateQrDisplay component
    - Create `src/features/qr-code-gen/template/components/TemplateQrDisplay.tsx`
    - Render QR code from Final_String using `qrcode.react`
    - Show length warning when Final_String > 2953 characters
    - Show empty state with appropriate messages when selections incomplete
    - _Requirements: 7.3, 7.4, 7.6, 7.7, 10.3_

  - [x] 8.5 Create template components barrel export
    - Create `src/features/qr-code-gen/template/components/index.tsx`
    - Re-export all template components
    - _Requirements: N/A (project structure)_

- [x] 9. Implement Import/Export UI integration
  - [x] 9.1 Add import/export buttons to TemplateManager
    - Add export button that calls `exportAll` from TemplateProvider
    - Add import button with file input that calls `importFromFile`
    - Display Chinese-language toast with import result counts
    - _Requirements: 9.1, 9.7, 9.8, 9.9, 9.10_

- [x] 10. Wire template mode components together
  - [x] 10.1 Compose Template Mode layout
    - Create `src/features/qr-code-gen/template/index.tsx` as the Template Mode root component
    - Layout: TemplateManager (left/top) + PlaceholderEditor + CombinationTagPanel + TemplateQrDisplay
    - Ensure all components consume `useTemplate()` context
    - Wire QR rendering: selection changes → render → display within 200ms
    - _Requirements: 1.2, 7.4_

  - [x] 10.2 Update QrCodeGen to import and render Template Mode
    - Import template mode root component in `src/features/qr-code-gen/index.tsx`
    - Render inside the `mode === "template"` container
    - Update `src/features/qr-code-gen/components/index.tsx` to re-export ModeSwitch
    - _Requirements: 1.2, 1.3_

- [x] 11. Final checkpoint - Ensure build passes
  - Ensure `pnpm build` completes without errors, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- No test framework is currently configured; optional test tasks require installing `vitest` + `fast-check` first
- All new template code goes under `src/features/qr-code-gen/template/`
- Existing files (`context.tsx`, `types.ts`, `utils.ts`, components) remain unchanged except `index.tsx` and `components/index.tsx`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "3.1"] },
    { "id": 3, "tasks": ["2.4", "2.5", "2.6", "2.7", "3.2"] },
    { "id": 4, "tasks": ["3.3", "4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "6.1"] },
    { "id": 6, "tasks": ["6.2", "7.1", "7.2"] },
    { "id": 7, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5"] },
    { "id": 8, "tasks": ["9.1"] },
    { "id": 9, "tasks": ["10.1", "10.2"] }
  ]
}
```
