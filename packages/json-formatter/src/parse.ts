/**
 * Parse a string as JSON or JavaScript object literal.
 *
 * Attempts JSON.parse first. If that fails, converts JS object literal
 * syntax (single quotes, unquoted keys, trailing commas, comments) to
 * valid JSON and parses again.
 *
 * Uses string replacement — no eval/Function — to remain CSP-safe.
 *
 * @throws Error with Chinese message on failure
 */
export function parseJsonOrJsObject(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    try {
      let converted = text.trim()

      // 1. Remove single-line comments (// ...)
      converted = converted.replace(/\/\/.*$/gm, "")

      // 2. Remove multi-line comments (/* ... */)
      converted = converted.replace(/\/\*[\s\S]*?\*\//g, "")

      // 3. Extract all strings (single and double quoted) into placeholders
      const stringPlaceholders: string[] = []
      const stringRegex = /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g
      converted = converted.replace(stringRegex, (match) => {
        const placeholder = `__STR_${stringPlaceholders.length}__`
        stringPlaceholders.push(match)
        return placeholder
      })

      // 4. Convert single-quoted strings to double-quoted
      for (let i = 0; i < stringPlaceholders.length; i++) {
        const str = stringPlaceholders[i] as string
        if (str.startsWith("'")) {
          const content = str.slice(1, -1)
          const escaped = content
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r")
            .replace(/\t/g, "\\t")
          stringPlaceholders[i] = `"${escaped}"`
        }
      }

      // 5. Quote unquoted object keys
      converted = converted.replace(
        /([{,]\s*|^\s*|\n\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g,
        (match, prefix, key) => {
          if (key.startsWith("__STR_") && key.endsWith("__")) {
            return match
          }
          const trimmedPrefix = prefix.trim()
          if (
            trimmedPrefix === "" ||
            trimmedPrefix === "," ||
            trimmedPrefix === "{" ||
            trimmedPrefix === "\n" ||
            /^\s*$/.test(trimmedPrefix)
          ) {
            return `${prefix}"${key}":`
          }
          return match
        }
      )

      // 6. Remove trailing commas before } or ]
      converted = converted.replace(/,(\s*[}\]])/g, "$1")

      // 7. Restore string placeholders (reverse order to avoid conflicts)
      for (let i = stringPlaceholders.length - 1; i >= 0; i--) {
        const placeholder = `__STR_${i}__`
        const escapedPlaceholder = placeholder.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        )
        converted = converted.replace(
          new RegExp(escapedPlaceholder, "g"),
          stringPlaceholders[i] as string
        )
      }

      // 8. Clean up extra blank lines
      converted = converted.replace(/\n\s*\n/g, "\n").trim()

      // 9. Parse the converted JSON
      const parsed: unknown = JSON.parse(converted)

      // Validate result is an object or array
      if (typeof parsed === "object" && parsed !== null) {
        return parsed
      }
      throw new Error("解析结果不是有效的对象或数组")
    } catch (e) {
      throw new Error(
        e instanceof Error
          ? `无法解析为JSON或JS对象: ${e.message}`
          : "无法解析为JSON或JS对象"
      )
    }
  }
}
