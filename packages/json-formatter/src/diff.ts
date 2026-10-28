export type DiffLineType = "added" | "removed" | "modified" | "unchanged"

export interface DiffLine {
  /** 1-based line number on its own side */
  lineNumber: number
  type: DiffLineType
}

export interface LineDiffResult {
  left: DiffLine[]
  right: DiffLine[]
}

// Above this many DP cells the LCS table gets too large to keep in memory,
// so we fall back to positional comparison.
const MAX_LCS_CELLS = 4_000_000

/**
 * Line-level diff of two texts. Lines are compared after trimming, so pure
 * indentation changes are not reported. Unmatched runs that sit between the
 * same pair of common lines are paired up as "modified"; the surplus on
 * either side becomes "removed" (left) or "added" (right).
 */
export function diffLines(leftText: string, rightText: string): LineDiffResult {
  const a = leftText.split("\n")
  const b = rightText.split("\n")
  const ta = a.map((l) => l.trim())
  const tb = b.map((l) => l.trim())

  const pairs =
    a.length * b.length <= MAX_LCS_CELLS
      ? lcsPairs(ta, tb)
      : positionalPairs(ta, tb)

  const left: DiffLine[] = []
  const right: DiffLine[] = []
  let i = 0
  let j = 0

  const flushGap = (endA: number, endB: number) => {
    const gapA = endA - i
    const gapB = endB - j
    const paired = Math.min(gapA, gapB)
    for (let k = 0; k < gapA; k++) {
      left.push({
        lineNumber: i + k + 1,
        type: k < paired ? "modified" : "removed"
      })
    }
    for (let k = 0; k < gapB; k++) {
      right.push({
        lineNumber: j + k + 1,
        type: k < paired ? "modified" : "added"
      })
    }
    i = endA
    j = endB
  }

  for (const [pa, pb] of pairs) {
    flushGap(pa, pb)
    left.push({ lineNumber: pa + 1, type: "unchanged" })
    right.push({ lineNumber: pb + 1, type: "unchanged" })
    i = pa + 1
    j = pb + 1
  }
  flushGap(a.length, b.length)

  return { left, right }
}

/** Returns true when the two texts differ on at least one (trimmed) line. */
export function hasLineDifferences(leftText: string, rightText: string): boolean {
  const { left, right } = diffLines(leftText, rightText)
  return (
    left.some((l) => l.type !== "unchanged") ||
    right.some((l) => l.type !== "unchanged")
  )
}

function lcsPairs(a: string[], b: string[]): Array<[number, number]> {
  const n = a.length
  const m = b.length
  const width = m + 1
  const table = new Uint32Array((n + 1) * width)
  for (let x = n - 1; x >= 0; x--) {
    for (let y = m - 1; y >= 0; y--) {
      table[x * width + y] =
        a[x] === b[y]
          ? table[(x + 1) * width + y + 1]! + 1
          : Math.max(table[(x + 1) * width + y]!, table[x * width + y + 1]!)
    }
  }
  const pairs: Array<[number, number]> = []
  let x = 0
  let y = 0
  while (x < n && y < m) {
    if (a[x] === b[y]) {
      pairs.push([x, y])
      x++
      y++
    } else if (table[(x + 1) * width + y]! >= table[x * width + y + 1]!) {
      x++
    } else {
      y++
    }
  }
  return pairs
}

function positionalPairs(a: string[], b: string[]): Array<[number, number]> {
  const pairs: Array<[number, number]> = []
  const len = Math.min(a.length, b.length)
  for (let k = 0; k < len; k++) {
    if (a[k] === b[k]) pairs.push([k, k])
  }
  return pairs
}
