# tech.md — Quick Tools（工程视角：HOW to run & build）

> 面向"我要装、要跑、要排查构建错误"的读者。代码放在哪里、新文件加在哪，请看 [structure.md](./structure.md)。
> 项目根目录入口与命令速查见 [AGENTS.md](./AGENTS.md)。

## 1. 运行时与工具链

| 维度 | 版本 / 工具 | 出处 |
|---|---|---|
| Node | **24.14.0**（`volta.node` 字段固定） | 仓库根 `package.json` `volta` 段 |
| 包管理器 | **pnpm**（workspace） | `pnpm-workspace.yaml`、`pnpm-lock.yaml` |
| Monorepo 编排 | **turbo 2** | `turbo.json` |
| TypeScript | **5.3.3**（strict 全开 + `noUncheckedIndexedAccess`） | 根 `tsconfig.base.json` |
| 测试 | **vitest** + **fast-check**（属性测试） | 根 `vitest.config.mts` + 各包 `vitest.config.*` |
| Lint | **ESLint 8** + `@typescript-eslint` | `.eslintrc.base.js` |
| Format | **Prettier 3.2.4** + `@ianvs/prettier-plugin-sort-imports` | `.prettierrc.mjs` |
| 扩展构建 | **Plasmo 0.90.5** | `apps/extension/package.json` |
| 桌面构建 | **Tauri 2** + **Vite 5** + `@vitejs/plugin-react` | `apps/desktop/src-tauri/Cargo.toml` + `vite.config.ts` |

> **冲突点（待修）**：`.github/workflows/build.yml` 仍把 Node pin 在 `16.x`，与根 `package.json` 的 `volta.node=24.14.0` 不一致。改 PR 之前应先决定升 Node 还是降 Node。

## 2. 仓库结构（工程视角）

```
quick-tools/
├── package.json                    # 根 workspace（scripts: build/typecheck/lint/test/dev + 各 app 过滤脚本）
├── pnpm-workspace.yaml             # packages/* + apps/*
├── turbo.json                      # 任务依赖（build 串行 ^build，dev 持久）
├── tsconfig.base.json              # 共享严格 TS 配置
├── tailwind.preset.js              # 共享 Design Tokens
├── .prettierrc.mjs                 # 共享格式化 + import 排序
├── .eslintrc.base.js               # 共享 lint 规则
├── vitest.config.mts               # 根测试入口：把 @quick-tools/* 直接 alias 到 src（无需先构建）
│
├── packages/                       # 4 个纯逻辑库（tsup → esm+cjs+dts）
│   ├── platform/                   # @quick-tools/platform — 平台抽象（无宿主依赖）
│   ├── json-formatter/             # @quick-tools/json-formatter — parse/format/minify
│   ├── qr-code-gen/                # @quick-tools/qr-code-gen — history + template 子模块
│   └── web-export/                 # @quick-tools/web-export — 类型 + filename + markdown
│
├── apps/
│   ├── extension/                  # @quick-tools/extension — Plasmo Chrome 扩展（Manifest V3）
│   └── desktop/                    # @quick-tools/desktop — Tauri 2 + Vite + React 桌面
│
├── tests/
│   └── workspace-integrity.test.ts # vitest：验证 @quick-tools/* 在裸 Node 下也能被 import
│
├── docs/REFACT_PLAN.md             # 单包 core 改造方案（**已部分否决**，见 AGENTS.md）
├── assets/                         # 字体/图标（satori 字体加载源）
├── .github/workflows/build.yml     # Plasmo BPP 发布工作流（manual trigger）
├── .kiro/                          # 规格与 steering（项目内 AI 助手的私有配置，非本仓库对外契约）
├── todo.md                         # 进行中项
└── .playwright-cli/                # 历史 playwright 抓屏产物（已被 .gitignore 忽略）
```

## 3. 关键依赖（一句话用途）

`apps/extension` 关键三方：
- `plasmo` — 扩展构建/打包
- `@codemirror/*` + `@uiw/react-codemirror` — JSON / Markdown 编辑器
- `@mozilla/readability` + `turndown` — 网页正文 → Markdown
- `satori` + `satori-html` + `@resvg/resvg-wasm` — HTML → SVG → PNG（无 headless 浏览器）
- `html-to-image` — 备选 DOM 截图
- `jspdf` + `pdf-lib` — PDF 拼装
- `qrcode.react` — 二维码渲染

`apps/desktop` 关键三方：
- `@tauri-apps/api` v2 + `plugin-{fs, dialog, store, clipboard-manager, http}` — 桌面能力
- `@phosphor-icons/react` — 图标
- `motion` — 动画
- `codemirror` + 全部 `@codemirror/*` 系列 — 编辑器
- `@tauri-apps/cli` — `tauri dev` / `tauri build`

`packages/*` 关键依赖：
- `tsup` — 打包（ESM + CJS + d.ts）
- `vitest` + `fast-check` — 单测 + 属性测

## 4. 路径与别名

| 别名 | 指向 | 在哪生效 |
|---|---|---|
| `~*` | `src/*` | `apps/extension/tsconfig.json` + `apps/desktop/tsconfig.json` + `apps/desktop/vite.config.ts` |
| `@quick-tools/*` | workspace 包 | `tsconfig.paths`（apps）+ **vitest alias 指向包源码**（根 `vitest.config.mts`） |

