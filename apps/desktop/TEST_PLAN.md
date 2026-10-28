# Quick Tools Desktop — E2E Test Plan

> Status: **in progress** (2026-06-18)
> Author: Codex
> Scope: `apps/desktop/` — Tauri 2 + Vite + React 18 desktop application.

## 1. Desktop capabilities — what this app must do

### 1.1 Product surface (from `product.md`)

| Capability | Page | Core flow |
|---|---|---|
| **JSON Formatter** | `JsonFormatterPage` | Input → parse (JSON or JS-object literal) → format / minify / diff / save / clipboard |
| **QR Code Generator** | `QrCodeGenPage` | Free-input or template mode → render → export PNG / SVG / clipboard |
| **Web Export** | `WebExportPage` | Single URL or batch URLs → extract Markdown → export MD / PDF / PNG / clipboard PNG |
| **Shell** | `App.tsx` + `components/shell/*` | Navigation, command bar, command palette, status strip, toast stack, theme |
| **Platform abstraction** | `@quick-tools/platform` + `platform/*` | Tauri (native) ↔ browser (fallback) downloader / clipboard / storage / http / contentExtractor |

### 1.2 Engineering requirements (from `AGENTS.md` / `tech.md` / `.kiro/specs/desktop-ui-redesign/`)

- Path alias `~/*` → `src/*`; cross-app imports forbidden
- Tailwind preset is shared; no `plasmo-` prefix on desktop
- `chrome.*` / `@tauri-apps/*` only inside the corresponding `apps/*`
- All design tokens live in root `tailwind.preset.js`
- pnpm monorepo: `pnpm install` / `pnpm build` / `pnpm test` / `pnpm typecheck` / `pnpm lint` must stay green
- Tauri config: min window 900×640, Tauri v2 + `tauri-plugin-{opener,dialog,fs,http,store,clipboard-manager}`

### 1.3 Anti-pattern constraints (`.kiro/specs/desktop-ui-redesign/requirements.md` §12)

- ❌ No gradient backgrounds on interactive buttons
- ❌ No pure black (`#000000`) / pure white (`#ffffff`) — must use warm-neutral tokens
- ❌ No emoji as functional icon (use Phosphor)
- ❌ No hand-drawn SVG / no icon-mix (Phosphor `light` weight only)
- ❌ No version/beta label in UI

## 2. Test strategy

### 2.1 Layered approach

| Layer | Tool | What it covers | Where |
|---|---|---|---|
| **L0 — Static** | `tsc --noEmit`, `eslint` | Types + lint for the whole monorepo | root `pnpm typecheck`, `pnpm lint` |
| **L1 — Unit / property** | `vitest` (node env) | All `lib/*` pure logic, platform types, hooks that don't need a DOM | `apps/desktop/src/lib/__tests__/*`, `apps/desktop/src/hooks/__tests__/*` (existing) |
| **L2 — Integration** | `vitest` (node env, mock platform) | Page-level business logic driven through public APIs (no React render) | new: `apps/desktop/src/__tests__/e2e/*-logic.e2e.test.ts` |
| **L3 — Component smoke** | `vitest` + `jsdom` + `@testing-library/react` | Render a single component, assert DOM | targeted — only components without `motion/react` (see §2.3) |
| **L4 — Manual smoke** | Human | Full Tauri shell launch, drag-drop, OS file dialogs | `pnpm dev:tauri` + interactive checklist (this file §4) |

### 2.2 What we do **not** attempt in CI

- **Full React render with `motion/react` AnimatePresence in JSDOM.** `motion@12` triggers a module-load-time `matchMedia` probe and `Element.prototype.scrollIntoView` is missing in JSDOM 29. Combined, this means a 100% headless render of `CommandPalette` / `ContextDrawer` / `NotificationToast` is not feasible in our CI budget. These are validated by L4 (manual smoke).
- **Tauri runtime.** Anything gated on `window.__TAURI_INTERNALS__` is covered by L1/L2 (mocked platform) + L4 (real Tauri). Tauri-driver / WebDriver would be the next step but is out of scope here.

### 2.3 JSDOM compat matrix

| Component | Renders in JSDOM? | Reason |
|---|---|---|
| `NavigationRail` | yes | no motion/react, no scrollIntoView |
| `CommandBar` (static) | no | `motion/react` import side-effect at module load |
| `StatusStrip` (static) | yes | pure DOM |
| `ToastStack` (empty) | yes | motion only used when toasts exist |
| `CommandPalette` | no | `scrollIntoView` on option list, `motion/react` |
| `ContextDrawer` | no | `motion/react` + AnimatePresence |
| `NotificationToast` | no | `motion/react` + AnimatePresence |

Conclusion: **L3 is scoped to non-motion components only.** Motion components are validated via L4.

## 3. E2E coverage matrix (current state)

