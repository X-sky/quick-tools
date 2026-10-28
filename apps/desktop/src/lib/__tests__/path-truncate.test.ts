import { describe, it, expect } from "vitest"

import { truncatePath } from "../path-truncate"

describe("truncatePath", () => {
  it("should return empty string for empty input", () => {
    expect(truncatePath("", 50)).toBe("")
  })

  it("should return path as-is when it fits within maxLength", () => {
    const path = "/src/lib/utils.ts"
    expect(truncatePath(path, 50)).toBe(path)
  })

  it("should return path as-is for single segment (filename only)", () => {
    expect(truncatePath("readme.md", 5)).toBe("readme.md")
  })

  it("should return path as-is for 3 or fewer segments", () => {
    expect(truncatePath("/src/utils.ts", 5)).toBe("/src/utils.ts")
    expect(truncatePath("/src/lib/utils.ts", 5)).toBe("/src/lib/utils.ts")
  })

  it("should truncate middle segments for paths with more than 3 segments", () => {
    const path = "/Users/example/Documents/projects/quick-tools/src/lib/path-truncate.ts"
    const result = truncatePath(path, 30)
    expect(result).toBe("/Users/…/path-truncate.ts")
  })

  it("should preserve first directory segment and final filename", () => {
    const path = "/home/user/workspace/project/src/index.ts"
    const result = truncatePath(path, 20)
    expect(result).toContain("home")
    expect(result).toContain("index.ts")
    expect(result).toContain("…")
  })

  it("should handle Windows-style paths with backslashes", () => {
    const path = "C:\\Users\\example\\Documents\\project\\src\\main.ts"
    const result = truncatePath(path, 20)
    // "C:" is the first segment when split by backslash, no leading separator
    expect(result).toBe("C:\\…\\main.ts")
  })

  it("should handle relative paths (no leading separator)", () => {
    const path = "src/components/shell/NavigationRail/index.tsx"
    const result = truncatePath(path, 20)
    expect(result).toBe("src/…/index.tsx")
  })

  it("should handle paths with exactly 4 segments that exceed maxLength", () => {
    const path = "/very-long-directory/another-long-dir/yet-another/file.ts"
    const result = truncatePath(path, 20)
    expect(result).toBe("/very-long-directory/…/file.ts")
  })

  it("should not truncate when path has more than 3 segments but fits maxLength", () => {
    const path = "/a/b/c/d.ts"
    expect(truncatePath(path, 50)).toBe("/a/b/c/d.ts")
  })
})
