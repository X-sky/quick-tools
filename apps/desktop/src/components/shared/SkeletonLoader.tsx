import { useReducedMotion } from "../../hooks/useReducedMotion"

/**
 * SkeletonLoader — 骨架屏占位组件。
 *
 * 脉冲动画在 neutral-100 与 neutral-200 之间交替，周期 1.5s。
 * 当 prefers-reduced-motion 激活时，禁用脉冲动画，显示静态 neutral-100 背景。
 */

interface SkeletonLoaderProps {
  /** Width of the skeleton element (CSS value or number in px) */
  width?: string | number
  /** Height of the skeleton element (CSS value or number in px) */
  height?: string | number
  /** Border radius (CSS value, defaults to sm token 6px) */
  borderRadius?: string
}

export function SkeletonLoader({
  width,
  height,
  borderRadius = "6px",
}: SkeletonLoaderProps) {
  const reducedMotion = useReducedMotion()

  const resolvedWidth = typeof width === "number" ? `${width}px` : width
  const resolvedHeight = typeof height === "number" ? `${height}px` : height

  return (
    <div
      aria-hidden="true"
      className={reducedMotion ? "skeleton-loader skeleton-loader--static" : "skeleton-loader"}
      style={{
        width: resolvedWidth,
        height: resolvedHeight,
        borderRadius,
      }}
    />
  )
}

export default SkeletonLoader
