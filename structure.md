# structure.md — Quick Tools（代码导航视角：WHERE & 约定）

> 面向"我要在哪儿加文件 / 改哪个目录"的读者。命令与工具链看 [tech.md](./tech.md)；业务定位看 [product.md](./product.md)；总入口 [AGENTS.md](./AGENTS.md)。

## 1. 顶层目录树

```
quick-tools/
├── apps/
│   ├── extension/                 # @quick-tools/extension（Plasmo Chrome 扩展）
│   └── desktop/                   # @quick-tools/desktop（Tauri 2 桌面）
├── packages/                      # 4 个 workspace 库（tsup 产物，不含宿主 API）
│   ├── platform/                  # @quick-tools/platform
│   ├── json-formatter/            # @quick-tools/json-formatter
│   ├── qr-code-gen/               # @quick-tools/qr-code-gen
│   └── web-export/                # @quick-tools/web-export
├── tests/
│   └── workspace-integrity.test.ts
├── assets/                        # satori 字体 + 仓库根 icon.png
├── docs/REFACT_PLAN.md            # 旧方案（已部分否决）
├── .github/workflows/build.yml    # Plasmo BPP 发布
├── .kiro/                         # 内部 AI 助手规格/hook/steering
├── todo.md                        # 进行中项（人维护）
├── turbo.json / pnpm-workspace.yaml / pnpm-lock.yaml
├── tsconfig.base.json
├── tailwind.preset.js
├── .prettierrc.mjs / .eslintrc.base.js
├── vitest.config.mts              # 根 vitest：alias 指向 packages/*/src
└── AGENTS.md / product.md / tech.md / structure.md  # ← 本目录
```

## 2. 共享库（`packages/*`）

四个包都用 tsup 配置（`tsup.config.ts` 完全相同）：`entry: src/index.ts`，`format: ["esm", "cjs"]`，`dts: true`，`clean: true`，`sourcemap: true`。

| 包 | 入口 | 主要模块 | 关键约束 |
|---|---|---|---|
| `packages/platform` | `src/index.ts` | `types.ts` `interfaces.ts` `registry.ts` `errors.ts` | **零宿主依赖**；`registerPlatform(provider)` / `getPlatform()` 全局单例；统一返回 `PlatformResult<T> = { ok, value \| error }` |
| `packages/json-formatter` | `src/index.ts` | `parse.ts` `format.ts` `types.ts` | `parseJsonOrJsObject` 用纯字符串替换（不用 `eval/Function`），注释/单引号/无引号键/尾逗号 |
| `packages/qr-code-gen` | `src/index.ts` | `history.ts` `validation.ts` `types.ts` + `template/` 子模块 | 历史最大 50 条去重；模板语法 `{{ }}` 转义在 `template/parser.ts` |
| `packages/web-export` | `src/index.ts` | `types.ts` `filename.ts` `markdown.ts` + `__tests__/` | 仅导出类型/工具；**不导出**渲染管线（`@resvg-wasm`、`jspdf` 等重依赖在 extension 内） |

`packages/platform/src/interfaces.ts` 的契约（**所有宿主能力都从这里走**）：

```text
PlatformProvider = {
  fileDownloader   // FileDownloader
  clipboard        // ClipboardAccess
  storage          // StorageAdapter
  http             // HttpClient
  contentExtractor // ContentExtractor
}
```

## 3. Chrome 扩展（`apps/extension`）

### 3.1 目录

