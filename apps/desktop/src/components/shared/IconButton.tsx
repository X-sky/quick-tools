import React from "react"
import type { Icon as PhosphorIcon } from "@phosphor-icons/react"
import { focusRingClass } from "./FocusRing"

/**
 * IconButton — 图标按钮组件。
 *
 * 接受 Phosphor icon 组件作为 prop，支持 primary（实心品牌色）和 ghost（透明）两种变体。
 * 内置按压反馈（scale）、焦点环、禁用态处理。
 *
 * 约束：
 * - primary 变体使用 flat solid brand-500 背景，禁止渐变
 * - aria-label 为必填项（无障碍）
 * - 焦点环仅在 :focus-visible 时显示
 */

export interface IconButtonProps {
  /** Phosphor icon component (e.g. Brackets, QrCode) */
  icon: PhosphorIcon | React.FC<{ size?: number | string; weight?: string }>
  /** Accessible label describing the button's action (required) */
  ariaLabel: string
  /** Click handler */
  onClick: () => void
  /** Whether the button is disabled */
  disabled?: boolean
  /** Visual variant: "primary" (solid brand fill) or "ghost" (transparent) */
  variant?: "primary" | "ghost"
  /** Hit area size in px (default: 32) */
  size?: number
}

/**
 * Icon-only button with press feedback, focus ring, and accessibility support.
 *
 * - Primary: flat solid brand-500 background, neutral-50 icon color
 * - Ghost: transparent background, neutral-700 icon color (neutral-300 in dark)
 * - Press: scale(0.97) on press (100ms), scale(1) on release (150ms)
 * - Focus: 2px brand-color outline, offset 2px, only on :focus-visible
 * - Disabled: opacity 0.3, pointer-events none, aria-disabled="true"
 */
export function IconButton({
  icon: Icon,
  ariaLabel,
  onClick,
  disabled = false,
  variant = "ghost",
  size = 32,
}: IconButtonProps) {
  const isPrimary = variant === "primary"

  const baseStyles = [
    "inline-flex items-center justify-center",
    "rounded-dt-sm",
    "select-none",
    // Release: 150ms transition back to scale(1)
    "transition-transform duration-[150ms] ease-dt-smooth",
    // Press: scale(0.97) with 100ms duration override
    "active:scale-[0.97] active:duration-dt-instant",
    focusRingClass,
  ].join(" ")

  const variantStyles = isPrimary
    ? "bg-dt-brand-500 text-dt-neutral-50 hover:bg-dt-brand-600"
    : "bg-transparent text-dt-neutral-700 dark:text-dt-neutral-300 hover:bg-dt-neutral-200/60 dark:hover:bg-dt-neutral-700/40"

  const disabledStyles = disabled
    ? "opacity-30 pointer-events-none"
    : "cursor-pointer"

  return (
    <button
      type="button"
      className={`${baseStyles} ${variantStyles} ${disabledStyles}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-disabled={disabled ? "true" : undefined}
    >
      <Icon size={16} weight="light" />
    </button>
  )
}

export default IconButton
