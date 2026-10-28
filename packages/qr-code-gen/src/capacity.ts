export type QrErrorLevel = "L" | "M" | "Q" | "H"

export type QrSize = 128 | 256 | 512

export const QR_SIZES: readonly QrSize[] = [128, 256, 512]

export const QR_ERROR_LEVELS: readonly { value: QrErrorLevel; label: string }[] =
  [
    { value: "L", label: "L (7%)" },
    { value: "M", label: "M (15%)" },
    { value: "Q", label: "Q (25%)" },
    { value: "H", label: "H (30%)" }
  ]

export interface QrCapacityInfo {
  /** UTF-8 byte length of the content */
  charCount: number
  maxCapacity: number
  percentage: number
  isOverCapacity: boolean
}

// Byte-mode capacity of a version 40 QR code per error-correction level.
const QR_MAX_BYTES: Record<QrErrorLevel, number> = {
  L: 2953,
  M: 2331,
  Q: 1663,
  H: 1273
}

function utf8Length(content: string): number {
  let bytes = 0
  for (const char of content) {
    const code = char.codePointAt(0)!
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4
  }
  return bytes
}

export function calculateQrCapacity(
  content: string,
  level: QrErrorLevel
): QrCapacityInfo {
  const charCount = utf8Length(content)
  const maxCapacity = QR_MAX_BYTES[level]
  const percentage = (charCount / maxCapacity) * 100
  return {
    charCount,
    maxCapacity,
    percentage,
    isOverCapacity: percentage > 100
  }
}

export function validateQrContent(
  content: string,
  level: QrErrorLevel
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