```
apps/extension/
├── package.json                # manifest 字段定义权限/host_permissions/CSP
├── tailwind.config.js          # preset + prefix "plasmo-"
├── postcss.config.js
├── tsconfig.json               # extends plasmo base + paths "~" -> ./src
├── vitest.config.ts
└── src/
    ├── popup.tsx               # 弹窗：Quick Tools 标题 + 打开独立 tab 按钮 + QrCodeGen
    ├── background.ts           # Service Worker：contextMenus 初始化 + 消息路由 + 状态写 chrome.storage.local
    ├── style.css               # Tailwind 入口
    ├── assets.d.ts
    ├── icons/                  # SVG icon 组件（~icons 路径别名）
    ├── components/index.ts     # 公共 barrel
    ├── platform/               # 平台适配：initChromePlatform()
    │   ├── index.ts
    │   ├── clipboard.ts
    │   ├── content-extractor.ts
    │   ├── downloads.ts
    │   ├── http.ts
    │   └── storage.ts
    ├── tabs/                   # 独立 tab 页
    │   ├── json-formatter.html # （**待确认**：当前目录只见 json-formatter.tsx 和 export-renderer.tsx，html 需 plasmo 生成或被忽略）
    │   ├── json-formatter.tsx
    │   ├── export-renderer.tsx
    │   └── export-renderer.html（同上待确认）
    ├── features/               # 三个领域 UI
    │   ├── json-formatter/
    │   │   ├── index.tsx                       # JsonFormatter（CodeMirror 编辑器）
    │   │   └── components/
    │   │       ├── JsonEditor.tsx
    │   │       └── JsonComparator.tsx          # 双栏 diff（行级）
    │   ├── qr-code-gen/
    │   │   ├── index.tsx                       # 顶层 QrCodeGen（QrCodeProvider + TemplateProvider）
    │   │   ├── context.tsx                     # QrCodeProvider 状态
    │   │   ├── types.ts
    │   │   ├── utils.ts
    │   │   ├── components/                     # HistoryList / InputSection / ModeSwitch / QrDisplay
    │   │   └── template/                       # 模板子模块（含 components/ + __tests__/）
    │   └── web-export/
    │       ├── background.ts 中负责协调
    │       ├── constants.ts                    # EXPORT_STATUS_KEY / EXPORT_TASK_KEY_PREFIX / MENU_IDS
    │       ├── types.ts                        # BackgroundMessage 等（从 @quick-tools/web-export re-type）
    │       ├── utils.ts                        # toDataUrl / createStatus / getTaskStorageKey
    │       ├── extract-page.ts                 # Readability 注入页内执行
    │       ├── image-export.ts                 # PNG 单图/分页
    │       ├── pdf-export.ts                   # PDF 拼装
    │       ├── pagination.ts                   # PNG/PDF 分页决策
    │       ├── render-constants.ts             # CONTENT_WIDTH 等
    │       ├── render-assets.ts                # 字体加载
    │       ├── markdown-render.ts              # Markdown → HTML（satori）
    │       ├── markdown-theme.css
    │       ├── extension-runtime.ts            # chrome.runtime.id / "context invalidated" 检测
    │       ├── use-export-renderer.ts          # 渲染管线 hook
    │       ├── export-renderer-tab.tsx         # 渲染 tab 的 UI
    │       └── popup-status.tsx                # 弹窗内状态卡片
    └── __tests__/manifest.test.ts              # 校验 package.json manifest
```

### 3.2 关键文件 → 职责

| 文件 | 职责 |
|---|---|
| `apps/extension/src/popup.tsx` | 弹窗入口，组合 `QrCodeGen` |
| `apps/extension/src/background.ts` | 初始化右键菜单；`contextMenus.onClicked` → `extractArticle(tabId)` → 渲染任务入 `chrome.storage.local` → 打开新 tab 跑 `export-renderer.html?taskId=...`；监听 `runtime.onMessage` 处理 `get-render-job` / `render-job-{progress,complete,error}` |
| `apps/extension/src/platform/index.ts` | 组装并 `registerPlatform(chromePlatform)`，必须在任何 platform 调用之前执行（`background.ts` 顶部即调用） |
| `apps/extension/src/features/web-export/extract-page.ts` | `extractArticleInPage()`，被 `chrome.scripting.executeScript` 注入到当前 tab 内执行，返回 `MarkdownExportSource` |
| `apps/extension/src/features/web-export/use-export-renderer.ts` | 渲染管线 hook：拉 job → 分页决策 → satori + resvg → 拼 PDF / PNG → 下载 → 通过 `chrome.runtime.sendMessage` 上报进度/结果 |
| `apps/extension/src/features/web-export/constants.ts` | `MENU_IDS = { parent, markdown, pdf, png } as const`；**`MENU_IDS.parent = "web-export:root"`** 即 todo.md 报告的潜在重复 ID 来源 |
| `apps/extension/src/features/qr-code-gen/context.tsx` | `QrCodeProvider` 全局状态：text / history / tags / 编辑项 |
| `apps/extension/src/features/qr-code-gen/template/` | 模板模式子模块（`parser` / `renderer` / `storage` / `import-export` / `components` / `__tests__`） |

