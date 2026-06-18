import { useCallback, useEffect, useMemo, useState } from "react"

import NavigationRail from "./components/shell/NavigationRail"
import type { PageId } from "./components/shell/NavigationRail"
import PageContainer, { StartupEntrance } from "./components/shell/PageContainer"
import { CommandBar } from "./components/shell/CommandBar"
import type { CommandAction } from "./components/shell/CommandBar"
import StatusStrip from "./components/shell/StatusStrip"
import { CommandPalette } from "./components/overlay/CommandPalette"
import type { PaletteCommand } from "./components/overlay/CommandPalette"
import { ToastStack } from "./components/overlay/NotificationToast"

import { useTheme } from "./hooks/useTheme"
import { useToastStack } from "./hooks/useToastStack"
import { useCommandPalette } from "./hooks/useCommandPalette"

import JsonFormatterPage from "./pages/JsonFormatterPage"
import QrCodeGenPage from "./pages/QrCodeGenPage"
import WebExportPage from "./pages/WebExportPage"

import type { PageStatus, ToastPayload } from "./types/page-shell"

const DEFAULT_STATUS: PageStatus = {
  diagnostics: { errors: 0, warnings: 0 },
  stats: { chars: 0, lines: 0, encoding: "UTF-8" }
}

const PAGE_LABELS: Record<PageId, string> = {
  "json-formatter": "JSON Formatter",
  "qr-code-gen": "QR Code Generator",
  "web-export": "Web Export"
}

/**
 * App — Root shell layout (Phase 5: full shell wiring).
 *
 * NavigationRail + CommandBar + PageContainer + StatusStrip
 * Overlay layer: ToastStack (shell-level toasts) + CommandPalette (Cmd/Ctrl+K).
 *
 * Pages report their CommandBar actions / StatusStrip data / toasts via the
 * PageShellProps callbacks.
 */
export default function App() {
  const [activePage, setActivePage] = useState<PageId>("json-formatter")

  // Theme (applies .dark class on <html> for dark mode)
  useTheme()

  // Shell-level toast stack
  const { toasts, addToast, dismissToast, pauseToast, resumeToast } =
    useToastStack()

  // Command palette (Cmd/Ctrl+K)
  const {
    isOpen: isPaletteOpen,
    close: closePalette,
    query: paletteQuery,
    setQuery: setPaletteQuery,
    filteredCommands,
    registerCommands
  } = useCommandPalette()

  // Per-page CommandBar actions and StatusStrip data, reported by the active page.
  const [commandBarActions, setCommandBarActions] = useState<CommandAction[]>([])
  const [pageStatus, setPageStatus] = useState<PageStatus>(DEFAULT_STATUS)

  const handleActionsChange = useCallback((actions: CommandAction[]) => {
    setCommandBarActions(actions)
  }, [])

  const handleStatusChange = useCallback((status: PageStatus) => {
    setPageStatus(status)
  }, [])

  const handleToast = useCallback(
    (toast: ToastPayload) => {
      addToast(toast)
    },
    [addToast]
  )

  // When switching pages, reset shell data until the new page reports its own.
  const handlePageChange = useCallback((page: PageId) => {
    setActivePage(page)
    setCommandBarActions([])
    setPageStatus(DEFAULT_STATUS)
  }, [])

  // Register command palette entries: page navigation + the active page's actions.
  useEffect(() => {
    const navCommands: PaletteCommand[] = (
      Object.keys(PAGE_LABELS) as PageId[]
    ).map((id, index) => ({
      id: `nav-${id}`,
      name: PAGE_LABELS[id],
      shortcut: `⌘${index + 1}`,
      category: "navigation",
      onExecute: () => handlePageChange(id)
    }))

    const actionCommands: PaletteCommand[] = commandBarActions.map((action) => ({
      id: action.id,
      name: action.label,
      shortcut: action.shortcut,
      category: "action",
      onExecute: action.onExecute
    }))

    registerCommands([...navCommands, ...actionCommands])
  }, [commandBarActions, handlePageChange, registerCommands])

  // Page props shared by all pages (toast + status), actions added per-page.
  const sharedPageProps = useMemo(
    () => ({
      onActionsChange: handleActionsChange,
      onStatusChange: handleStatusChange,
      onToast: handleToast
    }),
    [handleActionsChange, handleStatusChange, handleToast]
  )

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Navigation Rail (replaces old sidebar) */}
      <StartupEntrance region="nav-rail" className="h-full">
        <NavigationRail activePage={activePage} onPageChange={handlePageChange} />
      </StartupEntrance>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Command Bar */}
        <StartupEntrance region="toolbar">
          <CommandBar actions={commandBarActions} pageContext={activePage} />
        </StartupEntrance>

        {/* Page Container with animated transitions */}
        <StartupEntrance region="content" className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <PageContainer activePage={activePage}>
            {{
              "json-formatter": <JsonFormatterPage {...sharedPageProps} />,
              "qr-code-gen": <QrCodeGenPage {...sharedPageProps} />,
              "web-export": <WebExportPage {...sharedPageProps} />,
            }}
          </PageContainer>
        </StartupEntrance>

        {/* Status Strip */}
        <StatusStrip
          diagnostics={pageStatus.diagnostics}
          filePath={pageStatus.filePath}
          stats={pageStatus.stats}
        />
      </div>

      {/* ─── Overlay Layer ──────────────────────────────────────────────── */}

      {/* Shell-level toast notifications */}
      <ToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        onPause={pauseToast}
        onResume={resumeToast}
      />

      {/* Command Palette (Cmd/Ctrl+K) */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={closePalette}
        commands={filteredCommands}
        query={paletteQuery}
        onQueryChange={setPaletteQuery}
      />
    </div>
  )
}
