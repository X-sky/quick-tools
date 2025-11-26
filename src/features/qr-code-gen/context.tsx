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
  inputRef: RefObject<HTMLTextAreaElement>
  confirmInput: () => void
  editInput: () => void
  selectHistory: (item: HistoryItem) => void
  deleteHistory: (id: string) => void
}

const QrCodeContext = createContext<QrCodeContextType | null>(null)

export function QrCodeProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState("")
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Initialize from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("qrcode-history")
    if (saved) {
      try {
        setHistory(JSON.parse(saved))
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
      const latest = prev[0]
      if (latest && latest.content === text) return prev
      return [
        { id: generateId(), content: text, timestamp: Date.now() },
        ...prev
      ].slice(0, 50)
    })
  }, [text])

  const editInput = useCallback(() => {
    setIsConfirmed(false)
    // Focus after state update
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  const selectHistory = useCallback((item: HistoryItem) => {
    setText(item.content)
    setIsConfirmed(true)
  }, [])

  const deleteHistory = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const value = {
    text,
    setText,
    isConfirmed,
    history,
    inputRef,
    confirmInput,
    editInput,
    selectHistory,
    deleteHistory
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
