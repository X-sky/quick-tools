import type { FC, ReactNode } from "react"
import type { Icon } from "@phosphor-icons/react"
import { IconButton } from "../shared/IconButton"
import { Tooltip } from "../shared/Tooltip"

/**
 * CommandBar — 页面级命令工具栏。
 *
 * 布局规格：
 * - 高度：44px
 * - 底部 1px 分隔线，背景与页面一致
 * - 三组按钮：primary（flat solid brand fill）、file（ghost）、auxiliary（ghost）
 * - 组间间距：16px
 * - 按钮 hit area：32×32px，16px Phosphor icon（weight="light"），无文字标签
 * - Primary 按钮使用单一 flat brand-500 背景色 — 明确禁止渐变（from-X to-Y）
 * - Tooltip：150ms hover 延迟，显示功能描述 + 快捷键，位于按钮下方 8px，max-width 200px
 * - 禁用态：opacity 0.3，pointer-events none，aria-disabled="true"
 *
 * 约束：
 * - 禁止渐变按钮（Anti-Pattern #1）
 * - 统一使用 @phosphor-icons/react（Anti-Pattern #5）
 */

export type PageId = "json-formatter" | "qr-code-gen" | "web-export"

export interface CommandAction {
  id: string
  icon: Icon | FC<{ size?: number | string; weight?: string }>
  label: string
  shortcut?: string
  group: "primary" | "file" | "auxiliary"
  disabled?: boolean
  onExecute: () => void
}

export interface CommandBarProps {
  actions: CommandAction[]
  pageContext: PageId
}

/**
 * Groups actions by their `group` field, maintaining insertion order within each group.
 */
function groupActions(actions: CommandAction[]): {
  primary: CommandAction[]
  file: CommandAction[]
  auxiliary: CommandAction[]
} {
  const groups: { primary: CommandAction[]; file: CommandAction[]; auxiliary: CommandAction[] } = {
    primary: [],
    file: [],
    auxiliary: [],
  }

  for (const action of actions) {
    groups[action.group].push(action)
  }

  return groups
}

/**
 * Renders a group of action buttons with appropriate variant styling.
 */
function ActionGroup({
  actions,
  variant,
}: {
  actions: CommandAction[]
  variant: "primary" | "ghost"
}) {
  if (actions.length === 0) return null

  return (
    <div className="flex items-center gap-1" role="group">
      {actions.map((action) => (
        <Tooltip
          key={action.id}
          content={action.label}
          shortcut={action.shortcut}
          delay={150}
          position="bottom"
          maxWidth={200}
        >
          <IconButton
            icon={action.icon}
            ariaLabel={action.label}
            onClick={action.onExecute}
            disabled={action.disabled}
            variant={variant}
            size={32}
          />
        </Tooltip>
      ))}
    </div>
  )
}

/**
 * CommandBar renders a horizontal toolbar with grouped icon buttons.
 *
 * Keyboard Navigation Tab Order (Requirement 10.3):
 * - CommandBar is the 2nd tab stop in the shell layout
 *   (NavigationRail → CommandBar → main content → StatusStrip)
 * - Within the toolbar, Left/Right arrow keys move between buttons
 * - Enter/Space triggers the focused button's action
 *
 * Groups are rendered in order: primary → file → auxiliary, separated by 16px gaps.
 * Empty groups are not rendered (no extra spacing).
 */
export function CommandBar({ actions, pageContext }: CommandBarProps) {
  const groups = groupActions(actions)

  // Collect non-empty groups in display order
  const renderedGroups: ReactNode[] = []

  if (groups.primary.length > 0) {
    renderedGroups.push(
      <ActionGroup key="primary" actions={groups.primary} variant="primary" />
    )
  }

  if (groups.file.length > 0) {
    renderedGroups.push(
      <ActionGroup key="file" actions={groups.file} variant="ghost" />
    )
  }

  if (groups.auxiliary.length > 0) {
    renderedGroups.push(
      <ActionGroup key="auxiliary" actions={groups.auxiliary} variant="ghost" />
    )
  }

  return (
    <div
      className="flex items-center border-b border-dt-neutral-200 dark:border-dt-neutral-800 bg-dt-neutral-50 dark:bg-dt-neutral-900 px-4"
      style={{ height: "44px", gap: "16px" }}
      role="toolbar"
      aria-label={`${pageContext} command bar`}
      data-page-context={pageContext}
    >
      {renderedGroups}
    </div>
  )
}

export default CommandBar
