# AGENTS.md — Quick Tools

> 仓库根目录的 Agent 入口。一屏内回答"我在哪、能跑什么、该去哪查"。
> 详细问题请跳转同级 `product.md` / `tech.md` / `structure.md`。

## 一句话定位

**Quick Tools** 是一个 pnpm monorepo，包含两类产品形态：

- `@quick-tools/extension` — 基于 Plasmo 的 **Chrome 扩展**（Manifest V3）
- `@quick-tools/desktop` — 基于 **Tauri 2 + Vite + React** 的**桌面应用**

两者共享 4 个纯逻辑包（`platform` / `json-formatter` / `qr-code-gen` / `web-export`），对外提供 **JSON 格式化、QR 码生成、网页正文导出（Markdown / PDF / PNG）** 三类工具。详见 [product.md](./product.md)。

## 黄金路径（Golden Path）

所有命令在仓库**根目录**执行，使用 pnpm。

```bash
pnpm install                  # 安装 monorepo 全量依赖
pnpm build                    # turbo 全量构建（packages 先，apps 后）
pnpm dev                      # turbo dev（并行跑各包 watch + 两个 app）
pnpm dev:extension            # 只跑 Chrome 扩展（plasmo dev）
pnpm dev:desktop              # 只跑桌面端 vite dev（端口 1420，对接 tauri）
pnpm dev:tauri                # 桌面端走 tauri dev（需要 Rust 工具链）
pnpm test                     # vitest 全量（root vitest.config.mts 别名指向各包 src）
pnpm typecheck                # tsc --noEmit 全量
pnpm lint                     # eslint 全量
```

扩展打包：

```bash
pnpm --filter @quick-tools/extension package    # 生成 build/chrome-mv3-prod.zip
```

完整命令清单、环境变量、产物位置见 [tech.md](./tech.md)。

## 动手前必读（坑与红线）

| 主题 | 约束 |
|---|---|
| 路径别名 | `~*` → 各 app 自己的 `src/*`；`@quick-tools/*` → workspace 包。**别在 apps 间互相 import**。 |
| Tailwind 前缀 | 扩展端**必须**带 `plasmo-` 前缀（已配置 prefix）；桌面端**不带**前缀。混用会丢样式。 |
| 设计 token | 共享 token 见 `tailwind.preset.js`（`dt-*` 命名空间、Design Tokens 字体/字号/颜色/阴影/动画）。 |
| Chrome API | **只能在 `apps/extension` 内部**用 `chrome.*` / `chrome.storage.*`；`packages/*` 不允许有 `chrome.*` 依赖，统一走 `@quick-tools/platform`。 |
| Tauri API | **只能在 `apps/desktop` 内部**用 `@tauri-apps/*`；`packages/*` 走 `getPlatform()`。 |
| Tailwind 主题 | 修改 token 必须改**根目录** `tailwind.preset.js`，不要在 app 内重写。 |
| 提交物 | 不要提交 `apps/extension/build/`、`packages/*/dist/`、`apps/desktop/src-tauri/target/`、`*.tsbuildinfo`、`.env*`、`keys.json`（已在 `.gitignore`）。 |
| 已有但**已过时**的引用 | 旧 `AGENTS.md` 曾写"无 test / lint / typecheck 脚本" — **已过时**，本次重写。`docs/REFACT_PLAN.md` 描述的 `@quick-tools/core` 单一包方案已被**否决**，实际拆为 4 个领域包。 |

## 我想做什么 → 去哪查

| 任务 | 去哪 |
|---|---|
| 了解产品定位 / 边界 / 已交付能力 | [product.md](./product.md) |
| 跑命令 / 调工具链 / 排查构建错误 | [tech.md](./tech.md) |
| 改某个功能 / 加新文件 / 找约定 | [structure.md](./structure.md) |
| 加新功能模块 | 在 `packages/<domain>/` 内放纯逻辑 → `apps/extension/src/features/<domain>/` 与 `apps/desktop/src/pages/<Domain>Page.tsx` 写壳 |
| 接入新的宿主能力（浏览器/Tauri） | 在 `@quick-tools/platform` 的 `interfaces.ts` 加接口，再到两个 app 的 `platform/` 下实现并 `registerPlatform` |
| 修改设计 token / 主题 | 改仓库根目录 `tailwind.preset.js` |
| QR 模板语法 | `packages/qr-code-gen/src/template/parser.ts`（`{{ }}` 转义规则见 `print()`） |

## 改完必须跑

```bash
pnpm typecheck    # 必须 0 error
pnpm test         # 38+ vitest 用例（含 fast-check 属性测试）
pnpm lint         # 0 error
pnpm build        # 至少验证 @quick-tools/extension 与 @quick-tools/desktop 能产出
```

UI 改动建议在浏览器/桌面里手验：
- 扩展：chrome://extensions 加载 `apps/extension/build/chrome-mv3-dev`
- 桌面：`pnpm dev:tauri`（需要 Rust 工具链）

## 红线

- 不要直推 `main`（若启用） / 不要改 git config / 不要提交密钥。
- 不要绕过 `@quick-tools/platform` 在 `packages/*` 里直接调宿主 API。
- 不要修改或提交 `keys.json` / `.env*` / `**/secrets*`。
- 不要手动创建/删除 `node_modules` 之外的构建产物（让 `pnpm build` / `turbo` 负责）。
- 不要把 `apps/extension` 内部的 `~features/*` 引用到 `apps/desktop`（workspace 边界）。

## 文档导航

- [product.md](./product.md) — 产品视角（WHAT & WHY）
- [tech.md](./tech.md) — 工程视角（HOW to run & build）
- [structure.md](./structure.md) — 代码导航（WHERE & 约定）
