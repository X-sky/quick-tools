import React from "react"

/**
 * EditorPanel — 编辑器面板包裹组件。
 *
 * 为编辑器内容提供统一的标签条、内边距和背景色。
 * 支持空状态占位符渲染。
 *
 * 规格：
 * - 标签条：10px 高，11px 大写字母，neutral-400 色
 * - 内容区域：16px 内边距
 * - 背景色：neutral-50（浅色）/ neutral-900（深色）— 非纯白/纯黑
 * - 空状态：居中 32px Phosphor 线性图标 + 40% 透明度引导文字
 *
 * 约束：
 * - 背景色禁止使用 #000000 或 #ffffff（Requirement 12.4）
 * - 使用设计令牌中的 neutral-50 / neutral-900
 */

export interface EditorPanelProps {
  /** Panel label displayed in the label bar (rendered uppercase) */
  label: string
  /** Panel content (editor, preview, etc.) */
  children: React.ReactNode
  /** Placeholder shown when panel is empty */
  placeholder?: { icon: React.ReactNode; text: string }
  /** Whether the panel content is empty (triggers placeholder rendering) */
  isEmpty?: boolean
}

/**
 * Editor panel wrapper with label bar, padding, background, and empty state.
 *
 * - Label bar: 10px height, 11px uppercase, neutral-400
 * - Content: 16px padding, neutral-50 bg (light) / neutral-900 bg (dark)
 * - Empty state: centered 32px icon + 40% opacity guide text
 */
export function EditorPanel({
  label,
  children,
  placeholder,
  isEmpty = false,
}: EditorPanelProps) {
  const showPlaceholder = isEmpty && placeholder

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Label bar */}
      <div
        className="flex items-center shrink-0 px-4 text-dt-2xs font-medium uppercase tracking-wider text-dt-neutral-400 select-none"
        style={{ height: "10px", fontSize: "11px", lineHeight: "10px" }}
      >
        {label}
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 p-4 bg-dt-neutral-50 dark:bg-dt-neutral-900 rounded-dt-sm overflow-auto">
        {showPlaceholder ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 select-none">
            <div className="text-dt-neutral-400 opacity-40">{placeholder.icon}</div>
            <p className="text-dt-2xs text-dt-neutral-400 opacity-40 text-center max-w-[200px]">
              {placeholder.text}
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

export default EditorPanel
