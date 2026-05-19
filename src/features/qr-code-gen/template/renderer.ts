// Template_Renderer: substitutes placeholder values into a template string
// Requirements: 7.1, 7.2, 10.2

import { parse } from "./parser"

/**
 * Renders a template string by substituting placeholder tokens with values.
 * Values are inserted verbatim — no re-parsing of the substituted result.
 * For placeholder-free templates, returns the decoded escaped braces.
 */
export function render(
  templateString: string,
  values: Record<string, string>
): string {
  const { segments } = parse(templateString)
  let result = ""
  for (const segment of segments) {
    if (segment.type === "literal") {
      result += segment.value
    } else {
      result += values[segment.value] ?? ""
    }
  }
  return result
}