### 3.3 Manifest（`apps/extension/package.json` 的 `manifest` 字段）

- `host_permissions`: `http://*/*`, `https://*/*`
- `permissions`: `contextMenus`, `downloads`, `scripting`, `storage`, `tabs`
- `content_security_policy.extension_pages`: `script-src 'self' 'wasm-unsafe-eval' http://localhost; object-src 'self';`（`@resvg/resvg-wasm` 需 `wasm-unsafe-eval`）

## 4. 桌面端（`apps/desktop`）

### 4.1 目录

```
apps/desktop/
├── package.json                 # vite + tauri scripts
├── vite.config.ts               # port 1420, alias ~, external @tauri-apps/*
├── tailwind.config.cjs          # preset（无 plasmo- 前缀）
├── postcss.config.cjs
├── tsconfig.json / vitest.config.ts
├── src/
│   ├── main.tsx                 # initTauriPlatform() + ReactDOM.createRoot
│   ├── App.tsx                  # Shell: NavigationRail + CommandBar + PageContainer + StatusStrip + Toast + CommandPalette
│   ├── index.css
│   ├── pages/                   # 三大领域页（与扩展 features 平行）
│   │   ├── JsonFormatterPage.tsx
│   │   ├── QrCodeGenPage.tsx
│   │   └── WebExportPage.tsx
│   ├── components/
│   │   ├── shell/               # NavigationRail, CommandBar, PageContainer, StatusStrip
│   │   ├── editor/              # SplitEditor, EditorPanel
│   │   ├── overlay/             # CommandPalette, NotificationToast, ContextDrawer
│   │   ├── shared/              # AriaLiveRegion, FocusRing, SkeletonLoader, Tooltip, IconButton
│   │   ├── template/            # 模板相关组件
│   │   ├── HistoryPanel.tsx / BatchUrlPanel.tsx
│   │   ├── CodeMirrorEditor.tsx / DiffViewer.tsx / ResizableSplitPane.tsx
│   │   ├── MarkdownPreview.tsx / QrRenderer.tsx / Toast.tsx
│   ├── hooks/                   # useDebounce, useHistory, useTemplateStore, useCommandPalette, useTheme, useToast(Stack), useWindowState, useReducedMotion, usePageTransition
│   ├── lib/                     # 纯函数：fuzzy-search, qr-capacity, json-linter, batch-parser, path-truncate, turndown-config, template-io, design-tokens
│   ├── platform/                # 桌面端平台适配
│   │   ├── index.ts             # initTauriPlatform()：Tauri 环境下注册 tauriPlatform，否则降级 browserPlatform
│   │   ├── file-system.ts       # @tauri-apps/plugin-fs / plugin-dialog
│   │   ├── clipboard.ts / http.ts / storage.ts
│   │   ├── content-extractor.ts # Readability + Turndown
│   │   ├── file-opener.ts / browser.ts
│   ├── types/                   # page-shell.ts, history-props.ts
│   └── tokens/                  # （空或近空，**待确认**）
└── src-tauri/                   # Rust 端
    ├── Cargo.toml               # tauri 2 + tauri-plugin-opener
    ├── tauri.conf.json          # productName=Quick Tools, identifier=com.quick-tools.desktop, 1024x768, bundle.all
    └── src/main.rs              # tauri::Builder + tauri_plugin_opener
```

