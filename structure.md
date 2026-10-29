# structure.md — Quick Tools（代码导航视角：WHERE & 约定）

> 面向"我要在哪儿加文件 / 改哪个目录"的读者。命令与工具链看 [tech.md](./tech.md)；业务定位看 [product.md](./product.md)；总入口 [AGENTS.md](./AGENTS.md)。

## 1. 顶层目录树

```
quick-tools/
├── apps/
│   ├── extension/                 # @quick-tools/extension（Plasmo Chrome 扩展）
│   └── desktop/                   # @quick-tools/desktop（Tauri 2 桌面）
├── packages/                      # 5 个 workspace 库（tsup 产物，不含宿主 API）
│   ├── platform/                  # @quick-tools/platform
│   ├── json-formatter/            # @quick-tools/json-formatter
│   ├── qr-code-gen/               # @quick-tools/qr-code-gen
│   ├── web-export/                # @quick-tools/web-export（类型/纯工具）
│   └── web-export-dom/            # @quick-tools/web-export-dom（DOM 渲染管线）
├── docs/REFACT_PLAN.md            # 旧方案（已部分否决）
├── .github/workflows/submit.yml   # 手动触发的扩展商店发布
├── .kiro/                         # 本机 AI 规格/hook/steering（已 gitignore，不入库）
├── todo.md                        # 进行中项（人维护）
├── main/                          # feat/new-feature 分支的 git worktree（本地，勿提交）
├── turbo.json / pnpm-workspace.yaml / pnpm-lock.yaml
├── tsconfig.base.json
├── tailwind.preset.js
├── .prettierrc.mjs / .eslintrc.base.js
└── AGENTS.md / product.md / tech.md / structure.md  # ← 本目录
```

## 2. 共享库（`packages/*`）

五个包都用 tsup 配置（`tsup.config.ts` 完全相同）：`entry: src/index.ts`，`format: ["esm", "cjs"]`，`dts: true`，`clean: true`，`sourcemap: true`。

| 包 | 入口 | 主要模块 | 关键约束 |
|---|---|---|---|
| `packages/platform` | `src/index.ts` | `types.ts` `interfaces.ts` `registry.ts` `errors.ts` | **零宿主依赖**；`registerPlatform(provider)` / `getPlatform()` 全局单例；统一返回 `PlatformResult<T> = { ok, value \| error }` |
| `packages/json-formatter` | `src/index.ts` | `parse.ts` `format.ts` `sort.ts` `diff.ts` `types.ts` | `parseJsonOrJsObject` 用纯字符串替换（不用 `eval/Function`）；`diffLines()` 是 LCS 行级 diff，两端共用 |
| `packages/qr-code-gen` | `src/index.ts` | `history.ts` `history-ops.ts` `capacity.ts` `validation.ts` `types.ts` + `template/`（含 `authoring.ts`） | 历史最大 50 条去重、标签合并；容量上限按 UTF-8 字节；模板语法 `{{ }}` 转义在 `template/parser.ts` |
| `packages/web-export` | `src/index.ts` | `types.ts` `filename.ts` `markdown.ts` `history.ts` | 只放**平台无关**的类型与纯函数（文件名、Markdown 组装、导出历史、批量 URL 解析）；渲染依赖不放这里 |
| `packages/web-export-dom` | `src/index.ts` | `extract.ts` `render-document.ts` `paginate.ts` `capture.ts` `pdf.ts` `theme.ts` `export.ts` `constants.ts` | 需要真实 DOM：Readability 提取、marked 渲染、分页、`html-to-image` 截图、PDF 拼装、PNG 合并；`exportArticle()` 是两端统一入口 |

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
├── assets/                     # icon.png + 渲染用字体/wasm（构建内联）
└── src/
    ├── popup.tsx               # 弹窗：Quick Tools 标题 + 「网页导出」「JSON Formatter」入口 + QrCodeGen
    ├── background.ts           # Service Worker：contextMenus 初始化 + 消息路由 + 状态写 chrome.storage.local
    ├── style.css               # Tailwind 入口
    ├── assets.d.ts
    ├── icons/                  # SVG icon 组件（~icons 路径别名）
    ├── platform/               # 平台适配：initChromePlatform()
    │   ├── index.ts
    │   ├── clipboard.ts
    │   ├── content-extractor.ts
    │   ├── downloads.ts
    │   ├── http.ts
    │   ├── storage.ts
    │   └── result.ts           # 非 strict 下的 PlatformResult 收窄辅助
    ├── tabs/                   # 独立 tab 页（html 由 plasmo 生成到 build/）
    │   ├── json-formatter.tsx
    │   └── web-export.tsx
    ├── features/               # 三个领域 UI
    │   ├── json-formatter/
    │   │   ├── index.tsx                       # JsonFormatter（CodeMirror 编辑器）
    │   │   └── components/
    │   │       ├── JsonEditor.tsx
    │   │       └── JsonComparator.tsx          # 双栏 diff（行级）
    │   ├── qr-code-gen/
    │   │   ├── index.tsx                       # 顶层 QrCodeGen（QrCodeProvider + TemplateProvider）
    │   │   ├── context.tsx                     # QrCodeProvider：text / history / tags / 尺寸 / 纠错等级
    │   │   ├── qr-image.ts                     # SVG → PNG、保存/复制二维码图片
    │   │   ├── types.ts
    │   │   ├── utils.ts
    │   │   ├── components/                     # HistoryList / InputSection / ModeSwitch / QrDisplay / QrExportBar
    │   │   └── template/                       # 模板子模块（parser / renderer / storage / import-export / components / __tests__）
    │   └── web-export/
    │       ├── WebExportApp.tsx                # 导出页 UI：单个/批量、预览、历史、超限提示
    │       ├── MarkdownPreview.tsx             # 渲染/源码两种预览
    │       ├── extension-io.ts                 # 提取当前 tab / 抓 URL、chrome.downloads 保存
    │       └── constants.ts                    # MENU_IDS
    └── __tests__/manifest.test.ts              # 校验 package.json manifest
