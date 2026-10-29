# product.md — Quick Tools（产品/业务视角）

> 文档面向"产品/业务"读者：这个东西是什么、给谁用、能做什么、有什么边界。
> 工程命令/代码导航请分别看 [AGENTS.md](./AGENTS.md) → [tech.md](./tech.md) / [structure.md](./structure.md)。

## 1. 项目是什么

**Quick Tools** 是开发者/技术从业者日常高频小工具的集合，**同一份核心逻辑**以两种形态交付：

| 形态 | 入口 | 触达方式 |
|---|---|---|
| **Chrome 浏览器扩展** | `apps/extension`（Plasmo + Manifest V3） | 安装到 Chrome，从工具栏图标点开；或右键网页菜单触发导出 |
| **桌面应用** | `apps/desktop`（Tauri 2 + Vite + React） | 安装到 macOS / Windows / Linux，独立窗口运行 |

两种形态共享 4 个纯逻辑 npm 包（同 pnpm workspace）。**逻辑写一次，UI 形态写两次**。这一架构由 `docs/REFACT_PLAN.md` 提出（原始方案为单一 `@quick-tools/core` 包），实际落地时拆分为 4 个领域包——详见 [structure.md](./structure.md)。

## 2. 给谁用

目标用户是 **开发者 / 写作者 / 信息工作者**，典型使用场景：

- 排查 API 响应：JSON 格式化 + 差异对比
- 把网络文章存成 Markdown / PDF：长文离线阅读、归档
- 批量生成带模板的二维码：资产管理、签到、票据

## 3. 核心能力清单

> 标注规则：**已交付** = 代码已实现且在 `apps/*` 中挂载；**规划中** = 在本机 `.kiro/specs/*`（不入库）或 `todo.md` 中出现但**未在代码中实现**，不应假定存在。

### 3.1 JSON 格式化（**已交付**）

- 在弹窗/独立 tab/桌面页中基于 **CodeMirror 6** 编辑 JSON
- 支持**宽松解析**：先尝试 `JSON.parse`，失败后用纯字符串替换将 JS 对象字面量（单引号、无引号键、尾逗号、`//` 与 `/* */` 注释）转换为 JSON —— **不使用 `eval/Function`**，因此兼容严格 CSP
- 提供：格式化（缩进 2）、压缩、复制、清空
- 桌面端额外提供：**双栏 Diff**（GitHub 风格行级比较，仍**未升级**为结构化块级——见 §6）

### 3.2 QR 码生成（**已交付**）

- 自由输入模式 + **历史记录**（最多 50 条，按内容去重合并，标签筛选，导入/导出 JSON）
- **模板模式**：模板字符串语法 `Hello {name}!`（占位符用单花括号；字面 `{` `}` 用 `{{` `}}` 转义）；占位符值、组合标签、模板存储的导入导出
- 容错等级 L/M/Q/H，输出尺寸 128/256/512

### 3.3 网页正文导出（**已交付**）

- 入口：扩展**右键菜单**"导出网页正文" → Markdown / PDF / PNG 三种格式；或桌面端页面操作
- 内容提取：`@mozilla/readability` + `turndown` 取得 `MarkdownExportSource`
- 渲染管线：
  - **Markdown**：直接构 data URL 触发下载
  - **PDF**：`satori`（HTML→SVG）→ `@resvg/resvg-wasm`（SVG→PNG）→ `jspdf` / `pdf-lib` 拼装
  - **PNG**：单图优先；超过尺寸阈值时**自动分页**（`pagination.ts`）
- 桌面端：批量 URL 导出（多 URL → 多文件）

### 3.4 跨形态通用能力（**已交付**）

- 统一 `PlatformProvider` 抽象（`@quick-tools/platform`），按宿主自动选择实现：
  - 浏览器扩展：`chrome.downloads` / `chrome.storage.local` / `chrome.scripting` / `navigator.clipboard`
  - 桌面（Tauri 2）：`@tauri-apps/plugin-fs` / `plugin-store` / `plugin-clipboard-manager` / `plugin-dialog` / `plugin-http`
  - 桌面（web fallback）：`URL.createObjectURL` + `<a download>`、Readability + Turndown 直接跑在浏览器
