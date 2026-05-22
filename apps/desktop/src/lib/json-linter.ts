import type { Diagnostic } from "@codemirror/lint"
import type { EditorView } from "@codemirror/view"

/**
 * Parse JSON.parse error message to extract line and column numbers.
 * Different engines format the message differently:
 * - V8: "... at position N" or "... at line L column C"
 * - Firefox: "... at line L column C"
 * - Safari: "... at character N"
 */
function parseErrorPosition(
  message: string,
  text: string
): { line: number; column: number } | { offset: number } | null {
  // V8 (Chrome/Node): "at line X column Y of the JSON data"
  const lineColMatch = message.match(/at line (\d+) column (\d+)/)
  if (lineColMatch && lineColMatch[1] && lineColMatch[2]) {
    return {
      line: parseInt(lineColMatch[1], 10),
      column: parseInt(lineColMatch[2], 10)
    }
  }

  // V8 older format: "at position N"
  const posMatch = message.match(/at position (\d+)/)
  if (posMatch && posMatch[1]) {
    return { offset: parseInt(posMatch[1], 10) }
  }

  // Safari: "at character N"
  const charMatch = message.match(/at character (\d+)/)
  if (charMatch && charMatch[1]) {
    return { offset: parseInt(charMatch[1], 10) }
  }

  // Fallback: point to end of input
  return { offset: text.length }
}

/**
 * Convert a 1-based line and 1-based column to a character offset
 * within the CodeMirror document.
 */
function lineColToOffset(
  view: EditorView,
  line: number,
  column: number
): number {
  const doc = view.state.doc
  const lineCount = doc.lines

  // Clamp line to valid range
  const clampedLine = Math.max(1, Math.min(line, lineCount))
  const lineInfo = doc.line(clampedLine)

  // Clamp column to valid range within the line
  const clampedCol = Math.max(1, Math.min(column, lineInfo.length + 1))

  return lineInfo.from + clampedCol - 1
}

/**
 * CodeMirror lint source for JSON syntax checking.
 * Returns diagnostics with error positions when JSON parsing fails.
 */
export function jsonLintSource(view: EditorView): Diagnostic[] {
  const text = view.state.doc.toString()

  if (text.trim() === "") {
    return []
  }

  try {
    JSON.parse(text)
    return []
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const parsed = parseErrorPosition(message, text)
    const docLength = text.length

    let from: number
    let to: number

    if (parsed && "offset" in parsed) {
      from = Math.max(0, Math.min(parsed.offset, docLength))
      to = Math.max(from, Math.min(from + 1, docLength))
    } else if (parsed && "line" in parsed) {
      from = lineColToOffset(view, parsed.line, parsed.column)
      from = Math.max(0, Math.min(from, docLength))
      to = Math.max(from, Math.min(from + 1, docLength))
    } else {
      from = 0
      to = Math.min(1, docLength)
    }

    // Ensure invariant: 0 <= from <= to <= docLength
    from = Math.max(0, Math.min(from, docLength))
    to = Math.max(from, Math.min(to, docLength))

    return [
      {
        from,
        to,
        severity: "error",
        message
      }
    ]
  }
}
