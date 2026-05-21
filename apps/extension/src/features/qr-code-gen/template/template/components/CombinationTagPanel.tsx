import { useState } from "react"

import { useTemplate } from "../context"

export const CombinationTagPanel = () => {
  const {
    store,
    activeTemplateId,
    saveCombinationTag,
    deleteCombinationTag,
    recallCombinationTag
  } = useTemplate()
  const [tagName, setTagName] = useState("")

  const tags = store.combinationTags
    .filter((ct) => ct.templateId === activeTemplateId)
    .sort((a, b) => b.createdAt - a.createdAt)

  if (!activeTemplateId) return null

  const handleSave = () => {
    const trimmed = tagName.trim()
    if (!trimmed) return

    const exists = tags.some((ct) => ct.name === trimmed)
    if (exists) {
      const confirmed = window.confirm("组合标签名称已存在，是否覆盖？")
      if (!confirmed) return
    }

    const result = saveCombinationTag(activeTemplateId, trimmed)
    if (result.ok === false) {
      window.alert(result.error)
      return
    }
    setTagName("")
  }

  const handleRecall = (name: string) => {
    const result = recallCombinationTag(activeTemplateId, name)
    if (result.warnings.length > 0) {
      window.alert(result.warnings.join("\n"))
    }
  }

  const handleDelete = (name: string) => {
    deleteCombinationTag(activeTemplateId, name)
  }

  return (
    <div className="plasmo-flex plasmo-flex-col plasmo-gap-3">
      <div className="plasmo-text-sm plasmo-font-medium plasmo-text-stone-700">
        组合标签
      </div>

      {/* Save form */}
      <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
        <input
          type="text"
          value={tagName}
          onChange={(e) => setTagName(e.target.value)}
          placeholder="标签名称"
          className="plasmo-flex-1 plasmo-px-3 plasmo-py-1.5 plasmo-text-sm plasmo-rounded-lg plasmo-border plasmo-border-stone-200 plasmo-bg-stone-50 plasmo-outline-none focus:plasmo-border-rose-400 focus:plasmo-bg-white plasmo-transition-all"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
          }}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!tagName.trim()}
          className="plasmo-px-3 plasmo-py-1.5 plasmo-text-sm plasmo-font-medium plasmo-rounded-lg plasmo-bg-rose-500 plasmo-text-white hover:plasmo-bg-rose-600 disabled:plasmo-bg-stone-200 disabled:plasmo-text-stone-400 disabled:plasmo-cursor-not-allowed plasmo-transition-all">
          保存组合
        </button>
      </div>

      {/* Tag list */}
      {tags.length > 0 && (
        <div className="plasmo-flex plasmo-flex-wrap plasmo-gap-2">
          {tags.map((tag) => (
            <div
              key={tag.name}
              className="plasmo-flex plasmo-items-center plasmo-gap-1 plasmo-px-2.5 plasmo-py-1 plasmo-rounded-full plasmo-bg-stone-100 plasmo-border plasmo-border-stone-200 plasmo-text-sm plasmo-transition-all hover:plasmo-border-rose-300 hover:plasmo-bg-rose-50">
              <button
                type="button"
                onClick={() => handleRecall(tag.name)}
                className="plasmo-text-stone-700 hover:plasmo-text-rose-600 plasmo-transition-colors"
                title={`恢复组合: ${tag.name}`}>
                {tag.name}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(tag.name)}
                className="plasmo-ml-1 plasmo-text-stone-400 hover:plasmo-text-red-500 plasmo-transition-colors plasmo-leading-none"
                title={`删除: ${tag.name}`}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {tags.length === 0 && (
        <div className="plasmo-text-xs plasmo-text-stone-400">
          暂无保存的组合标签
        </div>
      )}
    </div>
  )
}
