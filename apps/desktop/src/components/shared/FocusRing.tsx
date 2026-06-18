import React from "react"

/**
 * FocusRing — 键盘导航焦点指示器。
 *
 * 提供 2px 品牌色 outline，offset 2px，跟随元素自身圆角。
 * 仅在 :focus-visible 时显示（鼠标点击不触发）。
 *
 * 用法：
 * 1. 作为 CSS class 工具使用：将 `focusRingClass` 添加到可聚焦元素的 className
 * 2. 作为包裹组件使用：<FocusRing><button>...</button></FocusRing>
 */

/**
 * CSS class string for focus ring styling.
 * Apply this to any focusable element to get the standard focus ring behavior.
 */
export const focusRingClass =
  "outline-none focus-visible:outline-2 focus-visible:outline-[var(--brand-500)] focus-visible:outline-offset-2 focus-visible:rounded-[inherit]"

interface FocusRingProps {
  children: React.ReactElement
  /** Override border-radius for the focus ring (defaults to inheriting from child element) */
  borderRadius?: string
}

/**
 * FocusRing wrapper component.
 * Clones the child element and applies focus-visible outline styles.
 *
 * - 2px brand-color outline
 * - 2px offset from element
 * - Follows element's border-radius (via CSS `inherit` or explicit prop)
 * - Only visible on :focus-visible (keyboard focus, not mouse click)
 */
export function FocusRing({ children, borderRadius }: FocusRingProps) {
  const child = React.Children.only(children)

  const existingClassName = (child.props as { className?: string }).className || ""
  const focusStyles = borderRadius
    ? `outline-none focus-visible:outline-2 focus-visible:outline-[var(--brand-500)] focus-visible:outline-offset-2 focus-visible:rounded-[${borderRadius}]`
    : focusRingClass

  return React.cloneElement(child, {
    className: `${existingClassName} ${focusStyles}`.trim(),
  } as Partial<{ className: string }>)
}

export default FocusRing