> 根 `vitest.config.mts` 把 `@quick-tools/platform` 等直接 alias 到 `packages/*/src/index.ts`，**所以测试时不需要先 `pnpm build` 包**。但 `turbo.json` 的 `test` 配置了 `dependsOn: ["^build"]`，从根跑 `pnpm test` 时 turbo 会先 build 依赖。

## 5. 常用命令（可直接复制）

> 在仓库根目录执行。

### 5.1 安装

```bash
pnpm install
```

> 仓库根没有 `.npmrc` 公开配置；`pnpm-lock.yaml` 已存在，建议**不要**删除。

### 5.2 开发

```bash
pnpm dev                # turbo 并行：各包 watch + 两个 app dev
pnpm dev:extension      # 只跑扩展（plasmo dev，输出 build/chrome-mv3-dev）
pnpm dev:desktop        # 只跑桌面 Web 端（vite，端口 1420 严格占用）
pnpm dev:tauri          # 桌面走 tauri dev（需 Rust 工具链；端口 1420 必须空闲）
```

### 5.3 构建

```bash
pnpm build              # turbo 全量；依赖顺序：packages → apps
pnpm build:extension    # pnpm --filter @quick-tools/extension build
pnpm build:desktop      # pnpm --filter @quick-tools/desktop build（仅 Web 资源；Tauri 需额外 cargo）
```

扩展打包产物：

```bash
pnpm --filter @quick-tools/extension package
# 产物：apps/extension/build/chrome-mv3-prod.zip
```

### 5.4 测试 / 类型 / Lint

```bash
pnpm test               # vitest 跑全量（含 fast-check 属性测试）
pnpm test --filter @quick-tools/json-formatter   # 单包测试
pnpm typecheck          # tsc --noEmit 全量
pnpm lint               # eslint 全量
```

> 桌面端额外提供 `pnpm --filter @quick-tools/desktop test:watch`（watch 模式），其他包未配置。

### 5.5 格式化

```bash
npx prettier --write .  # 项目无 `format` 脚本，直接调 prettier
```

> Prettier 用 `tailwind.preset.js` 的 design tokens，**`@ianvs/prettier-plugin-sort-imports` 会强制按内置顺序重排 import**。

## 6. 环境变量 / 密钥

- **真实密钥**：仓库内**无**明文密钥。`.gitignore` 屏蔽了 `.env*` 与 `keys.json`。
- Chrome Web Store 发布密钥：在 GitHub Action 中以 Secret `SUBMIT_KEYS` 注入，**调用方不接触**。
- 桌面端 Vite 变量前缀：`VITE_` 或 `TAURI_`（`vite.config.ts` `envPrefix`）。
- Plasmo 构建期：`NODE_TLS_REJECT_UNAUTHORIZED=0` 在 `apps/extension/package.json` 中由 `cross-env` 注入，**目的待确认**（怀疑是绕过本地代理/自签证书；提交前应复核）。

## 7. CI / 发布

- `.github/workflows/build.yml`：仅 `workflow_dispatch` 触发 → checkout → pnpm 缓存 → `pnpm build` → `pnpm package` → Plasmo BPP 上传 `build/chrome-mv3-prod.zip` 到 Chrome Web Store。
- 触发后无法自动跑测试（**待补**：建议加入 `pnpm typecheck && pnpm test` 步骤）。
- 桌面端**暂无打包/签名 CI**（**待确认**是否需要 `tauri-action`）。

## 8. 常见故障与排错

| 现象 | 排查方向 |
|---|---|
| `pnpm dev` 起不来 / 端口占用 | 扩展的 Plasmo watcher；桌面的 Vite 占用 1420（`strictPort: true`），如需换端口改 `apps/desktop/vite.config.ts` |
| 改完 `tailwind.preset.js` 不生效 | Plasmo/Vite 的 Tailwind 处理是各自的 PostCSS；扩展看 `apps/extension/postcss.config.js`（无 autoprefixer 之外的配置），桌面看 `apps/desktop/postcss.config.cjs` |
| vitest 找不到 `@quick-tools/*` | 根 `vitest.config.mts` alias 指向 `packages/*/src/index.ts`；在子包下跑用对应 `vitest.config.ts`（同样 alias 到自己的 `~`） |
| 桌面页 Tauri API 调用 `undefined` | 没在 Tauri runtime 内（`window.__TAURI_INTERNALS__`），`initTauriPlatform` 会自动降级为 `browserPlatform`——多数桌面专属能力（如 `plugin-fs`）会失败 |
| 扩展 Popup 样式丢 | Tailwind 类必须带 `plasmo-` 前缀（`apps/extension/tailwind.config.js` 的 `prefix`） |
| 改完 `json-formatter` 包，扩展没拿到 | `turbo.json` 中 `build` 的 `outputs` 含 `dist/**`；`apps/extension` 通过 workspace 协议 `workspace:*` 引用——`pnpm build` 需重跑 |

## 9. 未配置项（明确缺失）

- **无 Husky / lint-staged / commitlint**：pre-commit 钩子未配置。
- **无 Renovate / Dependabot**：依赖升级靠人工。
- **桌面端无 `tauri build` 的 CI**（**待确认**）。
- **`apps/extension` 没有 `vitest` 全覆盖配置**（已有 `apps/extension/src/__tests__/manifest.test.ts`，通过根 vitest 跑）。
- **没有 Storybook / 组件文档工具**。
