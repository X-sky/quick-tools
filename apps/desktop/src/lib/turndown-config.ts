import TurndownService from "turndown"
import { gfm } from "turndown-plugin-gfm"

export function createTurndownService(): TurndownService {
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
    strongDelimiter: "**"
  })
  service.use(gfm)
  return service
}
