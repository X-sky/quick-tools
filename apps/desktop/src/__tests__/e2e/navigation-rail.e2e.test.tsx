// @vitest-environment jsdom
import "~/test-utils/jsdom-polyfills"
import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, within, fireEvent, cleanup } from "@testing-library/react"
import { useState } from "react"

import NavigationRail, { type PageId } from "~/components/shell/NavigationRail"

function NavHost() {
  const [active, setActive] = useState<PageId>("json-formatter")
  return (
    <div>
      <NavigationRail activePage={active} onPageChange={setActive} />
      <span data-testid="active">{active}</span>
    </div>
  )
}

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true })
  cleanup()
})

describe("NavigationRail — DOM E2E (no motion/react)", () => {
  it("renders three page buttons + a settings button", () => {
    render(<NavHost />)
    const nav = screen.getByRole("navigation", { name: "Main navigation" })
    expect(within(nav).getAllByRole("button")).toHaveLength(4) // 3 pages + settings
  })

  it("marks the first page active on first render", () => {
    render(<NavHost />)
    const json = screen.getByRole("button", { name: "JSON Formatter" })
    expect(json).toHaveAttribute("aria-current", "page")
    expect(screen.getByTestId("active")).toHaveTextContent("json-formatter")
  })

  it("switches the active page on click", () => {
    render(<NavHost />)
    fireEvent.click(screen.getByRole("button", { name: "QR Code" }))
    expect(screen.getByTestId("active")).toHaveTextContent("qr-code-gen")
    expect(screen.getByRole("button", { name: "QR Code" })).toHaveAttribute(
      "aria-current",
      "page"
    )
  })

  it("moves focus with arrow keys (roving tabindex)", () => {
    render(<NavHost />)
    const json = screen.getByRole("button", { name: "JSON Formatter" })
    json.focus()
    fireEvent.keyDown(screen.getByRole("list"), { key: "ArrowDown" })
    expect(screen.getByRole("button", { name: "QR Code" })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole("list"), { key: "ArrowDown" })
    expect(screen.getByRole("button", { name: "Web Export" })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole("list"), { key: "ArrowDown" })
    expect(screen.getByRole("button", { name: "JSON Formatter" })).toHaveFocus()
  })

  it("activates the focused item with Enter", () => {
    render(<NavHost />)
    const web = screen.getByRole("button", { name: "Web Export" })
    web.focus()
    fireEvent.keyDown(screen.getByRole("list"), { key: "Enter" })
    expect(screen.getByTestId("active")).toHaveTextContent("web-export")
  })
})
