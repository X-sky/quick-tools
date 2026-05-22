import { json } from "@codemirror/lang-json"
import { markdown } from "@codemirror/lang-markdown"
import { bracketMatching, foldGutter } from "@codemirror/language"
import { type Diagnostic, linter, setDiagnostics } from "@codemirror/lint"
import { search } from "@codemirror/search"
import { EditorState } from "@codemirror/state"
import { oneDark } from "@codemirror/theme-one-dark"
import {
  EditorView,
  highlightActiveLine,
  lineNumbers,
  placeholder as placeholderExt
} from "@codemirror/view"
import { useEffect, useRef } from "react"

export interface CodeMirrorEditorProps {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  language?: "json" | "markdown"
  theme?: "light" | "dark"
  diagnostics?: Diagnostic[]
  placeholder?: string
}

export function CodeMirrorEditor({
  value,
  onChange,
  readOnly = false,
  language = "json",
  theme = "light",
  diagnostics,
  placeholder
}: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const isExternalUpdate = useRef(false)

  // Keep onChange ref up to date without recreating the editor
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Create the editor on mount
  useEffect(() => {
    if (!containerRef.current) return

    const extensions = [
      lineNumbers(),
      highlightActiveLine(),
      bracketMatching(),
      foldGutter(),
      search(),
      linter(() => [])
    ]

    if (language === "json") {
      extensions.push(json())
    } else if (language === "markdown") {
      extensions.push(markdown())
    }

    if (theme === "dark") {
      extensions.push(oneDark)
    }

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true))
      extensions.push(EditorView.editable.of(false))
    }

    if (placeholder) {
      extensions.push(placeholderExt(placeholder))
    }

    extensions.push(
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !isExternalUpdate.current) {
          const doc = update.state.doc.toString()
          onChangeRef.current?.(doc)
        }
      })
    )

    const state = EditorState.create({
      doc: value,
      extensions
    })

    const view = new EditorView({
      state,
      parent: containerRef.current
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Only recreate editor when these structural props change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, theme, readOnly, placeholder])

  // Update value from external changes without triggering onChange
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentDoc = view.state.doc.toString()
    if (currentDoc !== value) {
      isExternalUpdate.current = true
      view.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: value
        }
      })
      isExternalUpdate.current = false
    }
  }, [value])

  // Update diagnostics when they change
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const diags = diagnostics ?? []
    view.dispatch(setDiagnostics(view.state, diags))
  }, [diagnostics])

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-auto [&_.cm-editor]:h-full [&_.cm-editor]:outline-none [&_.cm-scroller]:overflow-auto"
    />
  )
}
