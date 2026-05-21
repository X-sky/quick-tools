# AGENTS.md - Quick Tools

## Project Overview

Plasmo browser extension (Chrome) providing utilities: JSON formatter, QR code generator, web page export (Markdown/PDF/PNG). Built with React 18 + TypeScript + Tailwind CSS.

## Build & Dev Commands

```bash
pnpm dev          # Start dev server (Plasmo hot-reload)
pnpm build        # Production build
pnpm package      # Package extension for distribution
```

- Package manager: **pnpm** (lockfile: `pnpm-lock.yaml`)
- No test framework configured — do not add tests unless explicitly requested
- No lint/typecheck scripts in `package.json` — use editor or manual `tsc --noEmit` if needed

## Project Structure

```
src/
  popup.tsx                    # Extension popup entry point
  background.ts               # Service worker (context menus, messaging)
  style.css                   # Global Tailwind entry
  assets.d.ts                 # Type declarations for fonts/wasm/data-urls
  icons/
    index.ts                  # Re-exports from components.tsx
    components.tsx            # SVG icon components (CopyIcon, TrashIcon, etc.)
  features/
    json-formatter/           # JSON formatting/editing feature
      index.tsx               # Main component (JsonFormatter)
      components/             # Sub-components (JsonEditor, JsonComparator)
    qr-code-gen/              # QR code generation feature
      index.tsx               # Main component with QrCodeProvider
      components/             # Sub-components
      context.tsx             # React context for state
      types.ts                # Feature-specific types
      utils.ts                # Helper functions
    web-export/               # Web page export feature
      constants.ts            # Storage keys, menu IDs
      types.ts                # Export format types, message types
      utils.ts                # Filename builders, markdown generation
      extract-page.ts         # Content extraction via Readability
      image-export.ts         # PNG export logic
      pdf-export.ts           # PDF export logic
      pagination.ts           # Page splitting for PDF/PNG
      render-constants.ts     # Rendering dimensions/styles
      render-assets.ts        # Font loading for satori
      markdown-render.ts      # Markdown to HTML rendering
      content/extract.ts      # In-page content script
      popup-status.tsx        # Status display component
      export-renderer-tab.tsx # Renderer tab entry
      extension-runtime.ts    # Extension runtime utilities
  tabs/
    json-formatter.html       # Standalone JSON formatter tab
    export-renderer.tsx       # Export renderer tab entry
```

## Code Style

### Formatting (Prettier)

- **No semicolons** (`semi: false`)
- **Double quotes** (`singleQuote: false`)
- **No trailing commas** (`trailingComma: "none"`)
- Print width: 80, tab width: 2, spaces (no tabs)
- `bracketSameLine: true` for JSX

### Import Order (auto-sorted by `@ianvs/prettier-plugin-sort-imports`)

```typescript
// 1. Node.js built-ins
// 2. Third-party packages
// 3. Blank line
// 4. @plasmo/* packages
// 5. Blank line
// 6. @plasmohq/* packages
// 7. Blank line
// 8. ~* path aliases (project src)
// 9. Blank line
// 10. Relative imports (./)
```

### TypeScript

- Strict mode via Plasmo base tsconfig
- Path alias: `~*` maps to `./src/*` (e.g., `import { CopyIcon } from "~icons"`)
- Define types in dedicated `types.ts` files per feature
- Use `type` for union/message types, `interface` for object shapes
- Use `as const` for constant objects (see `constants.ts`)

### Components

- Function declarations for exported components: `export const ComponentName = () => { ... }`
- Default exports for entry points: `export default function Index() { ... }`
- Icons: SVG components typed with `ComponentProps<"svg">`, spread props, accept `className`

### Styling (Tailwind)

- Prefix: `plasmo-` on all utility classes (e.g., `plasmo-flex`, `plasmo-p-4`)
- Dark mode: `media` strategy
- Use Tailwind classes exclusively — no inline styles except for dynamic values (e.g., editor height)
- Responsive via fixed widths (extension popup constraints: `plasmo-w-[600px]`)

### Error Handling

- Wrap async extension API calls in try/catch
- Check `error instanceof Error` before accessing `.message`
- Use `void` prefix for fire-and-forget promises: `void setupContextMenus()`
- Chain `.catch()` on promise calls where the error result is not awaited
- Provide user-facing error messages in Chinese (this project's convention)

### Naming

- Files: kebab-case (`extract-page.ts`, `json-formatter/`)
- React components: PascalCase (`JsonFormatter`, `QrDisplay`)
- Constants: UPPER_SNAKE_CASE (`EXPORT_STATUS_KEY`, `MENU_IDS`)
- Functions/variables: camelCase (`buildFilenameBase`, `exportCurrentPage`)

### General Patterns

- React context for shared state within features (see `qr-code-gen/context.tsx`)
- Chrome extension APIs: `chrome.storage.local`, `chrome.scripting`, `chrome.contextMenus`
- Message passing via `chrome.runtime.onMessage` with typed union (`BackgroundMessage`)
- `crypto.randomUUID()` for generating task IDs
- Async initialization: `void setupContextMenus().catch(console.error)`