### 4.2 关键文件 → 职责

| 文件 | 职责 |
|---|---|
| `apps/desktop/src/main.tsx` | `initTauriPlatform()` 必须先于 `App` 挂载 |
| `apps/desktop/src/platform/index.ts` | 通过 `isTauriRuntime()`（检查 `window.__TAURI_INTERNALS__?.invoke`）二选一注册 `tauriPlatform` 或 `browserPlatform` |
| `apps/desktop/src/App.tsx` | 壳层；用 `PageId = "json-formatter" \| "qr-code-gen" \| "web-export"` 路由；`PageContainer` 通过对象映射渲染当前页 |
| `apps/desktop/src/components/shell/NavigationRail.tsx` | 左侧导航；roving tabindex 模式；900–1024px 视口抑制 auto tooltip |
| `apps/desktop/src/components/shell/PageContainer.tsx` | 用 `motion/react` 做页面切换动画，遵守 `prefers-reduced-motion` |
| `apps/desktop/src/components/overlay/CommandPalette.tsx` | ⌘K / Ctrl+K 命令面板；接入 `useCommandPalette` |
| `apps/desktop/src/lib/turndown-config.ts` | 桌面端 Readability→Markdown 的 turndown 配置（带 GFM） |

### 4.3 Tauri 配置

- `tauri.conf.json` `app.windows`：1024×768（min 800×600）
- `bundle.targets: "all"`，`bundle.active: true`
- 插件：`tauri-plugin-opener`（`src/main.rs`）；前端通过 `@tauri-apps/plugin-{fs,dialog,store,clipboard-manager,http}` 调系统能力

## 5. 跨形态复用关系

```
                     ┌────────────────────────┐
                     │  @quick-tools/platform │  ← 接口 + 错误模型 + registerPlatform
                     └────────────┬───────────┘
                                  │ 全部 4 个包依赖
        ┌──────────┬──────────────┼──────────────┬──────────┐
        │          │              │              │          │
  json-formatter  qr-code-gen   web-export      (extension/desktop 用)
        │          │              │
        └──────────┴──────┬───────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
 apps/extension  (Plasmo)         apps/desktop (Tauri 2 + Vite)
 - popup.tsx / background.ts     - App.tsx (shell)
 - features/<domain>/            - pages/<Domain>Page.tsx
 - platform/{chrome适配}          - platform/{tauri/browser适配}
 - tabs/{独立 tab}                - src-tauri/ (Rust)
```

## 6. 编码约定

### 6.1 通用

- **TypeScript strict** + `noUncheckedIndexedAccess` + `noUnusedLocals` + `noImplicitReturns`
- 文件：kebab-case；React 组件：PascalCase；常量：UPPER_SNAKE_CASE；函数/变量：camelCase
- 导出的 React 组件用 `export const ComponentName = () => { ... }`；入口文件用 `export default function`
- `as const` 锁定常量对象（`MENU_IDS`, `EXPORT_STATUS_KEY`）

### 6.2 Import 顺序（prettier 强制）

```
1. Node built-ins
2. 第三方包
3. (空行)
4. @plasmo/*      ← 扩展端常见
5. (空行)
6. @plasmohq/*
7. (空行)
8. ~*  (本 app src 别名)
9. (空行)
10. @quick-tools/* (workspace 包)
11. (空行)
12. ./ (相对路径)
```

### 6.3 错误处理

- 异步 API 包 try/catch；`error instanceof Error` 后取 `.message`
- 内部用 `PlatformResult<T>`；UI 弹出的最终用户消息**中文**
- 静默初始化用 `void setupContextMenus().catch(console.error)` 或 `void xxx().catch(console.error)`
- chrome.runtime 失效检测：`extension-runtime.ts` 提供 `isExtensionContextInvalid` / `hasRuntimeContext`

