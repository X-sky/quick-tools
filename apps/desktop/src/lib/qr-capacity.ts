export interface QrCapacityInfo {
  charCount: number
  maxCapacity: number
  percentage: number
  isOverCapacity: boolean
}

const QR_MAX_BYTES: Record<"L" | "M" | "Q" | "H", number> = {
  L: 2953,
  M: 2331,
  Q: 1663,
  H: 1273
}

export function calculateQrCapacity(
  content: string,
  level: "L" | "M" | "Q" | "H"
): QrCapacityInfo {
  const charCount = new TextEncoder().encode(content).length
  const maxCapacity = QR_MAX_BYTES[level]
  const percentage = (charCount / maxCapacity) * 100
  const isOverCapacity = percentage > 100

  return {
    charCount,
    maxCapacity,
    percentage,
    isOverCapacity
  }
}

export function validateQrContent(
  content: string,
  level: "L" | "M" | "Q" | "H"
): { valid: boolean; error?: string } {
  const { charCount, maxCapacity, isOverCapacity } = calculateQrCapacity(
    content,
    level
  )

  if (isOverCapacity) {
    return {
      valid: false,
      error: `内容过长，超出二维码容量限制（当前 ${charCount} 字节，最大 ${maxCapacity} 字节）`
    }
  }

  return { valid: true }
}