| Capability | L1 unit | L2 logic | L3 render | L4 manual |
|---|---|---|---|---|
| JSON parse (JS-object) | ✅ `json-formatter` | ✅ | n/a | ✅ |
| JSON format / minify | ✅ | ✅ | n/a | ✅ |
| JSON diff | ✅ `json-diff.property` | ✅ | n/a | ✅ |
| JSON clipboard copy / paste | n/a | ✅ | n/a | ✅ |
| JSON file open / save dialog | n/a | ✅ via platform mock | n/a | ✅ (Tauri) |
| JSON drag-drop | n/a | n/a (real File only) | n/a | ✅ |
| QR free-input render | n/a | n/a | n/a | ✅ |
| QR capacity check | ✅ `qr-capacity.property` | ✅ | n/a | ✅ |
| QR export PNG / SVG | n/a | ✅ via platform mock | n/a | ✅ |
| QR clipboard image | n/a | ✅ via platform mock | n/a | ✅ |
| QR history (50-item cap, dedup) | n/a | ✅ | n/a | ✅ |
| QR template (parser/renderer/storage) | ✅ | ✅ | n/a | ✅ |
| Web export filename / markdown doc | ✅ | ✅ | n/a | ✅ |
| Web export PNG render | ✅ | ✅ | n/a | ✅ |
| Web export PDF render (multi-page) | ✅ | ✅ | n/a | ✅ |
| Web export batch | n/a | ✅ via platform mock | n/a | ✅ |
| Platform: Tauri vs browser switch | n/a | ✅ | n/a | ✅ (Tauri) |
| Storage persistence | n/a | ✅ | n/a | ✅ |
| Theme switching | n/a | ✅ | n/a | ✅ |
| Window state | n/a | ✅ (logic only) | n/a | ✅ (Tauri) |
| Shell — Navigation | n/a | ✅ `shell.e2e.test.tsx` (NavigationRail only) | partial | ✅ |
| Shell — StatusStrip DOM | n/a | ✅ | ✅ | ✅ |
| Shell — CommandPalette | n/a | ❌ deferred to L4 | n/a | ✅ |
| Shell — Toast | n/a | ❌ deferred to L4 | n/a | ✅ |
| Tauri config (window min 900×640) | n/a | n/a | n/a | ✅ |

Legend: ✅ = covered, ❌ = deferred to L4 manual, n/a = not applicable to layer.

## 4. Manual smoke checklist (run with `pnpm dev:tauri`)

```
[ ] Window opens at 1024×768, can be resized down to 900×640 (no smaller)
[ ] Settings (gear) — open
[ ] Navigation:
    [ ] Click each rail item, page transitions in < 250ms
    [ ] Arrow keys cycle nav items, Enter activates
    [ ] Tooltip on 400ms hover (only on 900–1024px width: 400ms hover-only)
[ ] JSON Formatter:
    [ ] Paste JS-object literal with comments / trailing commas → formats to JSON
    [ ] Format / Minify / Diff toggles
    [ ] Drag-drop a .json file → loads into editor
    [ ] Save file (Tauri save dialog) → file written
    [ ] Copy result → paste elsewhere works
    [ ] Cmd/Ctrl+K opens palette; typing "format" runs Format
    [ ] Errors surface a red dot in status strip with error count
[ ] QR Code:
    [ ] Enter text, click "Generate" — history shows entry
    [ ] PNG / SVG export — files written
    [ ] Copy to clipboard — pastes as image
    [ ] Switch to Template mode — add placeholder values, save combination tag, recall
    [ ] History search filters, delete individual entries
    [ ] 50+ entries cap oldest
[ ] Web Export (single):
    [ ] Paste URL → click Extract → Markdown preview shows
    [ ] Export MD / PDF / PNG — files written, PDF has multiple pages for long content
    [ ] Copy PNG to clipboard
[ ] Web Export (batch):
    [ ] Paste 3+ URLs, select folder, run batch — progress UI updates, all files written
[ ] Theme:
    [ ] Default follows system
    [ ] Toggle dark/light — `.dark` class applies, tokens update
[ ] Storage:
    [ ] Close + reopen app — history, theme, window state persist
[ ] Settings gear — open
```

## 5. CI gates (must pass before merge)

1. `pnpm install` clean (no lockfile drift)
2. `pnpm typecheck` → 0 errors
3. `pnpm lint` → 0 errors
4. `pnpm test` → all unit + property + e2e logic tests green
5. (manual) `pnpm build:desktop` succeeds (Vite output)
6. (manual) `pnpm dev:tauri` launches and §4 checklist passes

## 6. Known gaps & next steps

- **L3 — motion components**: revisit when motion@13 / a lighter animation lib lands, or set up a `happy-dom` worker with the right polyfills.
- **L4 automation**: Tauri-driver / WebDriver integration is the long-term play; not in scope for this iteration.
- **Block-level JSON diff**: todo.md item; out of scope here, tracked separately.