### 6.4 Tailwind

- 扩展：所有类必须带 `plasmo-` 前缀（`apps/extension/tailwind.config.js` 的 `prefix`）
- 桌面：无前缀
- 共享 token：`tailwind.preset.js`（`dt-*` 命名空间覆盖字体/字号/颜色/圆角/阴影/动效）
- 不写内联样式，**仅动态值**（如编辑器高度）除外

### 6.5 平台调用

- **`packages/*` 禁止 `chrome.*` 或 `@tauri-apps/*`**——必须通过 `getPlatform()` 拿
- 新增宿主能力：① `packages/platform/src/interfaces.ts` 加接口 ② 两个 app 的 `platform/*.ts` 各实现 ③ `registerPlatform` 注入

## 7. 测试约定

- 工具：vitest + fast-check
- 位置：每个被测模块旁的 `__tests__/`
- 文件命名：
  - `*.test.ts(x)` — 单元/集成
  - `*.property.test.ts` — fast-check 属性测试（**至少 parser、renderer、merge 用属性测**）
- 跑测：通过根 `vitest.config.mts`（alias 指向 `packages/*/src`）；turbo 模式下 `pnpm test` 会先 `^build`
- 集成：根 `tests/workspace-integrity.test.ts` 验证 `@quick-tools/*` 可在 Node 环境直接 import

## 8. "我想做 X，应该改哪里" 速查

| 需求 | 改哪里 |
|---|---|
| 加新的 JSON 操作（如 sort / 去重 / JSONPath） | `packages/json-formatter/src/`，在 `index.ts` barrel 导出 → `apps/extension/src/features/json-formatter/index.tsx` 与 `apps/desktop/src/pages/JsonFormatterPage.tsx` 加按钮 |
| QR 新能力（颜色、Logo、SVG 导出） | `apps/extension/src/features/qr-code-gen/` 与 `apps/desktop/src/pages/QrCodeGenPage.tsx`（`qrcode.react` 已支持大部分） |
| QR 模板语法扩展 | `packages/qr-code-gen/src/template/parser.ts`（**parser 与 pretty-printer 必须同步修改**，并补 `__tests__/parser-roundtrip.property.test.ts`） |
| 导出新格式（如 HTML、DOCX） | `packages/web-export/src/` 加工具 → `apps/extension/src/features/web-export/` 加渲染管线 → `apps/extension/src/background.ts` 的 `exportCurrentPage` 路由 → 桌面端 `WebExportPage.tsx` |
| 新宿主能力（如分享、通知） | `packages/platform/src/interfaces.ts` 加接口 → 两个 app 的 `platform/` 实现 → `getPlatform().xxx()` 调用 |
| 加新页面 | 桌面：`apps/desktop/src/pages/<Name>Page.tsx` + `apps/desktop/src/components/shell/NavigationRail.tsx` 的 `navItems` + `App.tsx` 的 `PAGE_LABELS` 映射 + `PageContainer` 子节点 |
| 改设计 token | 仓库根 `tailwind.preset.js` |
| 加测试 | 找最近 `__tests__/`；属性测试用 `fc.assert(fc.property(...))` 包装在 `*.property.test.ts` |

## 9. 命名/落点常见误用（避坑）

- ❌ 在 `packages/*` 里 `import "chrome"` 或 `"@tauri-apps/api"` → 编译期就违反边界
- ❌ 在 `apps/extension` 里漏写 `plasmo-` 前缀 → 样式丢失
- ❌ 在 `apps/desktop` 里写 `plasmo-flex` → 类名无效（无 prefix）
- ❌ 直接 `import { ... } from "@quick-tools/extension"` 或 `"@quick-tools/desktop"` → workspace 包是库，app 之间**不互相依赖**
- ❌ 修改 `apps/extension/build/`、`packages/*/dist/`、`apps/desktop/src-tauri/target/` → 这些都是构建产物（已 .gitignore）
