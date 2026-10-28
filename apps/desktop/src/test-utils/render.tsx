/**
 * Render helpers for E2E tests.
 */
import { render, type RenderOptions, type RenderResult } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactElement } from "react"
import { installMockPlatform } from "./mock-platform"

export function setupRenderer(): {
  user: ReturnType<typeof userEvent.setup>
  result: (ui: ReactElement, options?: RenderOptions) => RenderResult
} {
  installMockPlatform()
  const user = userEvent.setup()
  return {
    user,
    result: (ui, options) => render(ui, options)
  }
}
