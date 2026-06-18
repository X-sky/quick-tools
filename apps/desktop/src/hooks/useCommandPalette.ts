import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { fuzzySearch } from "../lib/fuzzy-search"

export interface PaletteCommand {
  id: string
  name: string
  shortcut?: string
  category: "navigation" | "action" | "format" | "file" | "view" | "edit"
  pageScope?: string | "global"
  onExecute: () => void
}

export interface UseCommandPaletteReturn {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  query: string
  setQuery: (q: string) => void
  filteredCommands: PaletteCommand[]
  registerCommands: (commands: PaletteCommand[]) => void
}

/**
 * Hook to manage command palette state: open/close, command registry,
 * fuzzy search filtering, and Cmd/Ctrl+K keyboard shortcut.
 */
export function useCommandPalette(): UseCommandPaletteReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [commands, setCommands] = useState<PaletteCommand[]>([])
  const commandsRef = useRef<PaletteCommand[]>(commands)

  // Keep ref in sync for stable callbacks
  useEffect(() => {
    commandsRef.current = commands
  }, [commands])

  const open = useCallback(() => {
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setQuery("")
  }, [])

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) {
        // Closing — clear query
        setQuery("")
      }
      return !prev
    })
  }, [])

  const registerCommands = useCallback((newCommands: PaletteCommand[]) => {
    setCommands(newCommands)
  }, [])

  const filteredCommands = useMemo(() => {
    return fuzzySearch(query, commands, (cmd) => cmd.name)
  }, [query, commands])

  // Listen for Cmd/Ctrl+K globally to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        toggle()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [toggle])

  return {
    isOpen,
    open,
    close,
    toggle,
    query,
    setQuery,
    filteredCommands,
    registerCommands,
  }
}