```

### 3.2 关键文件 → 职责

| 文件 | 职责 |
|---|---|
| `apps/extension/src/popup.tsx` | 弹窗入口，组合 `QrCodeGen` |
| `apps/extension/src/background.ts` | 只在 install/startup 重建右键菜单（串行，避免 `removeAll`/`create` 交错导致菜单项丢失）；`contextMenus.onClicked` → 打开 `tabs/web-export.html?tabId=…&format=…&auto=1`，由页面自己提取、导出、下载后自动关闭 |
| `apps/extension/src/platform/index.ts` | 组装并 `registerPlatform(chromePlatform)`，必须在任何 platform 调用之前执行（`background.ts` 顶部即调用） |
| `apps/extension/src/features/web-export/extension-io.ts` | `extractFromTab()` 用 `chrome.scripting.executeScript` 取渲染后 DOM → 共享包 `extractFromHtml()`；`extractFromUrl()` 直接 fetch；`saveFiles()` 走 `chrome.downloads` |
| `apps/extension/src/features/web-export/WebExportApp.tsx` | 导出页主逻辑：`exportArticle()`（共享包）产出文件 → 保存 → 历史入库；超限时提示分页/改 PDF |
| `apps/extension/src/features/web-export/constants.ts` | `MENU_IDS = { parent, markdown, pdf, png } as const`（`parent = "web-export:root"`） |
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
│   │   ├── HistoryPanel.tsx     # 通用历史侧栏（导出历史；按条目删除）
│   │   ├── QrHistoryPanel.tsx   # QR 历史侧栏（标签、搜索、复制、导入导出）
│   │   ├── BatchUrlPanel.tsx    # 批量 URL 输入 + 进度
│   │   ├── CodeMirrorEditor.tsx / DiffViewer.tsx / ResizableSplitPane.tsx
│   │   └── MarkdownPreview.tsx / QrRenderer.tsx / Toast.tsx
│   ├── hooks/                   # useDebounce, useQrHistory, useExportHistory, useJsonFilePicker, useTemplateStore, useCommandPalette, useTheme, useToast(Stack), useWindowState, useReducedMotion, usePageTransition
│   ├── lib/                     # 纯函数/薄封装：fuzzy-search, json-linter, json-diff, path-truncate, pdf-png-renderer, web-export-io, qr-capacity, turndown-config
│   ├── platform/                # 桌面端平台适配
│   │   ├── index.ts             # initTauriPlatform()：Tauri 环境下注册 tauriPlatform，否则降级 browserPlatform
│   │   ├── file-system.ts       # @tauri-apps/plugin-fs / plugin-dialog
│   │   ├── clipboard.ts / http.ts / storage.ts
│   │   ├── content-extractor.ts # Readability + Turndown
│   │   ├── file-opener.ts / browser.ts
│   ├── types/                   # page-shell.ts
│   ├── tokens/                  # colors/motion/radii/shadows/spacing/typography.css
│   ├── test-utils/              # mock-platform、jsdom polyfill、render 辅助
│   └── __tests__/e2e/           # 页面级 e2e（mock platform）
└── src-tauri/                   # Rust 端
    ├── Cargo.toml               # tauri 2（features: image-png）+ 6 个插件
    ├── build.rs                 # tauri_build::build()
    ├── tauri.conf.json          # devUrl 1420 / beforeDevCommand / bundle icons
    ├── capabilities/default.json# dialog/fs/store/http/clipboard 权限与 scope
    ├── icons/                   # tauri icon 生成（勿手改）
    └── src/main.rs + src/lib.rs # lib 里注册插件，main 只调 run()
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
| `apps/desktop/src/lib/pdf-png-renderer.ts` | satori 版 PDF/PNG 渲染（仅被 e2e 测试与历史代码使用；页面已改用 `@quick-tools/web-export-dom`） |
| `apps/desktop/src/lib/web-export-io.ts` | Tauri 下的图片抓取（plugin-http）、单文件保存对话框、多文件写目录 |

### 4.3 Tauri 配置

- `tauri.conf.json`：窗口 1024×768（min 900×640）、`devUrl=http://localhost:1420`、`beforeDevCommand=pnpm dev`、`bundle.targets: "all"` + `bundle.icon`
- 插件（`src/lib.rs` 注册）：opener / dialog / fs / http / store / clipboard-manager
- **http scope 必须带端口通配**：`http://*:*/**`、`https://*:*/**`；`http://*/*` 匹配不到带端口的 URL，会报 `url not allowed on the configured scope`
- **剪贴板写图片依赖 `tauri` 的 `image-png` 特性**（`Image.fromBytes` 需要它解码 PNG），Cargo.toml 已开启

