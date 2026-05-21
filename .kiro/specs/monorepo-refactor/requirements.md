# Requirements Document

## Introduction

将当前 Quick Tools 浏览器扩展项目重构为 pnpm monorepo 架构。核心业务逻辑（JSON 格式化、QR 码生成、网页导出）抽取为独立共享包，支持浏览器扩展和桌面端应用两种产品形态复用同一套核心代码。重构过程中现有功能保持向后兼容，不影响已有用户体验。

## Glossary

- **Monorepo**: 使用单一代码仓库管理多个相互关联的包（packages）和应用（apps）的项目组织方式
- **Workspace**: pnpm workspace 机制下的一个独立包或应用，拥有独立的 package.json
- **Core_Package**: 从现有功能中抽取的、不依赖特定运行时环境的共享业务逻辑包
- **App_Extension**: 基于 Plasmo 框架的浏览器扩展应用包
- **App_Desktop**: 基于 Tauri 框架的桌面端应用包
- **Platform_Adapter**: 为不同运行时环境（浏览器扩展 / 桌面端）提供统一接口的适配层
- **Build_System**: monorepo 中负责构建、类型检查、代码检查的工具链配置
- **Shared_UI**: （暂不设立）未来桌面端 UI 稳定后可按需抽取的跨应用 React UI 组件包

## Requirements

### Requirement 1: Monorepo 工作区结构

**User Story:** As a developer, I want the project organized as a pnpm monorepo with clear package boundaries, so that I can independently develop, build, and version each package.

#### Acceptance Criteria

1. THE Build_System SHALL use pnpm workspace protocol to manage all packages under a single repository, with a root-level `package.json` that does not itself publish (set `"private": true`).
2. THE Build_System SHALL organize packages into `packages/` directory for shared libraries and `apps/` directory for deployable applications, where each directory contains one subdirectory per package.
3. THE Build_System SHALL provide a root-level `pnpm-workspace.yaml` that declares workspace members using the glob patterns `packages/*` and `apps/*`.
4. WHEN a new package is added to the workspace, THE Build_System SHALL resolve internal dependencies via `workspace:*` protocol in the consuming package's `package.json` dependencies or devDependencies, such that `pnpm install` links the local package without fetching from a remote registry.
5. THE Build_System SHALL provide root-level scripts named `build`, `typecheck`, and `lint` that execute the corresponding command across all workspace packages using pnpm's recursive execution (`pnpm -r`).
6. IF a root-level workspace script encounters a failure in any package, THEN THE Build_System SHALL exit with a non-zero exit code and report which package(s) failed.
7. THE Build_System SHALL require each workspace member to contain a `package.json` with at minimum the fields `name` (scoped or unscoped) and `version`.
8. WHEN a developer runs `pnpm install` at the repository root, THE Build_System SHALL install dependencies for all workspace members and create symlinks for internal workspace dependencies without requiring any additional manual steps.

### Requirement 2: 核心业务逻辑包抽取

**User Story:** As a developer, I want core business logic extracted into platform-agnostic packages, so that both the browser extension and desktop app can share the same implementation.

#### Acceptance Criteria

1. THE Core_Package SHALL provide a `@quick-tools/json-formatter` package containing JSON parsing (including JavaScript object literal to JSON conversion), formatting with configurable indentation, and minification logic without any imports from UI frameworks (React, Vue, Angular), DOM APIs (document, window, navigator), or browser extension APIs (chrome.*, browser.*)
2. THE Core_Package SHALL provide a `@quick-tools/qr-code-gen` package containing QR code data encoding logic, history item data structures, history merge operations, and import/export serialization logic without imports from browser extension APIs (chrome.*, browser.*) or DOM APIs (document, localStorage)
3. THE Core_Package SHALL provide a `@quick-tools/web-export` package containing content extraction, Markdown document generation, filename building, PDF page composition, and PNG export logic, with platform-specific operations (file download triggering, clipboard access, DOM-to-image capture, font asset loading) abstracted behind TypeScript interfaces that consumers must implement
4. WHEN the Core_Package exposes a function that requires platform-specific behavior (file system access, clipboard, storage, DOM rendering, or network requests), THE Core_Package SHALL accept the platform capability as a parameter or via a configuration object passed at initialization, rather than importing it directly
5. THE Core_Package SHALL export TypeScript type definitions (.d.ts files) for all public functions, interfaces, and type aliases exposed by each package
6. THE Core_Package SHALL produce identical output values as the current implementation when given the same inputs, verified by unit tests covering JSON parse/format/minify operations, Markdown document generation, filename building, and history merge logic
7. THE Core_Package SHALL publish each package in ES Module format with a package.json `exports` field specifying the public entry points, ensuring each package is independently installable without peer dependencies on the other packages
8. IF a consumer imports a Core_Package module in an environment without browser globals (window, document, chrome), THEN THE Core_Package SHALL load and initialize without throwing runtime errors, provided platform-specific interface implementations are not invoked

