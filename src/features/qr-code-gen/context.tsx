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

import type { HistoryItem } from "./types"
import { generateId } from "./utils"

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
  deleteHistory: (id: string) => void
  addTagToItem: (id: string, tag: string) => void
  removeTagFromItem: (id: string, tag: string) => void
  setSelectedTag: (tag: string | null) => void
  currentEditingItem: HistoryItem | null
}

const QrCodeContext = createContext<QrCodeContextType | null>(null)

export function QrCodeProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState("")
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [currentEditingItem, setCurrentEditingItem] =
    useState<HistoryItem | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 计算所有标签
  const allTags = Array.from(
    new Set(history.flatMap((item) => item.tags || []))
  ).sort()

  // 根据标签筛选历史记录
  const filteredHistory = selectedTag
    ? history.filter((item) => item.tags?.includes(selectedTag))
    : history

  // Initialize from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("qrcode-history")
    if (saved) {
      try {
        const parsedHistory = JSON.parse(saved)
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
    setIsConfirmed(true)

    setHistory((prev) => {
      const filtered = prev.filter((item) => item.content !== text)
      // 如果是从历史记录中选择后修改的，保留原有的tags
      const tagsToKeep = currentEditingItem?.tags || []
      return [
        {
          id: generateId(),
          content: text,
          timestamp: Date.now(),
          tags: tagsToKeep
        },
        ...filtered
      ].slice(0, 50)
    })

    // 保存后清除当前编辑项引用
    setCurrentEditingItem(null)
  }, [text, currentEditingItem])

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
    (id: string) => {
      setHistory((prev) => {
        const newHistory = prev.filter((item) => item.id !== id)

        if (newHistory.length > 0) {
          setText(newHistory[0].content)
          setIsConfirmed(true)
          // 删除后，将第一项设置为当前编辑项
          setCurrentEditingItem(newHistory[0])
        } else {
          setText("")
          setIsConfirmed(false)
          setCurrentEditingItem(null)
        }

        return newHistory
      })

      // 如果删除的是当前正在编辑的项，清除引用
      if (currentEditingItem?.id === id) {
        setCurrentEditingItem(null)
      }
    },
    [currentEditingItem]
  )

  const addTagToItem = useCallback((id: string, tag: string) => {
    setHistory((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, tags: [...new Set([...(item.tags || []), tag])] }
          : item
      )
    )
  }, [])

  const removeTagFromItem = useCallback((id: string, tag: string) => {
    setHistory((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, tags: (item.tags || []).filter((t) => t !== tag) }
          : item
      )
    )
  }, [])

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
    currentEditingItem
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
