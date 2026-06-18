import type { CommandAction } from "../components/shell/CommandBar"
import type { StatusStripProps } from "../components/shell/StatusStrip"

/**
 * Toast payload emitted by pages to the shell-level toast system.
 */
export interface ToastPayload {
  type: "success" | "error" | "warning" | "info"
  title: string
  description?: string
}

/**
 * Status data a page reports to the shell StatusStrip.
 */
export type PageStatus = Pick<
  StatusStripProps,
  "diagnostics" | "filePath" | "stats"
>

/**
 * Props that the shell (App.tsx) passes to each page so the page can drive
 * the shared CommandBar, StatusStrip, and Toast systems.
 *
 * All props are optional so pages can be rendered standalone (e.g. in tests)
 * without the shell wiring.
 */
export interface PageShellProps {
  /** Report the page's command bar actions to the shell. */
  onActionsChange?: (actions: CommandAction[]) => void
  /** Report the page's status data (diagnostics, file path, stats) to the shell. */
  onStatusChange?: (status: PageStatus) => void
  /** Emit a toast notification through the shell-level toast system. */
  onToast?: (toast: ToastPayload) => void
}