### Requirement 3: 各应用独立维护 UI 组件

**User Story:** As a developer, I want each app to maintain its own UI components independently, so that each product form can optimize layout and interaction for its specific platform constraints without cross-app coupling.

#### Acceptance Criteria

1. THE App_Extension SHALL maintain its own React UI components within its source directory, importing only business logic from Core_Package and platform interfaces from Platform_Adapter
2. THE App_Desktop SHALL maintain its own React UI components within its source directory, independently implementing layouts optimized for desktop window sizes and navigation patterns
3. WHEN both apps need similar visual behavior, each app SHALL implement its own component using shared types and logic from Core_Package, rather than depending on a shared UI component package
4. THE Build_System SHALL provide a shared Tailwind CSS preset configuration at the root level that both apps can optionally extend via their own `tailwind.config` `presets` array
5. IF a reusable UI component package becomes necessary after the desktop app UI stabilizes, THEN it SHALL be extracted as a future enhancement without requiring changes to Core_Package or Platform_Adapter interfaces

### Requirement 4: 浏览器扩展应用包

**User Story:** As a user, I want the browser extension to continue working exactly as before after the refactoring, so that my existing workflow is not disrupted.

#### Acceptance Criteria

1. THE App_Extension SHALL continue using Plasmo framework version 0.90.5 as the build and runtime foundation
2. THE App_Extension SHALL import business logic from Core_Package and UI components from Shared_UI via pnpm workspace `workspace:*` dependency declarations in its `package.json`
3. THE App_Extension SHALL retain all existing Chrome extension permissions: contextMenus, downloads, scripting, storage, tabs
4. THE App_Extension SHALL retain the existing host_permissions `["http://*/*", "https://*/*"]` and the existing content_security_policy including `wasm-unsafe-eval` in the manifest configuration
5. THE App_Extension SHALL maintain the existing popup interface containing the QrCodeGen component and a button that opens the JSON formatter tab at `tabs/json-formatter.html`, with no change to user-visible layout or interactive behavior
6. THE App_Extension SHALL maintain the existing context menu structure: a parent menu item "导出网页正文" with three child items for Markdown, PDF, and PNG export formats, triggered on page context
7. THE App_Extension SHALL maintain the existing background service worker message handling for the four message types: `get-render-job`, `render-job-progress`, `render-job-complete`, and `render-job-error`, preserving their request and response payload shapes
8. THE App_Extension SHALL continue using the `plasmo-` Tailwind prefix for all extension-specific styling
9. WHEN the extension is built, THE App_Extension SHALL produce a manifest.json containing the same `permissions`, `host_permissions`, `content_security_policy`, `background.service_worker`, and `action.default_popup` fields as the current build output

### Requirement 5: 桌面端应用包

**User Story:** As a user, I want a desktop application that provides the same core tools (JSON formatter, QR code generator, web export) in a native window, so that I can use these tools without opening a browser.

#### Acceptance Criteria

1. THE App_Desktop SHALL use Tauri 2.x as the desktop application framework for cross-platform support (macOS, Windows, Linux)
2. THE App_Desktop SHALL import business logic from Core_Package and UI components from Shared_UI via workspace dependencies
3. THE App_Desktop SHALL provide a window-based interface with a minimum window size of 800×600 pixels and a persistent navigation element (sidebar or tab bar) allowing the user to switch between JSON formatter, QR code generator, and web export features
4. THE App_Desktop SHALL implement Platform_Adapter for desktop-specific operations: file system write access for saving exported files, clipboard write for copying text and image content, and URL fetching for web export
5. WHEN the user triggers a web export in the desktop app, THE App_Desktop SHALL use Tauri HTTP client to fetch page content with a request timeout of 30 seconds instead of Chrome scripting API
6. IF the Tauri HTTP client request fails or times out during web export, THEN THE App_Desktop SHALL display an error message indicating the failure reason and preserve any user input entered before the export attempt
7. THE App_Desktop SHALL support native file save dialogs for export operations (JSON file save, QR code image save, and web export file save) instead of Chrome downloads API
8. IF the user cancels the native file save dialog, THEN THE App_Desktop SHALL abort the save operation without data loss and return the user to the previous view with all content intact

### Requirement 6: 平台适配层

