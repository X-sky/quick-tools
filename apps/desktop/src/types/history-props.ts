import type { HistoryItem } from "@quick-tools/qr-code-gen"

/**
 * Props passed to page components for history integration.
 * - onHistoryAdd: Record an operation to the global history drawer
 * - restoreContent: When non-null, the page should restore this content to its input
 * - onRestoreConsumed: Call after consuming restoreContent to clear the signal
 */
export interface HistoryPageProps {
  onHistoryAdd: (item: Omit<HistoryItem, "id" | "timestamp">) => void
  restoreContent: string | null
  onRestoreConsumed: () => void
}
