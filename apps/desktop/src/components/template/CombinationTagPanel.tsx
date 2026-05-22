import { useState } from "react"

import type {
  CombinationTag,
  RecallResult,
  Result
} from "@quick-tools/qr-code-gen"

interface CombinationTagPanelProps {
  templateId: string
  combinationTags: CombinationTag[]
  onSave: (templateId: string, name: string) => Result<void>
  onDelete: (templateId: string, name: string) => void
  onRecall: (templateId: string, name: string) => RecallResult
  disabled?: boolean
}

export function CombinationTagPanel({
  templateId,
  combinationTags,
  onSave,
  onDelete,
  onRecall,
  disabled = false
}: CombinationTagPanelProps) {
  const [tagName, setTagName] = useState("")
  const [warning, setWarning] = useState<string | null>(null)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)
  const [pendingOverwriteName, setPendingOverwriteName] = useState("")

  // Tags ordered by createdAt descending, max 50 displayed
  const sortedTags = [...combinationTags]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50)

  const handleSave = () => {
    const trimmed = tagName.trim()
    if (!trimmed) return

    // Check for existing tag with same name
    const exists = combinationTags.some((ct) => ct.name === trimmed)
    if (exists) {
      setPendingOverwriteName(trimmed)
      setShowOverwriteConfirm(true)
      return
    }

    executeSave(trimmed)
  }

  const executeSave = (name: string) => {
    const result = onSave(templateId, name)
    if (!result.ok) {
      setWarning(result.error)
      setTimeout(() => setWarning(null), 3000)
      return
    }
    setTagName("")
    setShowOverwriteConfirm(false)
    setPendingOverwriteName("")
  }

  const handleConfirmOverwrite = () => {
    executeSave(pendingOverwriteName)
  }

  const handleCancelOverwrite = () => {
    setShowOverwriteConfirm(false)
    setPendingOverwriteName("")
  }

  const handleRecall = (name: string) => {
    setWarning(null)
    const result = onRecall(templateId, name)
    if (result.warnings.length > 0) {
      setWarning(result.warnings.join("；"))
      setTimeout(() => setWarning(null), 5000)
    }
  }

  const handleDelete = (name: string) => {
    onDelete(templateId, name)
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
      <h3 className="mb-3 text-xs font-medium text-stone-500 dark:text-stone-400">
        组合标签
      </h3>

      {/* Save form */}
      <div className="mb-3 flex items-center gap-2">
        <input
          type="text"
          value={tagName}
          onChange={(e) => setTagName(e.target.value.slice(0, 30))}
          placeholder="标签名称（最多30字符）"
          maxLength={30}
          disabled={disabled}
          className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm outline-none transition-all focus:border-stone-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-200 dark:focus:border-stone-500 dark:focus:bg-stone-600"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !disabled) handleSave()
          }}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled || !tagName.trim()}
          className="shrink-0 rounded-lg bg-stone-700 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 dark:bg-stone-600 dark:hover:bg-stone-500 dark:disabled:bg-stone-700 dark:disabled:text-stone-500">
          保存组合
        </button>
      </div>

      {/* Overwrite confirmation */}
      {showOverwriteConfirm && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/30">
          <span className="text-xs text-amber-700 dark:text-amber-300">
            标签 &quot;{pendingOverwriteName}&quot; 已存在，是否覆盖？
          </span>
          <button
            type="button"
            onClick={handleConfirmOverwrite}
            className="rounded-md bg-amber-500 px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-amber-600">
            覆盖
          </button>
          <button
            type="button"
            onClick={handleCancelOverwrite}
            className="rounded-md px-2 py-0.5 text-xs text-stone-500 transition-colors hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200">
            取消
          </button>
        </div>
      )}

      {/* Warning message */}
      {warning && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          {warning}
        </div>
      )}

      {/* Tag list */}
      {sortedTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {sortedTags.map((tag) => (
            <div
              key={tag.name}
              className="group flex items-center gap-1 rounded-full border border-stone-200 bg-stone-100 px-2.5 py-1 text-sm transition-all hover:border-stone-300 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-700 dark:hover:border-stone-500 dark:hover:bg-stone-600">
              <button
                type="button"
                onClick={() => handleRecall(tag.name)}
                className="text-stone-700 transition-colors hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100"
                title={`恢复组合: ${tag.name}`}>
                {tag.name}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(tag.name)}
                className="ml-0.5 text-stone-400 transition-colors hover:text-rose-500 dark:text-stone-500 dark:hover:text-rose-400"
                title={`删除: ${tag.name}`}
                aria-label={`删除标签 ${tag.name}`}>
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-stone-400 dark:text-stone-500">
          暂无保存的组合标签
        </p>
      )}
    </div>
  )
}
