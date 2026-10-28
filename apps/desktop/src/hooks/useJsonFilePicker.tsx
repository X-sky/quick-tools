import { useCallback, useRef } from "react"

import { isTauriRuntime } from "~/platform"
import { openJsonFile } from "~/platform/file-opener"

interface UseJsonFilePickerOptions {
  onText: (text: string, fileName: string | null) => void | Promise<void>
  onError: (message: string) => void
}

/**
 * Pick a JSON file and read it as text. Inside Tauri this opens the native
 * dialog; in a plain browser it falls back to a hidden <input type="file">,
 * which the caller must render via `inputElement`.
 */
export function useJsonFilePicker({ onText, onError }: UseJsonFilePickerOptions) {
  const inputRef = useRef<HTMLInputElement>(null)

  const open = useCallback(async () => {
    if (!isTauriRuntime()) {
      inputRef.current?.click()
      return
    }
    const result = await openJsonFile()
    if (result.ok) {
      await onText(result.value, null)
    } else if (result.error.category !== "cancelled") {
      onError(result.error.message)
    }
  }, [onText, onError])

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ""
      if (!file) return
      try {
        await onText(await file.text(), file.name)
      } catch {
        onError("读取文件失败")
      }
    },
    [onText, onError]
  )

  const inputElement = (
    <input
      ref={inputRef}
      type="file"
      accept=".json,application/json"
      onChange={(e) => void handleChange(e)}
      className="hidden"
      aria-hidden="true"
      tabIndex={-1}
    />
  )

  return { open, inputElement }
}
