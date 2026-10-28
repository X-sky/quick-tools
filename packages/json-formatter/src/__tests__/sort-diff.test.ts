import fc from "fast-check"
import { describe, expect, it } from "vitest"

import { diffLines, hasLineDifferences } from "../diff"
import { sortJsonKeys } from "../sort"

describe("sortJsonKeys", () => {
  it("sorts nested object keys and keeps array order", () => {
    const input = { b: 1, a: { d: [{ z: 1, y: 2 }, 3], c: null } }
    const sorted = sortJsonKeys(input)
    expect(JSON.stringify(sorted)).toBe(
      '{"a":{"c":null,"d":[{"y":2,"z":1},3]},"b":1}'
    )
  })

  it("is idempotent and preserves value equality", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        const once = sortJsonKeys(value)
        expect(once).toEqual(value)
        expect(JSON.stringify(sortJsonKeys(once))).toBe(JSON.stringify(once))
      })
    )
  })
})

describe("diffLines", () => {
  it("reports no changes for identical text", () => {
    const text = '{\n  "a": 1\n}'
    expect(hasLineDifferences(text, text)).toBe(false)
  })

  it("ignores indentation-only changes", () => {
    expect(hasLineDifferences('{\n  "a": 1\n}', '{\n"a": 1\n}')).toBe(false)
  })

  it("aligns an inserted line instead of shifting every line after it", () => {
    const left = '{\n  "a": 1,\n  "c": 3\n}'
    const right = '{\n  "a": 1,\n  "b": 2,\n  "c": 3\n}'
    const result = diffLines(left, right)
    expect(result.left.every((l) => l.type === "unchanged")).toBe(true)
    expect(result.right.filter((l) => l.type !== "unchanged")).toEqual([
      { lineNumber: 3, type: "added" }
    ])
  })

  it("marks a changed value as modified on both sides", () => {
    const result = diffLines('{\n  "a": 1\n}', '{\n  "a": 2\n}')
    expect(result.left[1]).toEqual({ lineNumber: 2, type: "modified" })
    expect(result.right[1]).toEqual({ lineNumber: 2, type: "modified" })
  })

  it("covers every line on each side exactly once", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("a", "b", "c", "d"), { maxLength: 30 }),
        fc.array(fc.constantFrom("a", "b", "c", "d"), { maxLength: 30 }),
        (la, lb) => {
          const result = diffLines(la.join("\n"), lb.join("\n"))
          const leftLines = la.join("\n").split("\n").length
          const rightLines = lb.join("\n").split("\n").length
          expect(result.left.map((l) => l.lineNumber)).toEqual(
            Array.from({ length: leftLines }, (_, k) => k + 1)
          )
          expect(result.right.map((l) => l.lineNumber)).toEqual(
            Array.from({ length: rightLines }, (_, k) => k + 1)
          )
        }
      )
    )
  })
})