**User Story:** As a developer, I want a clear abstraction layer between core logic and platform APIs, so that adding new platforms in the future requires minimal changes to shared code.

#### Acceptance Criteria

1. THE Platform_Adapter SHALL define TypeScript interfaces for each platform-specific capability: `FileDownloader` for file download, `ClipboardAccess` for clipboard read/write, `StorageAdapter` for key-value storage, `HttpClient` for HTTP requests, and `ContentExtractor` for page content extraction, where each interface declares only async methods with typed input parameters and typed return values.
2. THE Platform_Adapter SHALL provide a `@quick-tools/platform` package that exports these five capability interfaces, a combined `PlatformProvider` interface aggregating all capabilities, and shared type definitions for operation results and error types used across interfaces.
3. WHEN App_Extension initializes, THE Platform_Adapter SHALL provide a Chrome extension implementation of `PlatformProvider` that delegates to `chrome.storage`, `chrome.downloads`, and `chrome.scripting` APIs, and THE App_Extension SHALL register this implementation before any Core_Package function is invoked.
4. WHEN App_Desktop initializes, THE Platform_Adapter SHALL provide a Tauri implementation of `PlatformProvider` that delegates to Tauri file system, clipboard, and HTTP APIs, and THE App_Desktop SHALL register this implementation before any Core_Package function is invoked.
5. THE Platform_Adapter SHALL ensure Core_Package has zero import statements referencing `chrome.*` APIs, `@tauri-apps/*` packages, or any other platform-specific module; Core_Package SHALL access platform capabilities exclusively through the `PlatformProvider` interface received via dependency injection.
6. IF a platform operation invoked through a Platform_Adapter interface fails, THEN THE Platform_Adapter implementation SHALL return a typed error result containing an error category and a human-readable message, rather than throwing an untyped exception, so that Core_Package can handle failures without platform-specific catch logic.
7. THE Platform_Adapter SHALL export a `registerPlatform` function that accepts a `PlatformProvider` implementation and a `getPlatform` function that returns the registered implementation, and Core_Package SHALL call `getPlatform` to obtain platform capabilities at the point of use.

### Requirement 7: 构建与开发体验

**User Story:** As a developer, I want efficient build tooling and development workflows across the monorepo, so that I can iterate quickly on any package without rebuilding everything.

#### Acceptance Criteria

1. THE Build_System SHALL use Turborepo for orchestrating builds, caching, and task dependencies across workspace packages
2. THE Build_System SHALL configure build pipelines so that shared packages are built before dependent apps
3. WHEN a developer modifies a Core_Package source file, THE Build_System SHALL only rebuild affected packages and their dependents
4. THE Build_System SHALL provide a shared TypeScript configuration base that all packages extend
5. THE Build_System SHALL provide a shared ESLint configuration that all packages extend
6. THE Build_System SHALL use `tsup` or equivalent bundler for building Core_Package and Shared_UI into ESM and CommonJS formats with type declarations

### Requirement 8: 向后兼容与迁移安全

**User Story:** As a developer, I want the refactoring to preserve all existing behavior and code conventions, so that the migration introduces zero functional regressions.

#### Acceptance Criteria

1. THE Build_System SHALL enforce the existing code style conventions via Prettier configuration: no semicolons, double quotes, no trailing commas, kebab-case file names, PascalCase components, and all refactored files SHALL pass formatting validation with the existing Prettier config without modification
2. THE Core_Package SHALL preserve all existing user-facing error messages in Chinese, with no error message string removed, altered in meaning, or replaced with a non-Chinese equivalent
3. WHEN the App_Extension is built from the refactored monorepo, THE App_Extension SHALL produce an extension with an identical manifest.json (same permissions, same content_scripts, same background configuration), identical UI rendering for all feature entry points (popup, sidepanel, options, devtools, tabs), and identical export outputs (Markdown, PDF, PNG) given the same input content
4. THE Build_System SHALL preserve the existing import sort order convention by including `@ianvs/prettier-plugin-sort-imports` with the same ordering rules in the monorepo Prettier configuration
5. IF a shared package introduces a breaking API change (removing or renaming a public export, changing function signatures, or altering return types) during refactoring, THEN THE Build_System SHALL ensure both App_Extension and App_Desktop compile successfully and all existing public API call sites are updated to use the new signatures before the change is merged
6. WHEN the App_Extension is built from the refactored monorepo, THE App_Extension SHALL preserve all existing Chrome extension message-passing contracts (chrome.runtime.onMessage handlers, context menu registrations, and storage key names) such that no inter-component communication breaks compared to the pre-refactoring build
