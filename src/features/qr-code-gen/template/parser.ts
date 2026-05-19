// Template_Parser and Template_Pretty_Printer
// Requirements: 4.1–4.12

import type { ParseError, ParseResult, Segment } from "./types"

/**
 * Template_Pretty_Printer: formats a segment list back into a valid Template_String
 * by escaping literal `{` as `{{` and literal `}` as `}}`.
 * Requirement: 4.12
 */
export function print(segments: Segment[]): string {
  let result = ""
  for (const segment of segments) {
    if (segment.type === "placeholder") {
      result += "{" + segment.value + "}"
    } else {
      result += segment.value.replace(/\{/g, "{{").replace(/\}/g, "}}")
    }
  }
  return result
}

const VALID_NAME_REGEX = /^[A-Za-z0-9_-]+$/

/**
 * Template_Parser: parses a Template_String into segments, placeholder names, and errors.
 * Requirements: 4.1–4.11
 *
 * Scanning rules:
 * - `{{` → literal `{`
 * - `}}` → literal `}`
 * - `{name}` where name matches [A-Za-z0-9_-]+ → placeholder segment
 * - `{}` → error "占位符名称不能为空"
 * - `{invalidChars}` → error "占位符名称仅允许字母、数字、下划线和连字符"
 * - `{` with no closing `}` → error "未闭合的占位符"
 * - Other characters → accumulate into literal buffer
 *
 * Always returns partial results + all errors (never throws).
 */
export function parse(templateString: string): ParseResult {
  const segments: Segment[] = []
  const placeholderNames: string[] = []
  const errors: ParseError[] = []
  let literalBuffer = ""
  let i = 0

  function flushLiteral() {
    if (literalBuffer.length > 0) {
      segments.push({ type: "literal", value: literalBuffer })
      literalBuffer = ""
    }
  }

  while (i < templateString.length) {
    const ch = templateString[i]

    // Escaped opening brace: `{{` → literal `{`
    if (ch === "{" && i + 1 < templateString.length && templateString[i + 1] === "{") {
      literalBuffer += "{"
      i += 2
      continue
    }

    // Escaped closing brace: `}}` → literal `}`
    if (ch === "}" && i + 1 < templateString.length && templateString[i + 1] === "}") {
      literalBuffer += "}"
      i += 2
      continue
    }

    // Opening brace: start of placeholder
    if (ch === "{") {
      const openOffset = i + 1 // 1-based offset

      // Look for closing brace
      const closeIndex = templateString.indexOf("}", i + 1)

      if (closeIndex === -1) {
        // No closing brace found → unclosed placeholder error
        errors.push({ offset: openOffset, message: "未闭合的占位符" })
        // Treat the `{` and remaining text as literal
        literalBuffer += templateString.slice(i)
        i = templateString.length
        continue
      }

      const name = templateString.slice(i + 1, closeIndex)

      if (name.length === 0) {
        // Empty placeholder `{}`
        errors.push({ offset: openOffset, message: "占位符名称不能为空" })
        literalBuffer += "{}"
        i = closeIndex + 1
        continue
      }

      if (!VALID_NAME_REGEX.test(name)) {
        // Invalid characters in placeholder name
        errors.push({
          offset: openOffset,
          message: "占位符名称仅允许字母、数字、下划线和连字符"
        })
        literalBuffer += templateString.slice(i, closeIndex + 1)
        i = closeIndex + 1
        continue
      }

      // Valid placeholder
      flushLiteral()
      segments.push({ type: "placeholder", value: name })

      // Add to deduplicated names list in first-occurrence order
      if (!placeholderNames.includes(name)) {
        placeholderNames.push(name)
      }

      i = closeIndex + 1
      continue
    }

    // Regular character
    literalBuffer += ch
    i++
  }

  flushLiteral()

  return { segments, placeholderNames, errors }
}