- 错误统一以 `PlatformResult<T> = { ok: true, value } | { ok: false, error: { category, message } }` 返回

## 4. 边界（什么在仓库 / 什么不在）

**在仓库内**：

- 上述 3 类工具的 UI + 核心逻辑
- 跨宿主平台抽象层
- 共享 Tailwind preset / Design Tokens
- Chrome 扩展打包与发布工作流（GitHub Action）

**不在仓库内（外部依赖）**：

- 浏览器扩展商店账号/密钥：通过 GitHub Secret `SUBMIT_KEYS` 注入，**仓库内无明文**
- 桌面应用代码签名证书：未配置（待确认）
- 自动更新通道：未配置（待确认）
- 国际化文案管理：当前以中英混排、用户可见消息多为中文，未引入 i18n 框架
- 服务端：纯客户端工具，**无后端服务**

## 5. 部署与使用场景

| 形态 | 谁来部署 | 如何访问 |
|---|---|---|
| Chrome 扩展 | 仓库维护者（通过 `.github/workflows/submit.yml` 手动触发，`bpp` 发布到 Chrome Web Store） | 用户在 Chrome Web Store 安装；开发者在 `chrome://extensions/` 加载 `apps/extension/build/chrome-mv3-dev` |
| 桌面应用 | 仓库维护者（需 Rust 工具链 + Tauri 2 CLI，`pnpm dev:tauri` 本地开发） | 用户下载平台对应安装包（macOS / Windows / Linux）。`tauri.conf.json` `bundle.targets: "all"` —— 实际打包命令与签名流程**待确认** |
| npm 包（4 个 `@quick-tools/*`） | 当前仅作为 workspace 内部依赖使用 | 暂未发布到 npm（`packages/*/package.json` 缺 `publishConfig`，未配置 registry，**待确认**） |

## 6. 已知未完成项（来自 `todo.md` 与 `.kiro/specs`）

下列项目在仓库内能找到**计划文档/任务列表**，但**当前代码中尚未实现**或未完全验证：

- **结构化/块级 Diff 算法**（todo.md 首项）：当前为行级 diff，需求中提到的"GitHub-like 块级最优展示"未实现。
- **QR 模板类型创建模式**（todo.md）：模板的"类型"维度未实现，目前只有"模板字符串 + 占位符值"的形态。
- **`contextMenus` 重复 ID 报错**（todo.md）：`web-export:root` / `web-export:markdown` 等在 `onInstalled` / `onStartup` 两次重建菜单时偶发重复。`background.ts` 已用 `removeAll()` 防御，但**作者自述无法稳定复现**，标记为"待观察"。
- **桌面 UI 重设计**（`.kiro/specs/desktop-ui-redesign/`）：`NavigationRail + CommandBar + PageContainer + StatusStrip + Toast + CommandPalette` 这一壳层已在 `apps/desktop/src/components/shell/` 与 `App.tsx` 中实现；spec 内的具体细化项**待逐条核对实现状态**。

## 7. 关键产品原则

- **可移植性优先**：核心逻辑与宿主解耦，新增第三种形态（如 CLI / Web）只需实现 `PlatformProvider`。
- **CSP 友好**：JSON 解析走纯字符串替换，禁止 `eval/Function`；扩展 CSP 显式禁用 `'unsafe-eval'`。
- **可测试性**：核心算法（解析、模板解析/渲染、合并、PNG 分页决策）配套 **fast-check 属性测试**——见 `packages/*/src/__tests__/*.property.test.ts`。
- **错误以中文给最终用户**，内部日志英文（参见旧 AGENTS.md 的"error handling"约定，本次重写保留）。
- **设计 token 集中**：所有 dt-* 颜色/字号/圆角/阴影/动效在 `tailwind.preset.js` 一处定义，App 内不再重写。