## 5. 跨形态复用关系

```
                     ┌────────────────────────┐
                     │  @quick-tools/platform │  ← 接口 + 错误模型 + registerPlatform
                     └────────────┬───────────┘
                                  │ 全部 5 个包依赖
        ┌──────────┬──────────────┼──────────────┬──────────────┐
        │          │              │              │              │
  json-formatter  qr-code-gen   web-export   web-export-dom      │
        │          │              │              │               │
        └──────────┴──────┬───────┴──────────────┘               │
                          │                                        │
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
- 扩展端在非 strict 编译下 `result.ok` 不窄化，取错误统一用 `~platform/result` 的 `getResultError()` / `getVisibleError()`

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
- 跑测：`pnpm test` = `pnpm -r test`，每个 app/package 用自己的 `vitest.config`，各自解析 workspace 包（走 `dist/`，改包后先 build）
- 桌面端另有 `apps/desktop/src/__tests__/e2e/`：基于 `test-utils/mock-platform` 的页面级用例，可选 jsdom 环境

## 8. "我想做 X，应该改哪里" 速查

| 需求 | 改哪里 |
|---|---|
| 加新的 JSON 操作（如 sort / 去重 / JSONPath） | `packages/json-formatter/src/`，在 `index.ts` barrel 导出 → `apps/extension/src/features/json-formatter/index.tsx` 与 `apps/desktop/src/pages/JsonFormatterPage.tsx` 加按钮 |
| QR 新能力（颜色、Logo、SVG 导出） | `apps/extension/src/features/qr-code-gen/` 与 `apps/desktop/src/pages/QrCodeGenPage.tsx`（`qrcode.react` 已支持大部分） |
| QR 模板语法扩展 | `packages/qr-code-gen/src/template/parser.ts`（**parser 与 pretty-printer 必须同步修改**，并补 `__tests__/parser-roundtrip.property.test.ts`） |
| 导出新格式（如 HTML、DOCX） | 纯逻辑放 `packages/web-export/`；需要 DOM 的放 `packages/web-export-dom/` 并在 `exportArticle()` 里加分支 → 两端页面自动复用 |
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
