export interface BatchLineResult {
  line: number
  content: string
  valid: boolean
  error?: string
}

const QR_MAX_BYTES: Record<"L" | "M" | "Q" | "H", number> = {
  L: 2953,
  M: 2331,
  Q: 1663,
  H: 1273
}

function getByteLength(str: string): number {
  return new TextEncoder().encode(str).length
}

export function parseBatchContent(
  text: string,
  level: "L" | "M" | "Q" | "H"
): BatchLineResult[] {
  const lines = text.split("\n")
  const results: BatchLineResult[] = []
  const maxBytes = QR_MAX_BYTES[level]

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim()
    if (trimmed === "") continue

    const byteLength = getByteLength(trimmed)
    const valid = byteLength <= maxBytes

    results.push({
      line: i + 1,
      content: trimmed,
      valid,
      error: valid
        ? undefined
        : `内容过长，超出二维码容量限制（当前 ${byteLength} 字节，最大 ${maxBytes} 字节）`
    })
  }

  return results
}

export function parseBatchUrls(text: string): BatchLineResult[] {
  const lines = text.split("\n")
  const results: BatchLineResult[] = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim()
    if (trimmed === "") continue

    const valid = trimmed.startsWith("http://") || trimmed.startsWith("https://")

    results.push({
      line: i + 1,
      content: trimmed,
      valid,
      error: valid
        ? undefined
        : "URL 格式无效，必须以 http:// 或 https:// 开头"
    })
  }

  return results
}
