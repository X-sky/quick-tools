import { json } from "@codemirror/lang-json"
import { bracketMatching, foldGutter } from "@codemirror/language"
import { MergeView } from "@codemirror/merge"
import { EditorState } from "@codemirror/state"
import { oneDark } from "@codemirror/theme-one-dark"
import {
  EditorView,
  highlightActiveLine,
  lineNumbers
} from "@codemirror/view"
import { useEffect, useRef } from "react"

export interface DiffViewerProps {
  left: string
  right: string
}

export function DiffViewer({ left, right }: DiffViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mergeViewRef = useRef<MergeView | null>(null)

  // Create the MergeView on mount
  useEffect(() => {
    if (!containerRef.current) return

    const sharedExtensions = [
      lineNumbers(),
      highlightActiveLine(),
      bracketMatching(),
      foldGutter(),
      json(),
      EditorState.readOnly.of(true),
      EditorView.editable.of(false)
    ]

    // Detect system dark mode
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    if (isDark) {
      sharedExtensions.push(oneDark)
    }

    const mergeView = new MergeView({
      a: {
        doc: left,
        extensions: [...sharedExtensions]
      },
      b: {
        doc: right,
        extensions: [...sharedExtensions]
      },
      parent: containerRef.current
    })

    mergeViewRef.current = mergeView

    return () => {
      mergeView.destroy()
      mergeViewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update documents when props change
  useEffect(() => {
    const mergeView = mergeViewRef.current
    if (!mergeView) return

    const editorA = mergeView.a
    const currentA = editorA.state.doc.toString()
    if (currentA !== left) {
      editorA.dispatch({
        changes: {
          from: 0,
          to: currentA.length,
          insert: left
        }
      })
    }

    const editorB = mergeView.b
    const currentB = editorB.state.doc.toString()
    if (currentB !== right) {
      editorB.dispatch({
        changes: {
          from: 0,
          to: currentB.length,
          insert: right
        }
      })
    }
  }, [left, right])

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-auto [&_.cm-editor]:h-full [&_.cm-editor]:outline-none [&_.cm-mergeView]:h-full [&_.cm-scroller]:overflow-auto"
    />
  )
}
