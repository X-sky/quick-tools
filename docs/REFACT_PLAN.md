## Final Plan: Monorepo 改造

### Confirmed Decisions

| Decision | Choice |
|---|---|
| Monorepo tool | pnpm workspaces |
| Core package | `@quick-tools/core` |
| Extension package | `@quick-tools/extension` |
| Tailwind prefix | core = 标准类名，extension = `plasmo-` |
| CSS 解耦 | Parcel Transformer 插件，构建时自动给 core 的 className 加前缀 |
| Core 导出格式 | TypeScript 源码（不编译） |

### Target Structure

```
quick-tools/
├── pnpm-workspace.yaml
├── package.json                          ← workspace root
├── tsconfig.base.json                    ← shared TS config
├── .prettierrc.mjs
│
├── packages/
│   ├── core/                             ← @quick-tools/core
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.js            ← no prefix
│   │   ├── postcss.config.js
│   │   └── src/
│   │       ├── index.ts                  ← barrel export
│   │       ├── style.css                 ← no #plasmo-shadow-container
│   │       ├── assets.d.ts
│   │       ├── assets/
│   │       ├── icons/
│   │       ├── platform/                 ← platform abstraction
│   │       │   ├── types.ts
│   │       │   ├── download.ts           ← DownloadProvider interface
│   │       │   └── runtime.ts            ← RuntimeProvider interface
│   │       └── features/
│   │           ├── json-formatter/       ← pure (all files)
│   │           ├── qr-code-gen/          ← pure (all files)
│   │           └── web-export/
│   │               ├── constants.ts
│   │               ├── types.ts
│   │               ├── utils.ts
│   │               ├── extract-page.ts
│   │               ├── content/extract.ts
│   │               ├── markdown-render.ts
│   │               ├── pdf-export.ts
│   │               ├── pagination.ts
│   │               ├── render-assets.ts
│   │               ├── render-constants.ts
│   │               ├── image-export.ts    ← downloadObjectUrl extracted to platform
│   │               └── export-renderer-tab.tsx ← pure UI shell
│   │
│   ├── extension/                        ← @quick-tools/extension
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.js            ← prefix: "plasmo-"
│   │   ├── postcss.config.js
│   │   ├── .parcelrc                     ← register class-prefix transformer
│   │   └── src/
│   │       ├── popup.tsx
│   │       ├── background.ts
│   │       ├── style.css                 ← with #plasmo-shadow-container
│   │       ├── tabs/
│   │       │   ├── json-formatter.html
│   │       │   ├── json-formatter.tsx
│   │       │   ├── export-renderer.html
│   │       │   └── export-renderer.tsx
│   │       ├── features/
│   │       │   ├── web-export/
│   │       │   │   ├── popup-status.tsx
│   │       │   │   ├── use-export-renderer.ts
│   │       │   │   └── extension-runtime.ts
│   │       │   └── qr-code-gen/
│   │       │       └── InputSection.tsx   ← wraps core, injects chrome.tabs callback
│   │       └── adapters/
│   │           ├── download.ts            ← implements DownloadProvider → chrome.downloads
│   │           └── runtime.ts             ← implements RuntimeProvider → chrome.runtime
│   │
│   └── parcel-transformer-prefix/        ← @quick-tools/parcel-transformer-prefix
│       ├── package.json
│       └── index.ts                      ← transforms className="flex" → "plasmo-flex"
```

### Platform Abstraction (`@quick-tools/core/platform/`)

```typescript
// download.ts
export interface DownloadProvider {
  downloadObjectUrl(url: string, filename: string): Promise<void>
  downloadDataUrl(url: string, filename: string): Promise<void>
}

// runtime.ts
export interface RuntimeProvider {
  sendMessage(message: unknown): Promise<unknown>
  getTaskUrl(taskId: string): string
  isValidContext(): boolean
}
```

- `image-export.ts` 通过 `DownloadProvider` 下载，不再直接调用 `chrome.downloads`
- `use-export-renderer.ts` 保留在 extension，通过 `RuntimeProvider` 与 background 通信
- extension 的 `adapters/` 实现这两个接口

### Parcel Transformer 插件

`@quick-tools/parcel-transformer-prefix`：
- 注册在 extension 的 `.parcelrc` 中，在 TSX 编译之后、PostCSS/Tailwind 之前执行
- 扫描来自 `@quick-tools/core` 的 .tsx 文件
- 正则匹配 `className` 属性中的 class 名，加 `plasmo-` 前缀
- 非 core 的文件直接透传

```javascript
// 核心转换逻辑
function prefixClassNames(code, prefix) {
  return code.replace(
    /className\s*=\s*["']([^"']+)["']/g,
    (match, classNames) => {
      const prefixed = classNames.split(/\s+/)
        .map(cls => cls ? `${prefix}${cls}` : '')
        .join(' ')
      return `className="${prefixed}"`
    }
  )
}
```

### 文件归属清单

**`@quick-tools/core`**（无 chrome.* 依赖）：
- `src/icons/` — 全部
- `src/features/json-formatter/` — 全部
- `src/features/qr-code-gen/` — 除 InputSection.tsx 的 `handleGetCurrentUrl`（改为 props 注入）
- `src/features/web-export/` — constants, types, utils, extract-page, content/extract, markdown-render, pdf-export, pagination, render-assets, render-constants, image-export（除 downloadObjectUrl）, export-renderer-tab
- `src/platform/` — 新建

**`@quick-tools/extension`**（Chrome API 依赖）：
- `background.ts`, `popup.tsx`, `tabs/*`
- `features/web-export/popup-status.tsx`, `use-export-renderer.ts`, `extension-runtime.ts`
- `features/qr-code-gen/InputSection.tsx`（chrome.tabs 包装）
- `adapters/` — 新建，实现 platform 接口

### 迁移步骤

1. 创建 monorepo 骨架（pnpm-workspace.yaml, root package.json, tsconfig.base.json）
2. 创建 `packages/core/` — package.json, tsconfig.json, tailwind.config.js（无 prefix）
3. 创建 `packages/extension/` — package.json, tsconfig.json, tailwind.config.js（prefix: plasmo-）
4. 迁移 core 代码 — 移动纯逻辑文件，创建 platform 抽象层
5. 拆分混合文件 — image-export.ts（downloadObjectUrl → platform），InputSection.tsx（handleGetCurrentUrl → props）
6. 迁移 extension 代码 — 移动 Plasmo 入口和 Chrome 依赖文件
7. 创建 Parcel transformer 插件 — 自动给 core 的 className 加前缀
8. 更新 import 路径 — 所有 `~features/*` → `@quick-tools/core` 或相对路径
9. Tailwind prefix 批量清理 — core 包中 ~135 处 `plasmo-` 前缀移除
10. 注册 Parcel 插件 — extension 的 .parcelrc 中配置
11. pnpm install + 验证构建

### 影响范围

| 操作 | 文件数 |
|---|---|
| Tailwind prefix 移除（core） | ~11 个 .tsx, ~135 处 |
| chrome.* 依赖改造 | 7 个文件 |
| 新增文件 | ~15 个（configs, platform, adapters, transformer） |
| 文件迁移 | ~30 个源文件 |
| import 路径更新 | ~20 处 |