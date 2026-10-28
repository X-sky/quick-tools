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
  /** When provided, the left side becomes editable and reports edits here. */
  onLeftChange?: (value: string) => void
  /** When provided, the right side becomes editable and reports edits here. */
  onRightChange?: (value: string) => void
}

export function DiffViewer({
  left,
  right,
  onLeftChange,
  onRightChange
}: DiffViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mergeViewRef = useRef<MergeView | null>(null)
  const onLeftChangeRef = useRef(onLeftChange)
  const onRightChangeRef = useRef(onRightChange)
  onLeftChangeRef.current = onLeftChange
  onRightChangeRef.current = onRightChange

  // Create the MergeView on mount
  useEffect(() => {
    if (!containerRef.current) return

    const sharedExtensions = [
      lineNumbers(),
      highlightActiveLine(),
      bracketMatching(),
      foldGutter(),
      json(),
      EditorView.lineWrapping
    ]

    // Detect system dark mode
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    if (isDark) {
      sharedExtensions.push(oneDark)
    }

    const sideExtensions = (
      changeRef: React.MutableRefObject<((value: string) => void) | undefined>
    ) =>
      changeRef.current
        ? [
            EditorView.updateListener.of((update) => {
              if (update.docChanged) {
                changeRef.current?.(update.state.doc.toString())
              }
            })
          ]
        : [EditorState.readOnly.of(true), EditorView.editable.of(false)]

    const mergeView = new MergeView({
      a: {
        doc: left,
        extensions: [...sharedExtensions, ...sideExtensions(onLeftChangeRef)]
      },
      b: {
        doc: right,
        extensions: [...sharedExtensions, ...sideExtensions(onRightChangeRef)]
      },
      parent: containerRef.current
    })

    mergeViewRef.current = mergeView

    return () => {
      mergeView.destroy()
      mergeViewRef.current = null
    }
    // eslint-disable-next-line
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
