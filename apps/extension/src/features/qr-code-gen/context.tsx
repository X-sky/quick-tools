import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject
} from "react"

import type { QrErrorLevel, QrSize } from "@quick-tools/qr-code-gen"
import {
  addTagToHistoryItem,
  calculateQrCapacity,
  collectHistoryTags,
  filterHistoryItems,
  removeHistoryItem,
  removeTagFromHistoryItem,
  upsertHistoryItem
} from "@quick-tools/qr-code-gen"

import type { HistoryItem } from "./types"
import {
  exportHistoryToFile,
  importHistoryFromFile,
  mergeHistory
} from "./utils"

interface QrCodeContextType {
  text: string
  setText: (text: string) => void
  isConfirmed: boolean
  history: HistoryItem[]
  allTags: string[]
  selectedTag: string | null
  filteredHistory: HistoryItem[]
  inputRef: RefObject<HTMLTextAreaElement>
  confirmInput: () => void
  editInput: () => void
  selectHistory: (item: HistoryItem) => void
  deleteHistory: (content: string) => void
  addTagToItem: (content: string, tag: string) => void
  removeTagFromItem: (content: string, tag: string) => void
  setSelectedTag: (tag: string | null) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  size: QrSize
  setSize: (size: QrSize) => void
  level: QrErrorLevel
  setLevel: (level: QrErrorLevel) => void
  currentEditingItem: HistoryItem | null
  exportHistory: () => void
  importHistory: (
    file: File
  ) => Promise<{ added: number; merged: number; error?: string }>
}

const QrCodeContext = createContext<QrCodeContextType | null>(null)

export function QrCodeProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState("")
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [size, setSize] = useState<QrSize>(256)
  const [level, setLevel] = useState<QrErrorLevel>("M")
  const [currentEditingItem, setCurrentEditingItem] =
    useState<HistoryItem | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const allTags = collectHistoryTags(history)

  const filteredHistory = filterHistoryItems(history, {
    query: searchQuery,
    tag: selectedTag
  })

  // Initialize from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("qrcode-history")
    if (saved) {
      try {
        const parsedHistory = mergeHistory([], JSON.parse(saved))
        setHistory(parsedHistory)
        if (parsedHistory.length > 0) {
          setText(parsedHistory[0].content)
          setIsConfirmed(true)
          setCurrentEditingItem(parsedHistory[0])
        }
      } catch (e) {
        console.error("Failed to parse history", e)
      }
    }
  }, [])

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("qrcode-history", JSON.stringify(history))
  }, [history])

  const confirmInput = useCallback(() => {
    if (!text.trim()) return
    if (calculateQrCapacity(text.trim(), level).isOverCapacity) return
    setText(text.trim())
    setIsConfirmed(true)

    // 从历史记录中选择后修改的，保留原有的 tags
    setHistory((prev) =>
      upsertHistoryItem(prev, text, { tags: currentEditingItem?.tags })
    )

    // 保存后清除当前编辑项引用
    setCurrentEditingItem(null)
  }, [text, level, currentEditingItem])

  const editInput = useCallback(() => {
    setIsConfirmed(false)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  const selectHistory = useCallback((item: HistoryItem) => {
    setText(item.content)
    setIsConfirmed(true)
    // 记录当前选择的项，以便后续修改时保留其tags
    setCurrentEditingItem(item)
  }, [])

  const deleteHistory = useCallback(
    (content: string) => {
      setHistory((prev) => {
        const newHistory = removeHistoryItem(prev, content)

        if (newHistory.length > 0) {
          setText(newHistory[0].content)
          setIsConfirmed(true)
          setCurrentEditingItem(newHistory[0])
        } else {
          setText("")
          setIsConfirmed(false)
          setCurrentEditingItem(null)
        }

        return newHistory
      })

      // 如果删除的是当前正在编辑的项，清除引用
      if (currentEditingItem?.content === content) {
        setCurrentEditingItem(null)
      }
    },
    [currentEditingItem]
  )

  const addTagToItem = useCallback((content: string, tag: string) => {
    setHistory((prev) => addTagToHistoryItem(prev, content, tag))
  }, [])

  const removeTagFromItem = useCallback((content: string, tag: string) => {
    setHistory((prev) => removeTagFromHistoryItem(prev, content, tag))
  }, [])

  const exportHistory = useCallback(() => {
    if (history.length === 0) return
    exportHistoryToFile(history)
  }, [history])

  const importHistory = useCallback(
    async (file: File) => {
      const result = await importHistoryFromFile(file)
      if (result.error || result.imported.length === 0) {
        return { added: 0, merged: 0, error: result.error }
      }

      const existingContents = new Set(history.map((i) => i.content))
      const merged = mergeHistory(history, result.imported)
      setHistory(merged)

      const added = result.imported.filter(
        (i) => !existingContents.has(i.content.trim())
      ).length
      const mergedCount = result.imported.length - added
      return { added, merged: mergedCount }
    },
    [history]
  )

  const value = {
    text,
    setText,
    isConfirmed,
    history,
    allTags,
    selectedTag,
    filteredHistory,
    inputRef,
    confirmInput,
    editInput,
    selectHistory,
    deleteHistory,
    addTagToItem,
    removeTagFromItem,
    setSelectedTag,
    searchQuery,
    setSearchQuery,
    size,
    setSize,
    level,
    setLevel,
    currentEditingItem,
    exportHistory,
    importHistory
  }

  return (
    <QrCodeContext.Provider value={value}>{children}</QrCodeContext.Provider>
  )
}

export function useQrCode() {
  const context = useContext(QrCodeContext)
  if (!context) {
    throw new Error("useQrCode must be used within a QrCodeProvider")
  }
  return context
}
