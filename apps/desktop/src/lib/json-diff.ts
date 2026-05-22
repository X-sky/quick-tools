/**
 * Simple line-based diff utility for JSON text comparison.
 *
 * This module provides a testable diff function that determines
 * whether two strings have differences. The visual diff rendering
 * is handled by @codemirror/merge in the DiffViewer component,
 * but this utility can be used for programmatic diff detection.
 */

export interface DiffChange {
  type: "added" | "removed" | "modified"
  lineNumber: number
  content: string
}

/**
 * Compute line-based diff between two strings.
 * Returns an array of changes. Empty array means no differences.
 */
export function computeLineDiff(a: string, b: string): DiffChange[] {
  if (a === b) return []

  const linesA = a.split("\n")
  const linesB = b.split("\n")
  const changes: DiffChange[] = []

  const maxLen = Math.max(linesA.length, linesB.length)

  for (let i = 0; i < maxLen; i++) {
    const lineA = linesA[i]
    const lineB = linesB[i]

    if (lineA === undefined && lineB !== undefined) {
      changes.push({ type: "added", lineNumber: i + 1, content: lineB })
    } else if (lineA !== undefined && lineB === undefined) {
      changes.push({ type: "removed", lineNumber: i + 1, content: lineA })
    } else if (lineA !== lineB) {
      changes.push({ type: "modified", lineNumber: i + 1, content: lineB! })
    }
  }

  return changes
}
